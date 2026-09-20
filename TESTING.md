# TESTING.md — Suite de pruebas de SW Mejor Niñez

Documentación viva de la suite de pruebas. Cubre las 122 operaciones de la API
(69 rutas), las reglas de negocio transversales, las migraciones, el seed y la
lógica pura del frontend.

| Capa | Runner | Pruebas | Estado |
|------|--------|---------|--------|
| Backend | `pytest` dentro de Docker | 815 (2 `xfail`) | verde |
| Frontend | `vitest` | 201 (2 `expected fail`) | verde |

Ninguna prueba toca la base de datos de desarrollo.

---

## 1. Cómo se ejecutan

### Backend

```bash
# Suite completa (desde la raíz del repo)
docker compose --profile test run --rm backend-tests

# Un archivo o un test concreto: todo lo que siga a `backend-tests` es el
# comando que se ejecuta dentro del contenedor.
docker compose --profile test run --rm backend-tests pytest tests/test_e2p_scoring.py -q
docker compose --profile test run --rm backend-tests pytest -k "caso_cerrado" -q

# Solo lo lento (migraciones y seed sobre bases scratch)
docker compose --profile test run --rm backend-tests pytest -m slow -q

# Todo menos lo lento
docker compose --profile test run --rm backend-tests pytest -m "not slow" -q
```

El servicio `backend-tests` vive bajo el perfil `test`, así que **no** arranca con
`docker compose up`. Su `command` sobrescribe el `CMD` de la imagen, de modo que
tampoco corre `entrypoint.sh`: no migra ni siembra nada por su cuenta.

### Frontend

```bash
cd frontend
pnpm test          # una pasada, para CI o verificación
pnpm test:watch    # modo interactivo
```

### Cuándo hay que reconstruir la imagen

El servicio `backend-tests` monta por bind **solo** `backend/tests/` y
`backend/pytest.ini`. Eso permite editar pruebas y configuración sin
reconstruir, pero implica:

| Cambio | ¿Reconstruir? |
|--------|---------------|
| `backend/tests/**`, `backend/pytest.ini` | No |
| `backend/app/**`, `backend/migrations/**`, `backend/seed.py` | **Sí**: `docker compose --profile test build backend-tests` |
| `backend/requirements.txt` | **Sí** (además de `docker compose build backend`) |

El código de `app/` sí viene de la imagen a propósito: así la suite valida el
mismo artefacto que se despliega.

---

## 2. Diseño del aislamiento

### Base de datos desechable

`backend/tests/conftest.py` fuerza `DB_NAME=sw_mejor_ninez_test` **antes** de
importar cualquier módulo de `app`, de modo que el engine global y `Settings`
apuntan a la base de pruebas. Una fixture de sesión (`base_de_datos`) la
recrea entera:

1. `DROP DATABASE ... WITH (FORCE)` + `CREATE DATABASE` sobre
   `sw_mejor_ninez_test`.
2. `SQLModel.metadata.create_all()` construye el esquema.
3. Repite el endurecimiento de la última migración:
   `ALTER TABLE ... ALTER COLUMN id_caso SET NOT NULL` en las 10 tablas
   agrupadas (los modelos lo declaran `Optional`, ver defecto B2).
4. Siembra solo los datos estáticos reutilizando las funciones de `seed.py`:
   `seed_admin_user`, `seed_e2p_static`, `seed_pmf_static`,
   `seed_ncfas_items`, `seed_catalogs`. **No** se llama `seed.seed()` porque
   insertaría los 3 NNA de demostración.

Al principio de `_recreate_database()` hay una guarda dura:

```python
assert settings.DB_NAME.endswith("_test")
```

Si alguien apunta la suite a otra base, falla antes de borrar nada.

### Una transacción por prueba

```python
engine = create_async_engine(settings.database_url, poolclass=NullPool)
conn = await engine.connect()
trans = await conn.begin()
session = AsyncSession(bind=conn, join_transaction_mode="create_savepoint",
                       expire_on_commit=False)
```

Los `commit()` que hacen las rutas liberan *savepoints*, no la transacción
externa. El teardown hace `rollback()`. Consecuencias prácticas:

- cada prueba parte de un mundo limpio, sin `TRUNCATE` ni orden obligatorio
  entre archivos;
- se puede correr un solo test sin preparar nada;
- `NullPool` + `dispose()` evitan conexiones colgadas que bloqueen el
  `DROP DATABASE` de la siguiente corrida.

### Cliente HTTP y autenticación

- `app.dependency_overrides[get_db]` apunta a la sesión de la prueba, así que
  el cliente y la prueba comparten transacción (y por eso las pruebas pueden
  leer con el ORM lo que la API acaba de escribir).
- El token se obtiene con un `POST /api/auth/login` real. **No** se sobrescribe
  `get_current_user`: cada request autenticado recorre el camino completo de
  JWT.
- Fixtures disponibles: `client` (anónimo), `auth_headers`, `auth_client`
  (cliente con el Bearer ya puesto), `token`, `nna`, `familiar`, `db_session`.

### Bases scratch

Las pruebas de migraciones y de seed crean y destruyen bases propias
(`sw_mejor_ninez_migtest`, `sw_mejor_ninez_seedtest`). Son desechables y se
recrean en cada corrida.

---

## 3. Inventario de la suite

### Backend (`backend/tests/`)

| Archivo | Pruebas | Qué cubre |
|---------|---------|-----------|
| `conftest.py` | — | Fixtures, aislamiento, siembra estática |
| `factories.py` | — | Factorías HTTP: `crear_nna`, `crear_e2p`, `escenario_caso_cerrado`, … |
| `test_health_cors_uploads.py` | 6 | `/health`, CORS permitido y rechazado, mount `/uploads` |
| `test_auth.py` | 16 | Login, `/me`, token expirado, firma ajena, usuario inactivo o borrado, no-enumeración de usuarios |
| `test_autorizacion.py` | 242 | 119 rutas × (sin token → 403, token inválido → 401); esquema Bearer en OpenAPI; ausencia de `DELETE` |
| `test_nna.py` | 21 | CRUD, `estado_caso` del listado, paginación, alta del caso activo, duplicados de `run`/`id_sis`, edición con caso cerrado |
| `test_casos.py` | 19 | Ciclo de vida del caso, un solo caso activo (409), cierre con fecha, reapertura, orden del listado |
| `test_caso_cerrado.py` | 49 | Matriz 409 de las 10 tablas agrupadas + notificaciones y comentarios NCFAS; contrato de las entidades NNA-level; altas que abren caso nuevo |
| `test_familiares.py` | 21 | CRUD del Familiar y de sus antecedentes penales; flag desnormalizado |
| `test_catalogos.py` | 25 | Solicitantes, establecimientos y centros de salud (contrato común parametrizado) |
| `test_ingreso.py` | 28 | Ingreso + Diagnóstico automático a 30 días, causales, derechos, documentación, `?id_caso` |
| `test_historial.py` | 26 | Red proteccional, informes, encadenamiento a 90 días / 3 meses, alertas de atrasados y próximos |
| `test_busqueda_familiar.py` | 24 | Despeje único por caso, notificaciones, resolución del caso por defecto |
| `test_consumo.py` | 14 | Historial de consumo del NNA y del adulto |
| `test_discapacidades.py` | 14 | Discapacidad del NNA y del adulto |
| `test_antecedentes.py` | 19 | Salud, escolar, familiar (agrupados) y vínculo familiar (no agrupado) |
| `test_vinculos_nna.py` | 14 | Vínculo entre NNA: orden forzado, visibilidad bidireccional, duplicados |
| `test_upload.py` | 31 | 10 extensiones permitidas, 7 prohibidas, límite de 10 MB, nombre en disco como UUID, `/uploads` público |
| `test_e2p_questions.py` | 39 | `GET /api/e2p/versions/{rango}`: 8 rangos, numeración de ítems, `versions/1` → 404 |
| `test_e2p_crud.py` | 25 | Cabecera, sellado de `id_caso`, normalización de respuestas, reescritura idempotente |
| `test_e2p_scoring.py` | 34 | Tabla de verdad de `_determinar_resultado`, clasificación por baremos, colapso de `0-3_meses`, endpoint de puntaje |
| `test_pmf.py` | 20 | Preguntas desde tabla y **fallback al JSON**, CRUD, respuestas booleanas |
| `test_ncfas.py` | 33 | 10 dimensiones, fallback al JSON, filtrado de puntajes y momentos inválidos, upsert de comentarios |
| `test_services.py` | 61 | `_add_months`, `create_nna_child`, `update_child`, `_assert_caso_abierto`, encadenamiento, servicios de clase, cascadas del ORM |
| `test_migrations.py` | 20 | Forma de la cadena, paridad modelos↔esquema, índices y FKs compuestas, reproducibilidad (2 `xfail`) |
| `test_seed.py` | 14 | Conteos exactos, idempotencia, guard `>=2 NNA`, coherencia del mensaje final |

### Frontend (`frontend/tests/`)

| Archivo | Pruebas | Qué cubre |
|---------|---------|-----------|
| `utils.test.ts` | 22 | `cn`, `calcularEdad` (incluido el corrimiento de zona horaria), `iniciales` |
| `catalogos.test.ts` | 13 | `detectTipoCausa` y los cinco catálogos |
| `auth.test.ts` | 18 | `getToken`/`getUser`/`isAuthenticated`, `login` (token + `/me`), `logout` |
| `api.test.ts` | 61 | Bearer, manejo de 401/403, y tabla dirigida por datos con la ruta y el método HTTP de 45 grupos de métodos del cliente |
| `nna-resumen-utils.test.ts` | 24 | `diasDesde` y `getAlertaResumen` (verde/rojo/naranja y su precedencia) |
| `e2p-utils.test.ts` | 37 | `ageToRangoEtario` en los 16 bordes de mes, cobertura de 0 a 204 meses, etiquetas |
| `ncfas-utils.test.ts` | 18 | `isDimensionVisible`, `makeItemKey`, `buildEmptyRespuestas` |
| `busqueda-familiar-utils.test.ts` | 8 | `formatDate`, `diasDesde`, catálogo de resultados de contacto |

Las pruebas viven en `frontend/tests/`, **fuera** de `src/app`, para no
interferir con el escaneo de rutas del App Router.

---

## 4. Convenciones

### Marcadores

- `@pytest.mark.characterization` — fija el comportamiento **actual
  observado**, que puede ser un defecto que se decidió no corregir todavía.
  No debe leerse como contrato deseado: si se cambia el comportamiento, hay
  que actualizar la prueba.
- `@pytest.mark.slow` — toca bases scratch (ciclo de migraciones o seed).
  Excluible con `-m "not slow"`.

### Defectos conocidos

Un defecto descubierto se registra con una prueba que **falla a propósito** y
que hace ruido cuando se arregle:

- Backend: `@pytest.mark.xfail(strict=True)`. Si el defecto se corrige, la
  prueba pasa y `strict` la reporta como fallo, obligando a quitar el marcador.
- Frontend: `it.fails(...)`, el equivalente en Vitest.

En ambos casos se deja el diagnóstico en el docstring o en el `reason`.

**No se modifica código de producción para hacer pasar una prueba.** Si el
arreglo es deseable, se hace como un cambio aparte y deliberado.

### Idioma

Docstrings, nombres de prueba y mensajes en español, sin acentos ni `ñ` en los
identificadores (solo en el texto).

### Estilo de las pruebas

- Se pega contra la API con `httpx.AsyncClient` siempre que exista endpoint; el
  ORM (`db_session`) se usa para preparar escenarios que la API no permite,
  para verificar el estado normalizado (`RespuestaE2P`, `PuntajeE2P`) y para
  las pruebas unitarias de servicios.
- Las factorías de `factories.py` usan la API para que el sellado de `id_caso`
  y la creación del caso activo ocurran como en producción.
- Los contratos repetidos se parametrizan (catálogos, matriz de caso cerrado,
  matriz de rutas del cliente) en vez de copiarse.

---

## 5. Defectos conocidos

### B1 — BLOQUEANTE: `alembic upgrade head` no construye una base desde cero

`0b733fafb9a6_initial.py` ejecuta `SQLModel.metadata.create_all(...)`, que crea
el esquema **actual** —incluida la tabla `Caso` y las columnas `id_caso`—.
Después `3f2e134a5977_caso_grouping.py` intenta `op.create_table('Caso', ...)`
y falla con `DuplicateTable: relation "Caso" already exists`. `downgrade base`
falla por el motivo inverso: intenta borrar restricciones
`fk_<tabla>_id_caso` que el `create_all` inicial nunca creó.

**Alcance e impacto.** La cadena sólo funciona de forma incremental, que es como
se construyó la base de desarrollo. Un despliegue nuevo (volumen `pgdata`
vacío) no puede migrar: `entrypoint.sh` corre `alembic upgrade head` con
`set -e`, así que el backend no arranca. Tampoco se puede restaurar un backup
`pg_dump` en una base limpia. Es el primer obstáculo real de la prioridad 2 del
roadmap (deployment), y afecta directamente a la prioridad 1 (backups).

**Atenuante.** PostgreSQL aplica DDL transaccional: el fallo revierte el
`upgrade` completo y la base queda vacía, sin estado a medias.

**Pruebas.** `test_migrations.py::test_upgrade_head_construye_el_esquema_desde_una_base_vacia`
(`xfail`), `::test_downgrade_base_no_deja_tablas_de_la_aplicacion` (`xfail`),
`::test_el_upgrade_desde_cero_falla_en_la_migracion_de_agrupacion` y
`::test_el_fallo_del_upgrade_no_deja_estado_parcial`.

**Arreglo probable.** Reescribir `0b733fafb9a6` con el DDL histórico real (hoy
no existe en el repo) o volver idempotentes los pasos de `3f2e134a5977` y
`bbf68836b0d8` (`IF NOT EXISTS` / comprobar antes de crear). Es un cambio de
producción y merece su propia sesión.

### B2 — Deriva entre modelos y migraciones en `id_caso`

Los 10 modelos agrupados declaran `id_caso: Optional[uuid.UUID] = None`, así
que `SQLModel.metadata` lo describe como *nullable*. El `NOT NULL` real sólo
existe porque `bbf68836b0d8` lo impone con un `ALTER TABLE`.

**Impacto.** Un `alembic revision --autogenerate` propondría *quitar* el
`NOT NULL`. Cualquier esquema construido sólo con `create_all` (como el de las
pruebas) queda más permisivo que producción, y un `NULL` ahí escaparía de la FK
compuesta contra `Caso`.

**Mitigación en la suite.** `conftest._create_schema` repite el `ALTER TABLE`.

**Pruebas.** `test_migrations.py::test_los_modelos_declaran_id_caso_como_opcional_y_la_base_lo_exige`.

### B3 — `GET /api/nna/{id}/despeje` no filtra por caso cuando no hay caso activo

La ruta sólo agrega `WHERE id_caso = ...` si encuentra un caso `En Progreso`.
Si el único caso está cerrado, la consulta queda **sin filtrar** y devuelve el
primer despeje del NNA: la vista por defecto mostraría el despeje de un caso
cerrado.

**Prueba.** `test_busqueda_familiar.py::test_sin_caso_activo_el_despeje_se_resuelve_sin_filtrar_por_caso`.

### B4 — Borrar un `NNA` por el ORM pone en `NULL` las FK de sus hijos

Ninguna relación de `NNA` declara `cascade="delete"` ni `passive_deletes`, así
que el ORM intenta "desvincular" a los hijos escribiendo `NULL` en sus columnas
FK, lo que choca con el `NOT NULL` de `id_nna` y con la FK compuesta contra
`Caso`.

**Impacto.** No hay `DELETE /api/nna/{id}` hoy, pero quien lo agregue chocará
con esto: hay que borrar los hijos explícitamente o añadir
`ON DELETE CASCADE`. También afecta a cualquier script de mantenimiento que
borre un NNA.

**Contraste.** `NCFAS` sí arrastra sus respuestas y comentarios, porque
`respuestas_list` y `comentarios` declaran `cascade="all, delete-orphan"`.

**Pruebas.** `test_services.py::test_borrar_un_nna_por_el_orm_falla_porque_nulea_las_fk_de_sus_hijos`
y `::test_borrar_un_ncfas_por_el_orm_arrastra_sus_respuestas_y_comentarios`.

### B5 — Sin manejo de errores de integridad: el duplicado da 500 con traza

No hay `exception_handler` para `IntegrityError`. Los casos alcanzables desde
la UI o desde un cliente descuidado devuelven un error sin capturar:

- `POST /api/nna` con `run` o `id_sis` repetido;
- `POST /api/nna/{id}/casos` para un NNA inexistente;
- `POST /api/nna/{id}/vinculos-nna` con el par ya vinculado, consigo mismo o
  con un NNA inexistente.

Lo esperable sería `409` con un `detail` legible. Hay un `409` manual para el
caso activo duplicado y para el despeje duplicado, así que el patrón existe:
falta aplicarlo a los errores de la base.

**Pruebas.** `test_nna.py::test_alta_con_run_duplicado_propaga_el_error_de_integridad`,
`test_casos.py::test_alta_de_caso_para_un_nna_inexistente_propaga_el_error_de_integridad`,
`test_vinculos_nna.py::test_el_mismo_par_no_se_puede_vincular_dos_veces`,
`::test_un_nna_no_se_puede_vincular_consigo_mismo`.

### B6 — Campos de dominio sin validar en el schema

- `CasoUpdate.estado` es `str`, sin `Literal`: `PUT {"estado": "Suspendido"}`
  llega a la base y falla por `CheckConstraint`.
- `E2PCreate.rango_etario` es `str`, sin `Literal`: un rango inventado falla por
  `CheckConstraint` en lugar de devolver `422`.

En ambos casos el error real es de base, no de validación, así que la respuesta
al cliente es un 500 y no un 422 explicativo.

**Pruebas.** `test_casos.py::test_estado_fuera_del_dominio_falla_en_la_base`,
`test_e2p_crud.py::test_alta_con_rango_invalido_falla_en_la_base`.

### B7 — El encadenamiento de informes no tiene guard a nivel de servicio

`update_informe` evita re-encadenar comparando `was_enviado`, pero
`chain_next_informe` en sí no comprueba nada: llamada dos veces con el mismo
informe crea dos avances `Pendiente`. El flujo HTTP está protegido; cualquier
otro consumidor del servicio no lo está.

**Prueba.** `test_services.py::test_los_informes_encadenados_no_se_duplican_en_la_base`.

### B8 — `PUT` de un ingreso no recalcula el Diagnóstico

El `InformeTribunal` de Diagnóstico se crea sólo en el `POST` del ingreso, a
partir de `fecha_ingreso_residencia`. Corregir esa fecha después no ajusta el
vencimiento del informe ya creado.

**Prueba.** `test_ingreso.py::test_actualizar_la_fecha_no_recalcula_el_informe_ya_creado`.

### B9 — Un alta tras cerrar el caso abre un caso nuevo sin avisar

`create_nna_child` busca un caso activo y, si no lo encuentra, **crea uno**. Por
eso un `POST` de salud, documentación, E2P, etc. sobre un NNA con el caso
cerrado no da 409: abre un caso nuevo en silencio. El despeje es la excepción
(exige caso activo → 409).

Es una decisión de producto, no necesariamente un error, pero conviene saberlo:
la UI puede quedar mostrando el caso cerrado mientras se escriben registros en
un caso nuevo.

**Pruebas.** `test_caso_cerrado.py::test_un_alta_tras_cerrar_el_caso_abre_uno_nuevo`,
`::test_un_despeje_tras_cerrar_el_caso_devuelve_409_por_falta_de_caso_activo`.

### B10 — `tiene_antecedentes_penales` no se recalcula

El flag del `Familiar` es desnormalizado: crear o borrar un
`AntecedentesPenales` no lo actualiza. Ya estaba anotado en `AGENTS.md`; la
prueba lo fija.

**Prueba.** `test_familiares.py::test_el_flag_tiene_antecedentes_penales_no_se_recalcula`.

### B11 — Los uploads son públicos

`/uploads/*` se monta como `StaticFiles` sin dependencia de autenticación:
cualquiera con la URL descarga el documento, sin token. El nombre es un UUID
(no enumerable), pero para documentos de NNA la decisión merece revisión
explícita.

**Prueba.** `test_upload.py::test_los_uploads_son_publicos_sin_token`.

### B12 — `seed.py` exagera en su mensaje final

Imprime `"6 notificaciones"` y crea 5 (2 + 1 + 2). Es cosmético, pero engaña a
quien lea el log del despliegue.

**Prueba.** `test_seed.py::test_el_mensaje_final_del_seed_exagera_el_numero_de_notificaciones`.

### F1 — `iniciales("   ")` devuelve cadena vacía, no el placeholder

`iniciales()` comprueba `if (!nombre)`, y `"   "` es truthy. Tras el `trim()` la
cadena queda vacía, así que el avatar del NNA se muestra en blanco en vez de
con `"—"`. El arreglo sería usar `nombre.trim()` en la guarda.

**Prueba.** `tests/utils.test.ts` → `it.fails("DEFECTO: un nombre de solo espacios deberia devolver el placeholder")`.

### F2 — `ageToRangoEtario` con fecha inválida devuelve el cuestionario de 13-17

Con una fecha de nacimiento inválida los meses calculados son `NaN`; `NaN` no
entra en ningún rango y tampoco es `< 0`, así que la función devuelve el
**último** elemento de `RANGOS_ETARIOS`, es decir `13-17_anos`. Es el peor
fallback posible: a un NNA con la fecha mal ingresada se le aplica el
instrumento de un adolescente, sin aviso. `calcularEdad` en `src/lib/utils.ts`
sí protege con `isNaN`; esta función no.

**Prueba.** `tests/e2p-utils.test.ts` → `it.fails("DEFECTO: una fecha invalida deberia devolver null...")`.

### F3 — `isAuthenticated()` da `true` con un token de cadena vacía

`getToken()` devuelve `""` (no `null`) cuando `localStorage["auth_token"]` es
una cadena vacía, y `isAuthenticated()` sólo comprueba `!== null`. En la
práctica el API devolvería 403 y `auth-provider` limpiaría la sesión, así que el
impacto es bajo; queda documentado.

**Prueba.** `tests/auth.test.ts` → `"es false con cadena vacia como token"`.

### Pendientes ya conocidos en `AGENTS.md`, ahora fijados por pruebas

- **Sin `ondelete` en E2P**: `RespuestaE2P` y `PuntajeE2P` no tienen
  `ON DELETE CASCADE` mientras PMF y NCFAS sí.
  → `test_migrations.py::test_los_instrumentos_cascada_declaran_ondelete`.
- **Sin endpoint de borrado de E2P**: no hay `DELETE` en ninguna ruta.
  → `test_autorizacion.py::test_no_existen_rutas_delete`.
- **El seed no llena instrumentos**: `RespuestaE2P`, `RespuestaPMF` y
  `RespuestaNCFAS` quedan vacías, así que `GET /api/e2p/{id}/puntaje` devuelve
  400 con los datos sembrados.
  → `test_seed.py::test_el_seed_no_crea_respuestas_de_instrumentos`.
- **Entidades NNA-level editables con el caso cerrado**: consumo, discapacidad,
  red proteccional, vínculos y antecedentes penales siguen siendo editables.
  Estaba abierto como pregunta de producto; las pruebas fijan el contrato
  actual.
  → `test_caso_cerrado.py` (sección "Contrato de las entidades NO agrupadas").

---

## 6. Verificación manual de referencia

```powershell
# 1) Reconstruir las imágenes afectadas
docker compose build backend
docker compose --profile test build backend-tests

# 2) Suite de backend
docker compose --profile test run --rm backend-tests

# 3) Suite de frontend
cd frontend; $env:CI='true'; pnpm test

# 4) El build del frontend sigue limpio
pnpm build
cd ..; docker compose build frontend

# 5) La aplicación sigue arrancando e importando
docker compose up -d backend
docker exec sw-mejor-ninez-backend python -c "import app.main"
(Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing).Content

# 6) La base de desarrollo quedó intacta
docker exec sw-mejor-ninez-db psql -U postgres -d sw_mejor_ninez -At `
  -c 'SELECT count(*) FROM "NNA"'      # 3
docker exec sw-mejor-ninez-db psql -U postgres -d sw_mejor_ninez -At `
  -c 'SELECT count(*) FROM "Caso"'     # 4
```

> Nota: al usar la API desde Windows hay que usar **`127.0.0.1`**, no
> `localhost` (ver `AGENTS.md`).

---

## 7. Mantenimiento

### Al agregar un endpoint

1. Si es un CRUD simple, una fila nueva en la tabla parametrizada del archivo
   correspondiente.
2. Añadir la ruta a `RUTAS_PROTEGIDAS` en `test_autorizacion.py`: eso cubre
   gratis el 403 sin token y el 401 con token inválido.
3. Cubrir camino feliz, `404`, `422` de validación y, si el recurso es
   agrupado, el filtro `?id_caso` y el `409` con caso cerrado.

### Al agregar una tabla agrupada por `Caso`

1. Añadir el nombre a `TABLAS_AGRUPADAS` en `conftest.py` (para el `ALTER
   TABLE ... SET NOT NULL`), en `test_migrations.py` y en
   `factories.escenario_caso_cerrado`.
2. Añadir la fila correspondiente a `ESCRITURAS_BLOQUEADAS` en
   `test_caso_cerrado.py` (clave, ruta de escritura, ruta de lectura, payload).
   La matriz de `409` se amplía sola.
3. Añadir la ruta a `RUTAS_PROTEGIDAS`.

### Al agregar un método al cliente del frontend

Añadir una fila a `CASOS` en `frontend/tests/api.test.ts` con el nombre, la
invocación, el método HTTP y la ruta esperada.

### Al arreglar un defecto de la sección 5

Quitar el marcador (`xfail(strict=True)` o `it.fails`) y convertir la prueba en
una afirmación normal del comportamiento correcto. Actualizar la entrada
correspondiente aquí.

### Higiene

- Las bases `sw_mejor_ninez_test` y `sw_mejor_ninez_seedtest` se recrean en
  cada corrida; no hace falta limpiarlas a mano. Si alguna queda bloqueada:
  `docker compose down` y volver a correr.
- Los archivos subidos por `test_upload.py` se borran en el propio test. El
  contenedor `backend-tests` no monta el volumen `uploads`, así que no
  contamina el stack de desarrollo.
