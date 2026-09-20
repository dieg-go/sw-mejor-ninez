# TESTING-CASOS.md — Descripción caso por caso

Detalle de **todas** las pruebas de la suite: qué verifica cada una y cómo lo
hace. Complementa a `TESTING.md` (que explica el *porqué* y el diseño); aquí
está el *qué* y el *cómo*.

Cifras: **818 casos de backend** (465 funciones; el resto hasta 818 son
parametrizaciones) y **201 de frontend** (142 bloques: 138 `it`, 2 `it.fails`
y 2 `it.each` que expanden a 61 casos).

Las cifras de cada tabla son las que reporta el runner, no una estimación:
`pytest --collect-only` para el backend y el reporter `verbose` para el
frontend.

---

## 0. Mecanismos compartidos

Antes de leer las tablas conviene tener presentes las piezas que casi todas las
pruebas reutilizan.

### Fixtures del backend (`backend/tests/conftest.py`)

| Fixture | Qué entrega | Cómo |
|---|---|---|
| `base_de_datos` (sesión, autouse) | Base recreada, esquema y datos estáticos | Borra y crea `sw_mejor_ninez_test`, corre `SQLModel.metadata.create_all`, repite el `ALTER TABLE ... SET NOT NULL` de `id_caso` y siembra admin + catálogos + 472 preguntas E2P, 400 baremos, 114 preguntas PMF, 70 ítems NCFAS |
| `db_session` | `AsyncSession` sobre la que se revierte todo | Abre `conn.begin()`, envuelve con `join_transaction_mode="create_savepoint"`; los `commit()` de las rutas liberan savepoints, el teardown hace `rollback()` |
| `client` | `httpx.AsyncClient` anónimo | `ASGITransport(app=app)` con `app.dependency_overrides[get_db]` apuntando a `db_session` |
| `auth_headers` | `{"Authorization": "Bearer ..."}` | `POST /api/auth/login` real con `admin@mejorninez.cl` / `admin123` y comprobación de 200 |
| `auth_client` | Cliente con el Bearer ya aplicado | Añade las cabeceras a `client` |
| `token` | El JWT en crudo | Quita el prefijo `Bearer ` de `auth_headers` |
| `nna` / `familiar` | Un NNA / Familiar ya creado | Factorías HTTP |

Dos consecuencias que se repiten en las tablas:

- **La prueba y la API comparten transacción**, por lo que se puede verificar con
  el ORM lo que la API acaba de escribir (por eso muchas pruebas piden
  `auth_client` **y** `db_session`).
- **El token es real**, así que cada request autenticado recorre `HTTPBearer` →
  `decode_access_token` → consulta del usuario en base.

### Factorías (`backend/tests/factories.py`)

Pegan contra la API, no contra la base, para que ocurran los efectos reales
(sellado de `id_caso`, creación del caso activo). Las más usadas:
`crear_nna`, `crear_familiar`, `caso_activo_id`, `crear_caso`, `crear_e2p`,
`crear_pmf`, `crear_ncfas`, `crear_antecedente_ingreso`, `crear_documentacion`,
`crear_antecedente_salud/escolar/familiar`, `crear_informe`, `crear_despeje`,
`crear_notificacion`, `crear_vinculo_familiar` y
`escenario_caso_cerrado` (que devuelve un `EscenarioCasoCerrado` con un registro
de cada tabla agrupada y el caso ya cerrado).

### Helpers del frontend (`frontend/tests/`)

| Helper | Para qué |
|---|---|
| `LocalStorageFalso` | Implementación en memoria de `localStorage`; se inyecta con `vi.stubGlobal` |
| `windowFalso` | Objeto con `location.href` observable, para comprobar redirecciones |
| `respuesta(cuerpo, ok, status)` / `ok()` / `fallo()` | Construyen objetos `Response` mínimos (`ok`, `status`, `json()`, `text()`) |
| `espia(cuerpo)` | `vi.fn()` que resuelve 200 y queda accesible para inspeccionar la llamada |
| `llamada(fetchFalso, i)` | Extrae `{url, opciones}` de la i-ésima invocación de `fetch` |
| `iso(haceDias)` | Fecha local en formato `YYYY-MM-DD` desplazada N días |

---

## 1. Backend

### 1.1 `test_health_cors_uploads.py` — 6 casos

Superficie no autenticada de la app: salud, CORS y el mount estático.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_health_no_requiere_autenticacion` | `/health` es público y devuelve `{"status":"ok"}` | `client` (sin token) y comparación exacta del cuerpo |
| `test_cors_permite_el_origen_del_frontend` | El preflight del frontend pasa y credenciales están permitidas | `OPTIONS /api/nna` con `Origin: http://localhost:3000` y `Access-Control-Request-*`; comprueba 200 y los dos headers `allow-origin`/`allow-credentials` |
| `test_cors_rechaza_un_origen_desconocido` | Un origen ajeno no recibe permiso | Preflight con `Origin: http://sitio-malicioso.example`; afirma que **no** aparece `access-control-allow-origin` |
| `test_cors_expone_el_origen_en_respuestas_simples` | También en respuestas normales, no sólo preflight | `GET /health` con `Origin` y lectura del header en la respuesta |
| `test_uploads_sirve_un_archivo_subido` | Un archivo subido se descarga con su contenido íntegro | Sube un PDF por `/api/upload/docs`, hace `GET` a la `url` devuelta y compara bytes; limpia el archivo del disco |
| `test_uploads_devuelve_404_para_archivo_inexistente` | 404 en el mount estático | `GET /uploads/no-existe-12345.pdf` sin token |

### 1.2 `test_auth.py` — 16 casos

Autenticación y sesión. Los tokens anómalos se fabrican con `jose.jwt` firmando
a mano, para ejercitar el fallo exacto.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_login_exitoso_devuelve_token_bearer` | Login correcto entrega `access_token` y `token_type` | `POST /api/auth/login` con el admin sembrado |
| `test_login_no_expone_el_hash_de_la_password` | No se filtra el hash | Inspecciona el cuerpo crudo y el JSON buscando `hashed_password`/`password` |
| `test_el_token_contiene_sub_email_y_una_expiracion_de_ocho_horas` | Contrato del JWT: `sub` UUID, `email`, y `exp` a ~8 h | Decodifica con el secreto real y compara `exp` contra *ahora* dentro de una ventana, más `assert settings.JWT_EXPIRE_MINUTES == 480` |
| `test_login_con_password_incorrecta_devuelve_401` | 401 y mensaje exacto | Login con password errónea |
| `test_login_con_email_inexistente_devuelve_401` | 401 para email inexistente | Login con email no sembrado |
| `test_login_sin_campos_requeridos_devuelve_422` | Validación del schema | Login enviando sólo `email` |
| `test_login_de_usuario_inactivo_devuelve_403` | Usuario desactivado no entra | Inserta un `Usuario` con `is_active=False` por ORM, luego login |
| `test_login_no_distingue_entre_email_y_password_incorrectos` | No se puede enumerar usuarios | Compara status **y** cuerpo de los dos fallos: deben ser idénticos |
| `test_me_devuelve_el_usuario_autenticado` | `/me` responde con el usuario y sin hash | `GET /api/auth/me` con `auth_headers` |
| `test_me_sin_header_devuelve_403` | Convención de `HTTPBearer` | `GET /api/auth/me` sin cabecera |
| `test_me_con_token_basura_devuelve_401` | Token no parseable | `Bearer no-es-un-jwt`, comprueba `detail` |
| `test_me_con_token_expirado_devuelve_401` | `exp` en el pasado | Firma un JWT con `exp = ahora - 5 min` y el secreto real |
| `test_me_con_token_firmado_con_otro_secreto_devuelve_401` | Firma inválida | Firma con `"secreto-incorrecto"` |
| `test_me_con_usuario_inexistente_devuelve_401` | Token válido de usuario borrado | `create_access_token(uuid4(), ...)` y luego `/me` |
| `test_me_con_usuario_desactivado_devuelve_401` | Baja de usuario posterior al login | Crea usuario activo, emite token, lo desactiva en base y usa el token previo |
| `test_me_con_token_sin_sub_devuelve_401` | Falta el claim `sub` | Firma un JWT sin `sub`; espera `detail == "Token inválido"` |

### 1.3 `test_autorizacion.py` — 242 casos

Cierra la puerta de **todas** las rutas frente a la falta de token.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_ruta_protegida_sin_token_devuelve_403` | 119 rutas | Parametrizado sobre `RUTAS_PROTEGIDAS` (una ruta representativa por cada router, con `POST`/`PUT`/`GET`); `client.request(metodo, ruta)` sin cabecera |
| `test_ruta_protegida_con_token_invalido_devuelve_401` | Las mismas 119 rutas | Igual, con `Authorization: Bearer invalido` |
| `test_ruta_publica_no_exige_token` | `/health` y `/api/auth/login` no piden token | Parametrizado sobre `RUTAS_PUBLICAS` (2 entradas); afirma sólo que el status **no** es 403 |
| `test_esquema_bearer_esta_declarado_en_openapi` | La API documenta el esquema | `GET /openapi.json` y busca `HTTPBearer` en `components.securitySchemes` |
| `test_no_existen_rutas_delete` | Ningún recurso expone `DELETE` | Recorre `openapi.json` y exige lista vacía de operaciones `delete` (fija el pendiente conocido) |

Las 119 rutas cubren: NNA, casos, familiares, antecedentes penales, consumo NNA
y adulto, discapacidad NNA y adulto, ingreso, causales, derechos, documentación,
historial red, despeje, notificaciones, informes, alertas, E2P (NNA y familiar),
PMF (NNA y familiar), NCFAS (NNA y familiar, ítems y comentarios), salud,
escolar, familiar, vínculos (familiar y NNA), los tres catálogos y `upload`.

### 1.4 `test_nna.py` — 21 casos

CRUD del NNA y la regla de que el listado trae el estado del caso.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_listado_empieza_vacio` | Punto de partida limpio | `GET /api/nna` → `[]` |
| `test_listado_devuelve_el_estado_del_caso_activo` | El campo calculado `estado_caso` | Crea un NNA y lee el listado |
| `test_listado_prioriza_el_caso_activo_sobre_uno_cerrado` | La subconsulta con `case(...)` elige el activo | Cierra el primer caso, crea un segundo, y comprueba que sigue diciendo `En Progreso` |
| `test_listado_devuelve_cerrado_cuando_no_hay_caso_activo` | Fallback cuando no hay activo | Cierra el único caso y lee el listado |
| `test_listado_respeta_skip_y_limit` | Paginación | Crea 3, compara `limit=2`, `skip=2` contra la lista completa por `id_nna` |
| `test_limit_invalido_devuelve_422` | Validación del query param | `?limit=no-es-un-numero` |
| `test_alta_devuelve_201_y_el_nna_creado` | Alta con todos los campos | `POST` y verificación campo a campo (incluido `id_nna` como UUID válido) |
| `test_alta_acepta_solo_campos_opcionales_vacios` | Todos los campos son opcionales | `POST {}` → 201 y `nombre is None` |
| `test_alta_crea_un_caso_activo_automaticamente` | Efecto colateral del alta | `GET /api/nna/{id}/casos` y comprobación de 1 caso `En Progreso` sin `fecha_termino` |
| `test_alta_con_fecha_invalida_devuelve_422` | Validación de fecha | `fecha_nacimiento: "no-es-fecha"` |
| `test_alta_con_run_duplicado_propaga_el_error_de_integridad` *(characterization)* | **Defecto B5**: el duplicado no da 409 sino error sin capturar | `pytest.raises(IntegrityError)` alrededor de la segunda alta |
| `test_alta_con_id_sis_duplicado_propaga_el_error_de_integridad` *(characterization)* | Ídem con `id_sis` | Igual |
| `test_consulta_devuelve_el_nna` | `GET` por id | Compara `id_nna` y `nombre` |
| `test_consulta_de_un_id_inexistente_devuelve_404` | 404 y mensaje | UUID aleatorio; `detail == "NNA no encontrado"` |
| `test_consulta_con_uuid_invalido_devuelve_422` | Validación de path param | `/api/nna/no-es-un-uuid` |
| `test_actualizacion_parcial_no_pisa_los_demas_campos` | `exclude_unset` | `PUT {"comuna"}` y verifica que `nombre`, `run`, `fecha_nacimiento` y `region` no cambiaron |
| `test_actualizacion_permite_dejar_un_campo_en_null` | Se puede borrar un campo | `PUT {"comuna": null}` |
| `test_actualizacion_vacia_no_cambia_nada` | `PUT {}` es inocuo | Recorre todos los campos del creado comparándolos |
| `test_actualizacion_de_un_id_inexistente_devuelve_404` | 404 | UUID aleatorio |
| `test_actualizacion_con_fecha_invalida_devuelve_422` | Validación | `fecha_nacimiento: "31-13-2020"` |
| `test_el_nna_sigue_siendo_editable_con_su_caso_cerrado` | El NNA no está agrupado | Cierra el caso y edita el domicilio: 200 |

### 1.5 `test_casos.py` — 19 casos

Ciclo de vida del `Caso` y la regla de un solo caso activo.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_un_nna_recien_creado_tiene_exactamente_un_caso_activo` | Invariante del alta | Un caso, `En Progreso`, `fecha_inicio` = hoy, sin término |
| `test_listado_de_casos_ordena_del_mas_reciente_al_mas_antiguo` | Orden `fecha_inicio desc` | Cierra el primero, crea otro con `fecha_inicio="2030-01-01"` y compara el orden de ids |
| `test_listado_de_casos_de_un_nna_inexistente_es_vacio` | No falla con NNA inexistente | UUID aleatorio → `[]` |
| `test_no_se_puede_crear_un_segundo_caso_activo` | 409 y mensaje | Segundo `POST` con el primero activo |
| `test_se_puede_crear_un_caso_nuevo_despues_de_cerrar_el_anterior` | Se libera el cupo | Cierra y crea; además el id es distinto |
| `test_alta_de_caso_acepta_fechas_explicitas` | Fechas en el alta | `POST` con `fecha_inicio`/`fecha_termino` |
| `test_alta_de_caso_para_un_nna_inexistente_propaga_el_error_de_integridad` *(characterization)* | **Defecto B5** | `pytest.raises(IntegrityError)` |
| `test_consulta_de_un_caso_por_su_id` | `GET /api/casos/{id}` | Verifica `id_caso` e `id_nna` |
| `test_consulta_de_un_caso_inexistente_devuelve_404` | 404 y mensaje | UUID aleatorio |
| `test_cerrar_un_caso_sella_la_fecha_de_termino_con_hoy` | Regla del `PUT {"estado": "Cerrado"}` | Cierra y compara `fecha_termino` con `date.today()` |
| `test_cerrar_un_caso_respeta_la_fecha_de_termino_explicita` | La fecha explícita manda | Cierra con `fecha_termino="2020-12-31"` |
| `test_cerrar_un_caso_libera_el_cupo_de_caso_activo` | Tras cerrar se puede crear | Cierra y `POST` → 201 |
| `test_reabrir_un_caso_cuando_ya_hay_otro_activo_devuelve_409` | Guard de reapertura | Cierra el viejo, crea el nuevo y reabre el viejo: 409; el nuevo sigue activo |
| `test_reabrir_el_mismo_caso_activo_no_es_un_conflicto` | El guard compara ids | `PUT {"estado": "En Progreso"}` sobre el ya activo → 200 |
| `test_actualizar_solo_la_fecha_de_inicio` | Update parcial | `PUT {"fecha_inicio"}` y verifica que el estado no cambió |
| `test_actualizar_un_caso_inexistente_devuelve_404` | 404 | UUID aleatorio |
| `test_estado_fuera_del_dominio_falla_en_la_base` *(characterization)* | **Defecto B6**: `estado` es `str` sin `Literal` | `PUT {"estado": "Suspendido"}` dentro de `pytest.raises(IntegrityError)` |
| `test_no_se_puede_cerrar_un_caso_dos_veces_cambiando_la_fecha` | Cerrar es idempotente | Cierra dos veces; sigue 200 con la fecha de hoy |
| `test_el_cierre_de_un_caso_no_afecta_a_los_demas_nna` | Aislamiento entre NNA | Cierra el de uno y compara el estado del otro |

### 1.6 `test_caso_cerrado.py` — 49 casos

La matriz del guard `_assert_caso_abierto`. Casi todo sale de una lista
`ESCRITURAS_BLOQUEADAS` con una fila por tabla agrupada, en el formato
`(clave, ruta PUT, ruta GET, payload)`.

Filas de la matriz (10): `e2p`, `pmf`, `ncfas`, `ingreso`, `documentacion`,
`salud`, `escolar`, `familiar`, `informe`, `despeje`.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_escritura_sobre_registro_de_caso_cerrado_devuelve_409` (×10) | Cada tabla agrupada rechaza escritura | `PUT` al registro del escenario; espera 409 y el mensaje exacto |
| `test_la_escritura_rechazada_no_altera_el_registro` (×10) | El rechazo no dejó efectos | Tras el `PUT`, hace `GET` y compara **todos** los campos contra el estado previo |
| `test_los_registros_del_caso_cerrado_siguen_siendo_legibles` (×10) | Sólo lectura, no invisible | `GET` de cada registro → 200 (el despeje se lee por `?id_caso=`, porque no tiene `GET` por id) |
| `test_el_listado_filtrado_por_el_caso_cerrado_sigue_disponible` | Los listados no se bloquean | `GET /api/nna/{id}/e2p?id_caso={cerrado}` → 1 elemento |
| `test_comentario_ncfas_bloqueado_en_caso_cerrado` | El comentario consulta el caso del padre | `PUT /api/ncfas/{id}/comentarios/A` → 409 |
| `test_listar_comentarios_de_un_caso_cerrado_esta_permitido` | La lectura no se bloquea | `GET .../comentarios` → 200 `[]` |
| `test_notificacion_bloqueada_en_caso_cerrado` | La notificación hereda el caso del despeje | `PUT /api/notificacion/{id}` → 409 |
| `test_crear_notificacion_en_un_despeje_cerrado_devuelve_409` | El `POST` también consulta el caso | Crea un familiar y hace `POST` → 409 |
| `test_listar_notificaciones_de_un_despeje_cerrado_esta_permitido` | Lectura permitida | `GET` → el elemento creado por la factoría |
| `test_el_historial_de_consumo_del_nna_sigue_editable` | Entidad NNA-level: **no** agrupada | Crea y edita consumo con el caso cerrado → 200 |
| `test_la_discapacidad_del_nna_sigue_editable` | Ídem discapacidad | Crea y edita `porcentaje_grado` → 200 |
| `test_el_historial_red_sigue_editable` | Ídem red proteccional | Edita `motivo_egreso` → 200 |
| `test_el_vinculo_familiar_sigue_editable` | Grafo estable de relaciones | Edita `parentesco` → 200 |
| `test_el_consumo_del_familiar_sigue_editable` | Nivel Familiar | Edita `en_tratamiento` → 200 |
| `test_un_alta_tras_cerrar_el_caso_abre_uno_nuevo` *(characterization)* | **Defecto B9**: `create_nna_child` auto-crea caso | Crea salud tras cerrar; afirma `id_caso` distinto, 2 casos (uno por estado) y que hay activo |
| `test_un_despeje_tras_cerrar_el_caso_devuelve_409_por_falta_de_caso_activo` *(characterization)* | El despeje es la excepción | `POST /api/nna/{id}/despeje` → 409 con "No hay un caso activo" |
| `test_un_informe_tras_cerrar_el_caso_tambien_abre_un_caso_nuevo` *(characterization)* | Misma vía por informes | Crea informe; `id_caso` distinto |
| `test_todos_los_registros_del_escenario_pertenecen_al_caso_cerrado` | **Validez del propio escenario** | Recorre el diccionario y compara cada `id_caso` |
| `test_el_escenario_deja_exactamente_un_caso_cerrado` | Idem | 1 caso, `Cerrado`, con `fecha_termino` |
| `test_un_e2p_creado_por_la_factoria_queda_en_el_caso_activo` | La factoría sella bien | Compara con `caso_activo_id` |
| `test_la_documentacion_creada_por_la_factoria_queda_en_el_caso_activo` | Idem | Idem |
| `test_el_despeje_creado_por_la_factoria_queda_en_el_caso_activo` | Idem | Idem |

### 1.7 `test_familiares.py` — 21 casos

CRUD del `Familiar` y de sus antecedentes penales.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_listado_empieza_vacio` | Estado inicial | `GET /api/familiares` → `[]` |
| `test_alta_devuelve_201_con_todos_los_campos` | Alta completa | `POST` y verificación de `id_familiar` y campos |
| `test_alta_sin_campos_crea_un_familiar_vacio` | Todo opcional | `POST {}` → 201, y `tiene_antecedentes_penales is False` por defecto |
| `test_listado_respeta_skip_y_limit` | Paginación | 3 creados; comprueba 3, 2 y 1 |
| `test_consulta_por_id` | `GET` | Igualdad del JSON completo |
| `test_consulta_inexistente_devuelve_404` | 404 y mensaje | UUID aleatorio |
| `test_consulta_con_uuid_invalido_devuelve_422` | Validación | `/api/familiares/abc` |
| `test_actualizacion_parcial` | `exclude_unset` | `PUT {"numero_telefono"}`; `nombre` y `direccion` intactos |
| `test_actualizacion_permite_marcar_antecedentes_penales` | El flag es editable | `PUT {"tiene_antecedentes_penales": true}` |
| `test_actualizacion_inexistente_devuelve_404` | 404 | UUID aleatorio |
| `test_actualizacion_con_fecha_invalida_devuelve_422` | Validación | `fecha_nacimiento: "hoy"` |
| `test_antecedentes_penales_empiezan_vacios` | Estado inicial del hijo | `GET .../antecedentes-penales` → `[]` |
| `test_alta_de_antecedente_penal` | Alta del detalle | `POST` con descripción y URL; verifica `id_familiar` |
| `test_alta_de_antecedente_penal_sin_descripcion` | Descripción opcional | `POST {}` → 201, `descripcion is None` |
| `test_listado_de_antecedentes_separa_por_familiar` | Filtro por padre | Uno con detalle, otro sin: 1 vs 0 |
| `test_consulta_de_un_antecedente_penal` | `GET /api/antecedente-penal/{id}` | Verifica descripción |
| `test_consulta_de_un_antecedente_penal_inexistente_devuelve_404` | 404 y mensaje | UUID aleatorio |
| `test_actualizacion_de_un_antecedente_penal` | `PUT` del detalle | Cambia la descripción |
| `test_actualizacion_de_un_antecedente_penal_inexistente_devuelve_404` | 404 | UUID aleatorio |
| `test_el_flag_tiene_antecedentes_penales_no_se_recalcula` *(characterization)* | **Defecto B10** | Crea familiar con `False`, agrega un antecedente y comprueba que **sigue** `False` |
| `test_antecedentes_penales_editable_con_el_caso_cerrado` | Nivel Familiar, no agrupado | Cierra el caso de un NNA y edita el detalle → 200 |

### 1.8 `test_catalogos.py` — 25 casos

Los tres catálogos comparten contrato, así que se prueban con una lista
`CATALOGOS` de tres `Catalogo` (nombre, ruta, campo id, payload, payload de
actualización, mensaje 404) y `@pytest.mark.parametrize`.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_el_seed_deja_datos_en_el_catalogo` (×3) | El seed pobló cada catálogo | `GET` y exige `len >= 3` |
| `test_los_solicitantes_sembrados_cubren_las_categorias_del_dominio` | Categorías esperadas | Extrae el conjunto de `categoria` y comprueba que contiene `Tribunal, PIB, OPD, PRM, PRK` |
| `test_alta_devuelve_201_y_el_registro` (×3) | Alta | `POST` y verificación de todos los campos del payload |
| `test_alta_aparece_en_el_listado` (×3) | Persistencia | Busca el id creado en el listado |
| `test_consulta_por_id` (×3) | `GET` | Compara el registro creado |
| `test_consulta_inexistente_devuelve_404_con_su_mensaje` (×3) | Mensaje propio de cada catálogo | UUID aleatorio y comparación de `detail` |
| `test_actualizacion_parcial` (×3) | `exclude_unset` | `PUT` con el payload de actualización y verifica que los demás campos se conservan |
| `test_actualizacion_inexistente_devuelve_404` (×3) | 404 | UUID aleatorio |
| `test_paginacion` (×3) | `skip`/`limit` | Compara `limit=2` y `skip=1` contra el total |

### 1.9 `test_ingreso.py` — 28 casos

Ingreso, sus causales/derechos, documentación y el Diagnóstico automático.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_listado_empieza_vacio` | Estado inicial | `GET .../antecedentes-ingreso` → `[]` |
| `test_alta_con_todos_los_campos` | Alta completa | `POST` con solicitante del catálogo sembrado y todos los campos judiciales |
| `test_alta_sin_solicitante_devuelve_422` | `id_solicitante_ingreso` es requerido | `POST` sin él |
| `test_alta_sin_fecha_de_ingreso_no_crea_informe` | La condición del efecto | Alta sin `fecha_ingreso_residencia`; informes → `[]` |
| `test_alta_con_fecha_de_ingreso_crea_el_diagnostico_a_30_dias` | **Regla de negocio**: Diagnóstico a +30 días | Alta con fecha fija; lee informes y compara `fecha_vencimiento` y `id_caso` |
| `test_repetir_el_alta_no_duplica_el_diagnostico_pendiente` | Idempotencia por caso | Tres altas con la misma fecha; informes → 1 |
| `test_el_ingreso_queda_sellado_con_el_caso_activo` | Sellado | Compara con `caso_activo_id` |
| `test_listado_filtra_por_caso` | `?id_caso` | Cierra el caso, crea otro, un ingreso en cada uno; compara sin filtro (2) y con cada filtro (1) |
| `test_consulta_por_id` | `GET` | Igualdad del JSON |
| `test_consulta_inexistente_devuelve_404` | 404 y mensaje | UUID aleatorio |
| `test_actualizacion_parcial` | `exclude_unset` | Cambia `materia`; `codigo_rit` intacto |
| `test_actualizacion_inexistente_devuelve_404` | 404 | UUID aleatorio |
| `test_actualizar_la_fecha_no_recalcula_el_informe_ya_creado` *(characterization)* | **Defecto B8** | Captura informes, cambia `fecha_ingreso_residencia` y compara: idénticos |
| `test_causales_empiezan_vacias` | Estado inicial | `GET .../causales` → `[]` |
| `test_alta_de_causal` | Alta | `POST` con causal del catálogo; verifica `id_antecedente_ingreso` |
| `test_la_causal_no_tiene_id_caso` | Es hija del ingreso, no del NNA | `assert "id_caso" not in creado` |
| `test_varias_causales_por_ingreso` | Uno a muchos | Tres `POST` y listado de 3 |
| `test_consulta_y_actualizacion_de_causal` | `GET` + `PUT` | Compara JSON completo y luego cambia `estado` |
| `test_causal_inexistente_devuelve_404` | 404 en `GET` y `PUT` | Dos UUID aleatorios |
| `test_el_mensaje_de_causal_inexistente` | Mensaje exacto | `detail == "Causal no encontrada"` |
| `test_derechos_empiezan_vacios` | Estado inicial | `GET .../derechos-vulnerados` → `[]` |
| `test_alta_y_edicion_de_derecho` | Alta + `PUT` | Crea `Vulnerado` y pasa a `Restituido` |
| `test_derecho_inexistente_devuelve_404` | 404 en `GET` y `PUT` | Dos UUID aleatorios |
| `test_documentacion_empieza_vacia` | Estado inicial | `GET .../documentacion-ingreso` → `[]` |
| `test_alta_de_documentacion` | Alta | `POST` con `estado_recepcion` y fecha |
| `test_documentacion_filtra_por_caso` | `?id_caso` | Un doc por caso; compara sin filtro (2) y con filtro (1) |
| `test_consulta_y_actualizacion_de_documentacion` | `GET` + `PUT` | Compara JSON y cambia `estado_recepcion`/`observacion` |
| `test_documentacion_inexistente_devuelve_404` | 404 y mensaje | `GET` y `PUT` con UUID aleatorio |

### 1.10 `test_historial.py` — 26 casos

Red proteccional, informes y —lo más importante— el encadenamiento.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_historial_red_empieza_vacio` | Estado inicial | `GET .../historial-red` → `[]` |
| `test_alta_de_historial_red` | Alta | `POST` con programa, ingreso y egreso nulo |
| `test_historial_red_no_tiene_id_caso` | Nivel NNA | `assert "id_caso" not in creado` |
| `test_consulta_y_actualizacion_de_historial_red` | `GET` + `PUT` | Compara JSON y luego sella `fecha_egreso`/`motivo_egreso` |
| `test_historial_red_inexistente_devuelve_404` | 404 y mensaje | `GET` y `PUT` |
| `test_informes_empiezan_vacios` | Estado inicial | `GET .../informes-tribunal` → `[]` |
| `test_alta_de_informe` | Alta + sellado | `POST` y verifica `id_caso` |
| `test_alta_de_informe_con_tipo_invalido_devuelve_422` | Enum de `tipo_informe` | `"Otro"` → 422 |
| `test_consulta_y_actualizacion_simple_de_informe` | `GET` + `PUT` sin transición | Cambia `url_documento`; el estado sigue `Pendiente` |
| `test_informe_inexistente_devuelve_404` | 404 y mensaje | UUID aleatorio |
| `test_marcar_diagnostico_como_enviado_encadena_un_avance_a_90_dias` | **Regla**: Diagnóstico→Avance a ingreso+90 | Crea NNA con ingreso de fecha fija, busca el Diagnóstico auto-creado, lo marca `Enviado` y verifica el nuevo Avance |
| `test_marcar_avance_como_enviado_encadena_tres_meses_despues` | **Regla**: Avance→Avance a vencimiento+3 meses | Avance con `fecha_vencimiento="2024-01-31"` → el siguiente vence `2024-04-30` (ejercita el ajuste de fin de mes) |
| `test_un_informe_ya_enviado_no_encadena_de_nuevo` | Guard `was_enviado` | Envía, edita y reenvía; sigue habiendo 2 |
| `test_un_avance_pendiente_no_encadena_al_editarlo` | Sólo transiciona a `Enviado` | Edita `fecha_vencimiento` de un pendiente; sigue 1 |
| `test_un_diagnostico_sin_fecha_de_ingreso_no_encadena` | Falta el insumo | Marca `Enviado` un Diagnóstico sin ingreso; sigue 1 con estado `Enviado` |
| `test_un_informe_sin_tipo_no_encadena` | Tipo nulo | 200 y sigue 1 |
| `test_el_encadenado_queda_en_el_mismo_caso` | Coherencia de caso | Tras encadenar, `{id_caso}` de todos los informes == caso activo |
| `test_listado_de_informes_filtra_por_caso` | `?id_caso` | Un informe por caso; sin filtro 2, con filtro 1 |
| `test_sin_informes_no_hay_alertas` | Endpoints globales vacíos | Ambos endpoints → `[]` |
| `test_atrasados_solo_lista_pendientes_vencidos` | Filtro estado + fecha | Un vencido, uno futuro y uno vencido pero `Enviado`; sólo el primero aparece, con `dias_restantes == -5` y `nombre_nna` |
| `test_atrasados_ordena_por_vencimiento_mas_antiguo` | Orden ascendente | Dos vencidos; `[-20, -2]` |
| `test_proximos_a_vencer_usa_la_ventana_de_diez_dias_por_defecto` | Ventana por defecto | Vencimientos a +9, +11 y −1; sólo +9, con `dias_restantes == 9` |
| `test_proximos_a_vencer_respeta_el_parametro_dias` | `?dias` | Con `dias=10` → `[]`; con `dias=31` → 1 |
| `test_proximos_a_vencer_incluye_el_vencimiento_de_hoy` | Borde `>=` | Vence hoy; `dias_restantes == 0` |
| `test_proximos_a_vencer_valida_el_rango_de_dias` | `Query(ge=1, le=365)` | 0 y 366 → 422; 1 y 365 → 200 |
| `test_las_alertas_de_un_caso_cerrado_siguen_apareciendo` | Las alertas son globales | Vence un informe, cierra el caso y comprueba que sigue en atrasados |

### 1.11 `test_busqueda_familiar.py` — 24 casos

Despeje y notificaciones.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_consulta_sin_despeje_devuelve_404` | 404 y mensaje | NNA recién creado |
| `test_alta_y_consulta_del_despeje` | Alta + lectura por defecto | Compara JSON completo y el `id_caso` |
| `test_consulta_con_id_caso_explicito` | Parámetro `?id_caso` | Compara el `id_caso` devuelto |
| `test_consulta_con_un_id_caso_sin_despeje_devuelve_404` | Filtro efectivo | UUID de caso aleatorio |
| `test_consulta_de_un_nna_inexistente_devuelve_404` | 404 | UUID aleatorio |
| `test_sin_caso_activo_el_despeje_se_resuelve_sin_filtrar_por_caso` *(characterization)* | **Defecto B3** | Cierra el caso y hace `GET` sin `id_caso`: 200 y devuelve el despeje del caso **cerrado** |
| `test_un_despeje_cerrado_se_encuentra_por_su_id_caso` | El filtro explícito sí funciona | `GET ?id_caso={cerrado}` → 200 |
| `test_alta_sin_caso_activo_devuelve_409` | El despeje exige caso activo | Cierra el caso y hace `POST` → 409 con mensaje |
| `test_no_se_puede_crear_un_segundo_despeje_en_el_mismo_caso` | Unique `(id_nna, id_caso)` con guard | Segundo `POST` → 409 "Ya existe un despeje para este caso" |
| `test_se_puede_crear_un_despeje_en_un_caso_nuevo` | Un despeje por caso | Cierra, crea caso, crea despeje: distintos ids de despeje y de caso |
| `test_alta_de_despeje_con_todos_los_campos` | Alta completa | `POST` con fechas, estado y URL |
| `test_actualizacion_del_despeje` | `PUT` parcial | Cambia estado y URL; la fecha de solicitud se conserva |
| `test_actualizacion_de_un_despeje_inexistente_devuelve_404` | 404 y mensaje | UUID aleatorio |
| `test_notificaciones_empiezan_vacias` | Estado inicial | `GET .../notificaciones` → `[]` |
| `test_alta_de_notificacion` | Alta | `POST` con familiar; verifica el código de seguimiento y que la 2ª carta es nula |
| `test_alta_de_notificacion_con_todos_los_campos` | Alta completa | Las dos cartas, entregas, resultado y observación |
| `test_alta_de_notificacion_sin_familiar_devuelve_422` | `id_familiar` requerido | `POST {}` |
| `test_alta_de_notificacion_en_un_despeje_inexistente_devuelve_404` | 404 y mensaje | UUID de despeje aleatorio |
| `test_varias_notificaciones_para_el_mismo_despeje` | Uno a muchos | Tres familiares distintos → 3 |
| `test_consulta_de_una_notificacion` | `GET` por id | Igualdad del JSON |
| `test_notificacion_inexistente_devuelve_404` | 404 y mensaje | UUID aleatorio |
| `test_actualizacion_de_una_notificacion` | `PUT` parcial | Manda la 2ª carta y el resultado; la 1ª se conserva |
| `test_actualizacion_de_una_notificacion_inexistente_devuelve_404` | 404 y mensaje | UUID aleatorio |
| `test_actualizacion_de_notificacion_cuyo_despeje_fue_borrado_no_aplica` | El 404 del despeje es inalcanzable | Edita correctamente y documenta por qué la rama no se puede ejercitar (no hay `DELETE`) |

### 1.12 `test_consumo.py` — 14 casos

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_consumo_nna_empieza_vacio` | Estado inicial | `GET .../historial-consumo` → `[]` |
| `test_alta_de_consumo_nna` | Alta completa | `POST` con sustancia, gestacional, estado, fechas y tratamiento |
| `test_alta_minima_de_consumo_nna` | Todo opcional | `POST {}` → 201 con `en_tratamiento is False` |
| `test_los_registros_de_consumo_se_separan_por_nna` | Filtro por padre | Uno con registro, otro sin: 1 vs 0 |
| `test_consulta_de_un_consumo_nna` | `GET` por id | Igualdad del JSON |
| `test_consumo_nna_inexistente_devuelve_404` | 404 y mensaje en `GET` y `PUT` | Dos UUID aleatorios |
| `test_actualizacion_de_consumo_nna` | `PUT` parcial | Cambia estado y tratamiento; la sustancia se conserva |
| `test_varios_consumos_por_nna` | Uno a muchos | Tres sustancias → conjunto de 3 |
| `test_consumo_adulto_empieza_vacio` | Estado inicial | `GET /api/familiares/{id}/historial-consumo` → `[]` |
| `test_alta_de_consumo_adulto` | Alta | `POST`; además comprueba que **no** aparece `consumo_indirecto_gestacional` (campo sólo del NNA) |
| `test_los_registros_de_consumo_adulto_se_separan_por_familiar` | Filtro por padre | 1 vs 0 |
| `test_consulta_y_actualizacion_de_consumo_adulto` | `GET` + `PUT` | Compara JSON y activa `en_tratamiento` |
| `test_consumo_adulto_inexistente_devuelve_404` | 404 y mensaje | `GET` y `PUT` |
| `test_el_consumo_del_nna_no_es_accesible_por_la_ruta_del_adulto` | Tablas separadas | Usa el id de un consumo NNA contra `/api/historial-consumo-adulto/{id}` → 404 |

### 1.13 `test_discapacidades.py` — 14 casos

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_discapacidades_nna_empiezan_vacias` | Estado inicial | `GET .../discapacidades` → `[]` |
| `test_alta_de_discapacidad_nna` | Alta | `POST` con tipo, porcentaje y observación |
| `test_alta_minima_de_discapacidad_nna` | Todo opcional | `POST {}` → 201 con `porcentaje_grado is None` |
| `test_separacion_de_discapacidades_por_nna` | Filtro por padre | 1 vs 0 |
| `test_consulta_de_una_discapacidad_nna` | `GET` | Igualdad del JSON |
| `test_discapacidad_nna_inexistente_devuelve_404` | 404 y mensaje en `GET` y `PUT` | Dos UUID aleatorios |
| `test_actualizacion_de_una_discapacidad_nna` | `PUT` parcial | Cambia porcentaje y observación; el tipo se conserva |
| `test_porcentaje_no_numerico_devuelve_422` | Tipo del campo | `"mucho"` → 422 |
| `test_discapacidades_adulto_empiezan_vacias` | Estado inicial | `GET /api/familiares/{id}/discapacidades` → `[]` |
| `test_alta_de_discapacidad_adulto` | Alta | `POST` y verifica `id_familiar` |
| `test_separacion_de_discapacidades_por_familiar` | Filtro por padre | 1 vs 0 |
| `test_consulta_y_actualizacion_de_discapacidad_adulto` | `GET` + `PUT` | Compara JSON y agrega observación |
| `test_discapacidad_adulto_inexistente_devuelve_404` | 404 y mensaje | `GET` y `PUT` |
| `test_la_discapacidad_del_nna_no_es_accesible_por_la_ruta_del_adulto` | Tablas separadas | Id de NNA contra la ruta de adulto → 404 |

### 1.14 `test_antecedentes.py` — 19 casos

Salud, escolar y familiar comparten contrato (lista `GRUPOS` parametrizada);
el vínculo familiar se prueba aparte porque no está agrupado.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_los_antecedentes_empiezan_vacios` | Estado inicial de los tres | Recorre `GRUPOS` y afirma `[]` |
| `test_alta_de_antecedente` | Alta de los tres | Usa la factoría de cada uno y compara `id_nna` |
| `test_los_antecedentes_quedan_sellados_con_el_caso_activo` | Sellado | Compara cada `id_caso` con `caso_activo_id` |
| `test_consulta_y_actualizacion_de_antecedente` | `GET` + `PUT` de los tres | Compara el JSON completo y luego aplica un payload distinto por grupo |
| `test_antecedente_inexistente_devuelve_404` | 404 y mensaje propio en `GET` y `PUT` | Recorre `GRUPOS` |
| `test_los_antecedentes_se_separan_por_nna` | Filtro por padre | Uno con registro, otro sin |
| `test_los_antecedentes_filtran_por_caso` | `?id_caso` en los tres | Un registro por caso; sin filtro 2, con filtro 1 |
| `test_salud_con_centro_salud_del_catalogo` | FK al catálogo | Toma el primer centro sembrado y lo asigna |
| `test_salud_acepta_todos_los_campos` | Alta completa de salud | Fecha, inscripción y previsión |
| `test_escolar_con_establecimiento_del_catalogo` | FK al catálogo | Toma el primer establecimiento sembrado |
| `test_escolar_sin_establecimiento_es_valido` | FK opcional | `id_establecimiento_educacional: null` con `escolarizado: false` |
| `test_familiar_con_adulto_responsable` | FK al Familiar | Asigna `id_adulto_responsable` |
| `test_familiar_acepta_detalle_de_convivencia` | Campo de detalle | `con_quien_vive_detalle` con texto largo |
| `test_vinculos_familiares_empiezan_vacios` | Estado inicial | `GET .../vinculos` → `[]` |
| `test_alta_de_vinculo_familiar` | Alta | Verifica `id_nna`, `id_familiar` y que **no** hay `id_caso` |
| `test_varios_vinculos_por_nna` | Uno a muchos | Tres parentescos → conjunto de 3 |
| `test_consulta_y_actualizacion_de_vinculo_familiar` | `GET` + `PUT` | Compara JSON y cambia el parentesco |
| `test_vinculo_familiar_inexistente_devuelve_404` | 404 y mensaje | `GET` y `PUT` |
| `test_el_mismo_familiar_puede_estar_en_dos_nna` | Sin restricción de unicidad | Vincula el mismo Familiar a dos NNA distintos |

### 1.15 `test_vinculos_nna.py` — 14 casos

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_sin_vinculos_el_listado_esta_vacio` | Estado inicial | `GET .../vinculos-nna` → `[]` |
| `test_alta_devuelve_201_con_el_par_normalizado` | **Orden forzado** `id_nna_1 < id_nna_2` | Crea el vínculo y compara ambas columnas contra el par ordenado |
| `test_el_vinculo_es_visible_desde_ambos_nna` | Consulta bidireccional | Lista desde los dos NNA y compara el id |
| `test_el_vinculo_no_es_visible_para_un_tercero` | El `OR` no filtra de más | Un tercer NNA → `[]` |
| `test_alta_sin_parentesco` | Parentesco opcional | `POST` sin él → `None` |
| `test_alta_sin_id_nna_2_devuelve_422` | Campo requerido | `POST` sólo con parentesco |
| `test_consulta_de_un_vinculo` | `GET` | Igualdad del JSON |
| `test_consulta_de_un_vinculo_inexistente_devuelve_404` | 404 y mensaje | UUID aleatorio |
| `test_actualizacion_del_parentesco` | `PUT` | Cambia parentesco; `id_nna_1` intacto |
| `test_actualizacion_de_un_vinculo_inexistente_devuelve_404` | 404 | UUID aleatorio |
| `test_el_mismo_par_no_se_puede_vincular_dos_veces` *(characterization)* | **Defecto B5** | Vincula y reintenta en orden inverso: `pytest.raises(IntegrityError)` |
| `test_un_nna_no_se_puede_vincular_consigo_mismo` *(characterization)* | `CheckConstraint chk_vinculo_nna_orden` | `id_nna_2` == el propio id → `IntegrityError` |
| `test_alta_con_un_nna_inexistente_propaga_el_error_de_integridad` *(characterization)* | FK inexistente | UUID aleatorio como `id_nna_2` |
| `test_multiples_vinculos_del_mismo_nna` | Uno a muchos | Tres vínculos desde un NNA → 3 |

### 1.16 `test_upload.py` — 31 casos

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_subida_sin_autenticacion_devuelve_403` | La ruta está protegida | `client` sin token |
| `test_subida_de_pdf` | Caso base | `POST` multipart; comprueba nombre original, prefijo y extensión de la URL |
| `test_el_nombre_en_disco_no_usa_el_nombre_original` | Nombres no adivinables | Sube un nombre descriptivo y afirma que no aparece en la URL ni es el nombre de archivo |
| `test_dos_subidas_del_mismo_nombre_no_se_pisan` | Unicidad | Dos subidas del mismo nombre → URLs distintas |
| `test_la_extension_se_normaliza_a_minusculas` | `Path.suffix.lower()` | `INFORME.PDF` → URL `.pdf` |
| `test_extensiones_permitidas` (×10) | Las 10 del `ALLOWED_EXTENSIONS` | Parametrizado: `.pdf .jpg .jpeg .png .gif .webp .doc .docx .xls .xlsx` |
| `test_extensiones_prohibidas` (×7) | Rechazo con mensaje | Parametrizado: `.exe .sh .py .zip .svg .html .txt`, y comprueba que la extensión aparece en `detail` |
| `test_archivo_sin_extension_devuelve_400` | Sufijo vacío | Nombre sin punto |
| `test_archivo_justo_en_el_limite_es_aceptado` | Borde `>` vs `>=` | Exactamente 10 MB → 200 |
| `test_archivo_que_excede_el_limite_devuelve_400` | Límite | 10 MB + 1 byte → 400 con "10 MB" |
| `test_archivo_vacio_es_aceptado` | Sin mínimo | 0 bytes → 200 y descarga de 0 bytes (limpieza en `finally`) |
| `test_subida_sin_archivo_devuelve_422` | `File(...)` requerido | `POST` sin cuerpo multipart |
| `test_el_archivo_subido_se_puede_descargar_con_su_contenido` | Integridad binaria | Contenido con bytes nulos y de control; compara el cuerpo descargado |
| `test_el_archivo_se_escribe_en_el_directorio_de_subidas` | Efecto en disco | Comprueba `Path(settings.UPLOAD_DIR, nombre).is_file()` y sus bytes |
| `test_un_nombre_con_travesia_de_directorios_no_escapa_del_directorio` *(characterization)* | Path traversal | Sube `../../fuera.pdf`; afirma que la ruta resuelta tiene `parent == UPLOAD_DIR` y documenta que el nombre original se devuelve sin sanear |
| `test_los_uploads_son_publicos_sin_token` *(characterization)* | **Defecto B11** | Descarga la URL con `client` **sin** Bearer → 200 |

Todas las pruebas que suben archivos borran el fichero del disco (`_limpiar`) y
algunas lo hacen en `finally`; el contenedor de pruebas no monta el volumen
`uploads`, así que no contamina el stack de desarrollo.

### 1.17 `test_e2p_questions.py` — 39 casos

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_cada_rango_valido_devuelve_sus_preguntas` (×8) | Los 8 rangos | Parametrizado; comprueba `edad` (etiqueta), que hay preguntas y que cada una tiene `id` int, texto y dimensión válida |
| `test_cada_rango_cubre_las_cuatro_dimensiones` (×8) | Cobertura por rango | El conjunto de dimensiones == las 4 |
| `test_los_items_de_cada_rango_no_se_repiten` (×8) | Sin duplicados | `len(numeros) == len(set(numeros))` |
| `test_las_preguntas_vienen_ordenadas_por_numero_de_item` (×8) | Orden | `numeros == sorted(numeros)` |
| `test_la_escala_likert_es_la_misma_en_todos_los_rangos` | Contrato de la escala | Compara el dict completo contra el esperado en los 8 rangos |
| `test_las_preguntas_incluyen_subdimension_cuando_existe` | La clave siempre está | `all("subdimension" in p)` (aunque el valor sea nulo) |
| `test_el_rango_19_36_meses_reparte_15_items_por_dimension` | Numeración exacta | Vinculares 1–15, Formativas 16–30, Protectoras 31–45, Reflexivas 46–60 |
| `test_un_rango_numerico_como_version_devuelve_404` | **El param es el rango, no un índice** | `/api/e2p/versions/1` → 404 con "1" en el mensaje |
| `test_un_rango_inexistente_devuelve_404` | Validación de `RANGOS_VALIDOS` | `99-100_anos` → 404 con mensaje exacto |
| `test_un_rango_con_guion_bajo_incorrecto_devuelve_404` | Formato estricto | `3-5-anos` (guiones) → 404 |
| `test_la_lista_de_preguntas_es_estable_entre_llamadas` | Determinismo | Compara dos llamadas consecutivas |

### 1.18 `test_e2p_crud.py` — 25 casos

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_listado_empieza_vacio` | Estado inicial | `GET /api/nna/{id}/e2p` → `[]` |
| `test_listado_por_familiar_empieza_vacio` | Ídem por familiar | `GET /api/familiares/{id}/e2p` → `[]` |
| `test_listado_filtra_por_caso` | `?id_caso` | Una E2P por caso; sin filtro 2, con filtro 1 |
| `test_el_listado_por_familiar_devuelve_las_evaluaciones_del_familiar` | Filtro por familiar | Compara el id creado |
| `test_alta_minima` | Alta mínima | `POST` sin respuestas: `respuestas is None`, `perfil_resultado_global is None` |
| `test_alta_sin_campos_requeridos_devuelve_422` | Requeridos | `POST {}` |
| `test_alta_sin_cada_campo_requerido_devuelve_422` (×3) | Uno por uno | Parametrizado sobre `fecha_evaluacion`, `edad_meses_evaluacion`, `rango_etario` |
| `test_alta_con_rango_invalido_falla_en_la_base` *(characterization)* | **Defecto B6** | `rango_etario: "3-5-anos"` → `IntegrityError` en vez de 422 |
| `test_el_alta_queda_sellada_con_el_caso_activo` | Sellado | Compara con `caso_activo_id` |
| `test_alta_con_respuestas_normaliza_las_filas` | **Normalización** | Envía el cuestionario completo (4 dimensiones × 15 ítems) y lee `RespuestaE2P` por ORM: 60 filas con valor 4 |
| `test_alta_con_respuestas_calcula_los_puntajes_por_dimension` | **Cálculo** | Lee `PuntajeE2P`: 4 filas con bruto 60, una por dimensión |
| `test_alta_sin_respuestas_no_crea_puntajes` | Sin respuestas no hay puntajes | `PuntajeE2P` vacío |
| `test_las_respuestas_con_un_item_inexistente_se_ignoran` | Tolerancia | Envía `{"1": 4, "99999": 4}`; sólo persiste el 1 |
| `test_consulta_por_id` | `GET` | Igualdad del JSON |
| `test_consulta_inexistente_devuelve_404` | 404 y mensaje | UUID aleatorio |
| `test_la_consulta_reconstruye_el_diccionario_de_respuestas` | **Desnormalización de vuelta** | Reenvía todo en 3 y comprueba que `GET` devuelve el dict original |
| `test_actualizacion_de_campos_simples` | `PUT` parcial | Cambia la observación; rango y edad intactos |
| `test_actualizacion_inexistente_devuelve_404` | 404 | UUID aleatorio |
| `test_actualizacion_agregando_respuestas` | De vacío a lleno | `PUT {"respuestas"}` y verifica 4 puntajes creados |
| `test_reescribir_las_mismas_respuestas_no_duplica_ni_falla` | **Idempotencia del ciclo borrar+insertar** | Reenvía el mismo cuestionario; 200, 60 filas y 4 puntajes (no 120) |
| `test_reescribir_con_respuestas_distintas_actualiza_las_filas` | Reemplazo real | De todo 4 a todo 1; 60 filas con valor 1 |
| `test_actualizar_solo_la_observacion_conserva_las_respuestas` *(characterization)* | `respuestas: null` no borra | El endpoint sólo sincroniza si `is not None` |
| `test_un_cambio_de_rango_no_revalida_las_respuestas` *(characterization)* | Inconsistencia latente | Cambia el rango a `3-5_anos` sin reenviar respuestas: las 60 filas siguen apuntando a las preguntas de `19-36_meses` |

### 1.19 `test_e2p_scoring.py` — 34 casos

El motor de scoring, en tres capas.

**1. Tabla de verdad de `_determinar_resultado`** (unit, sin base): se llama
directamente a la función con listas de `{"dimension", "zona"}`.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_determinar_resultado` (×12) | Todas las reglas y sus bordes | Parametrizado con `(puntajes, esperado, motivo)`: sin dimensiones → `None`; 2 bajas → Riesgo; 1 baja en Vinculares → Riesgo; 1 baja no vincular → Monitoreo; 2 intermedias sin bajas → Monitoreo; 1 intermedia → `None`; 3 altas → Óptimo; 2 altas → `None`; riesgo manda sobre altas; riesgo con 2 bajas + 2 intermedias; 3 intermedias → Monitoreo; 3 altas + 1 intermedia → Óptimo |
| `test_el_orden_de_las_dimensiones_no_importa` | Conmutatividad | Compara la lista y su reverso |
| `test_una_zona_vacia_no_cuenta_como_baja` | Robustez ante `zona` vacía | Dos zonas `""` → `None` |

**2. Clasificación con baremos sintéticos**: el helper `_baremos_sinteticos`
borra los baremos del rango (incluido `Total`, que se reinserta con un valor
absurdo) y los sustituye por cortes controlados `0-20 baja / 21-40 intermedia /
41-60 alta`, de modo que con 15 ítems se sabe exactamente qué zona toca.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_todas_las_respuestas_altas_dan_perfil_optimo` | Óptimo | Todo en 4 → bruto 60, zona alta, decil 10 y perfil `Optimo` |
| `test_una_vinculares_baja_da_perfil_de_riesgo` | Riesgo por Vinculares | Sólo Vinculares en 1 (bruto 15, baja) y el resto en 4 |
| `test_una_baja_no_vincular_da_perfil_de_monitoreo` | Monitoreo | Sólo Formativas en 1 |
| `test_respuestas_intermedias_dan_perfil_de_monitoreo` | Intermedias | Todo en 2 → bruto 30 y zona intermedia |
| `test_el_baremo_total_no_se_usa_para_clasificar` | Se ignora `dimension="Total"` | Si se usara, el 0-0 forzaría Riesgo; el perfil sale `Optimo` y no hay puntaje `Total` |
| `test_el_desglose_manda_sobre_el_perfil_global_previo` | Recálculo | Parte de `Optimo` y al reenviar todo en 1 pasa a `Riesgo` |
| `test_sin_baremos_la_zona_queda_nula_y_el_perfil_no_se_fija` *(characterization)* | Tolerancia a la falta de baremos | Borra los baremos; los 4 puntajes se guardan con bruto 60 pero `zona`/`decil` nulos y perfil `None` |

**3. Colapso especial del rango `0-3_meses`**:
`0/1/2 → puntaje 2`, `3 → 3`, `4 → 4`.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_el_rango_0_3_meses_colapsa_los_valores_bajos` (×5) | El mapeo completo | Parametrizado `(respondido, esperado)`: `(0,2) (1,2) (2,2) (3,3) (4,4)`; comprueba que `valor_seleccionado` se conserva crudo y `puntaje_calculado` se colapsa |
| `test_el_colapso_de_0_3_meses_baja_el_puntaje_bruto` | Efecto en el bruto | Todo en 0 (que sería bruto 0) → bruto 30 y zona intermedia |
| `test_los_otros_rangos_no_colapsan` | El colapso es exclusivo del rango especial | En `19-36_meses` con todo en 1, `puntaje_calculado == 1` |

**4. Endpoint de puntaje**:

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_puntaje_inexistente_devuelve_404` | 404 | UUID aleatorio |
| `test_puntaje_sin_respuestas_devuelve_400` | 400 y mensaje | E2P mínima sin respuestas |
| `test_puntaje_completo` | Contrato del payload | Verifica `rango_etario`, `edad`, las 5 claves de `escala`, 60 respuestas, y por dimensión bruto 60, `puntaje_max` 60, zona alta y decil 10 |
| `test_puntaje_calcula_el_maximo_desde_las_preguntas_del_rango` | `puntaje_max = nº preguntas × 4` | Recorre todas las categorías |
| `test_el_maximo_refleja_las_preguntas_reales_del_rango_13_17` | El máximo no es fijo | En `13-17_anos` calcula los conteos reales por dimensión con `func.count()` y compara; además afirma que Protectoras ≠ Vinculares |
| `test_borrar_las_respuestas_limpia_el_perfil_global` | Limpieza | Con respuestas vacías, `perfil_resultado_global` queda `None` y `PuntajeE2P` vacío |

### 1.20 `test_pmf.py` — 20 casos

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_las_preguntas_vienen_de_la_tabla_sembrada` | 114 preguntas numeradas 1..114 | `GET /api/pmf/preguntas` y compara la secuencia completa |
| `test_las_preguntas_traen_la_escala_en_null` | `escala` no se usa | Conjunto == `{None}` |
| `test_las_preguntas_caen_al_json_si_la_tabla_esta_vacia` | **Fallback al JSON** | Borra `PreguntaPMF` por ORM, confirma vacío y vuelve a pedir: 114 preguntas de `pmf_afirmaciones.json` |
| `test_el_fallback_genera_ids_distintos_en_cada_llamada` | El JSON no tiene PKs | Compara dos llamadas: misma afirmación, distinto `id_pregunta_pmf` |
| `test_listado_empieza_vacio` | Estado inicial | `GET /api/nna/{id}/pmf` → `[]` |
| `test_listado_por_familiar_empieza_vacio` | Ídem | `GET /api/familiares/{id}/pmf` → `[]` |
| `test_listado_por_familiar_devuelve_las_evaluaciones_del_familiar` | Filtro | Compara el id |
| `test_listado_filtra_por_caso` | `?id_caso` | Uno por caso; sin filtro 2, con filtro 1 |
| `test_alta_con_todos_los_campos` | Alta completa | Fechas, resultado y observación |
| `test_alta_vacia_es_valida` | Todo opcional salvo el familiar | `POST` sólo con `id_familiar` |
| `test_alta_sin_familiar_falla_en_la_base` *(characterization)* | `id_familiar` opcional en schema, `NOT NULL` en modelo | `POST {}` → `IntegrityError` |
| `test_alta_con_respuestas` | Respuestas booleanas | `{"1": true, "2": false, "3": true}` → 3 filas con ambos valores |
| `test_las_respuestas_con_numero_inexistente_se_ignoran` | Tolerancia | `{"1": true, "9999": true}` → sólo el 1 |
| `test_consulta_por_id` | `GET` | Igualdad del JSON |
| `test_consulta_inexistente_devuelve_404` | 404 y mensaje | UUID aleatorio |
| `test_actualizacion_parcial` | `PUT` | Cambia `resultado`; la fecha se conserva |
| `test_actualizacion_inexistente_devuelve_404` | 404 | UUID aleatorio |
| `test_agregar_respuestas_despues_del_alta` | De vacío a lleno | `PUT {"respuestas"}` |
| `test_reenviar_las_mismas_respuestas_no_falla` | Idempotencia (aquí **sí** por diseño) | Dos `PUT` con lo mismo; siguen 3 filas |
| `test_reenviar_respuestas_distintas_reemplaza_las_anteriores` | Reemplazo | De `{1,2}` a `{5}`; 1 fila con `respuesta is False` |

### 1.21 `test_ncfas.py` — 33 casos

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_las_dimensiones_estan_agrupadas_y_ordenadas` | 10 dimensiones A–J | Compara la lista de letras y que cada una tenga nombre e ítems |
| `test_los_items_de_cada_dimension_vienen_ordenados_por_numero` | Orden por dimensión | `numeros == sorted(numeros)` en cada una |
| `test_cada_dimension_tiene_exactamente_un_item_general_al_final` | Invariante del instrumento | Exactamente un `es_item_general` y es el de número máximo |
| `test_los_items_traen_sus_rubricas` | `definiciones` poblado | Al menos uno con rúbricas y todas son dict |
| `test_los_items_caen_al_json_si_la_tabla_esta_vacia` | **Fallback al JSON** | Borra `ItemNCFAS` y vuelve a pedir: A–J con ítems |
| `test_el_fallback_del_json_conserva_el_item_general` | Idem para el flag | Un general por dimensión |
| `test_listado_empieza_vacio` | Estado inicial | `GET /api/nna/{id}/ncfas` → `[]` |
| `test_listado_por_familiar_empieza_vacio` | Ídem | `GET /api/familiares/{id}/ncfas` → `[]` |
| `test_alta_con_todos_los_campos` | Alta completa | Reunificación, fechas, estado y observación; verifica `id_caso` |
| `test_alta_minima` | Defaults | `es_reunificacion is False`, `estado is None` |
| `test_listado_por_familiar_devuelve_la_evaluacion` | Filtro | Compara el id |
| `test_listado_filtra_por_caso` | `?id_caso` | Sin filtro 2, con filtro 1 |
| `test_consulta_por_id` | `GET` | Igualdad del JSON |
| `test_consulta_inexistente_devuelve_404` | 404 y mensaje | UUID aleatorio |
| `test_actualizacion_parcial` | `PUT` | Cambia estado y cierre; la apertura se conserva |
| `test_actualizacion_inexistente_devuelve_404` | 404 | UUID aleatorio |
| `test_alta_con_respuestas_normaliza_las_filas` | Normalización | `{Ingreso: {2 ítems}, Cierre: {1 ítem}}` → 3 filas y 2 momentos |
| `test_se_aceptan_los_tres_momentos` | Ingreso/Intermedio/Cierre | Un ítem en cada momento → los 3 |
| `test_se_aceptan_todos_los_puntajes_del_catalogo` | Los 8 puntajes | Asigna `+2 +1 0 -1 -2 -3 N/A DN` a 8 ítems y compara el conjunto |
| `test_se_descartan_los_momentos_invalidos` | Filtro de momento | `Egreso` y `""` se descartan; sólo queda `Ingreso` |
| `test_se_descartan_los_puntajes_fuera_del_catalogo` | Filtro de puntaje | `+5` se descarta |
| `test_se_descartan_los_items_desconocidos` | Filtro de ítem | `Z_99`, `A_999`, `sin_formato` se descartan |
| `test_las_respuestas_aceptan_letra_minuscula` | La clave se construye con la letra tal cual | Envía `a_1`; no encuentra el ítem y `respuestas` queda `None` |
| `test_reenviar_las_mismas_respuestas_no_falla` | Idempotencia pese al `UNIQUE` | Dos `PUT` con lo mismo; siguen 2 filas |
| `test_reenviar_respuestas_distintas_reemplaza_las_anteriores` | Reemplazo | De `Ingreso` a `Cierre`; 1 fila con el momento nuevo |
| `test_comentarios_empiezan_vacios` | Estado inicial | `GET .../comentarios` → `[]` |
| `test_crear_un_comentario` | Alta | `PUT .../comentarios/A`; verifica letra, texto e `id_ncfas` |
| `test_el_comentario_es_un_upsert` | **Upsert** | Dos `PUT` sobre la misma letra: mismo `id_comentario_ncfas` y una sola fila |
| `test_la_letra_se_normaliza_a_mayusculas` | `.upper()` | Crea con `c` y actualiza con `C`: mismo registro |
| `test_varios_comentarios_por_evaluacion` | Uno por dimensión | A, B y C → ordenados |
| `test_comentario_sobre_una_evaluacion_inexistente_devuelve_404` | 404 y mensaje | UUID aleatorio |
| `test_comentario_sin_cuerpo_devuelve_422` | `ComentarioUpsert` requerido | `PUT {}` |
| `test_los_comentarios_se_borran_junto_con_los_de_otra_evaluacion` | Aislamiento por `id_ncfas` | Comentario en una evaluación no aparece en la otra |

### 1.22 `test_services.py` — 61 casos

Pruebas unitarias y de integración directa contra `app/services`.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_add_months` (×14) | Calendario del encadenamiento | Parametrizado: mismo mes, +1/+3/+12, cruce de año, recorte de fin de mes (31 ene → 29 feb bisiesto, → 28 feb no bisiesto, 31 mar → 30 abr, 31 ago → 30 sep, 31 may → 30 jun), 29 feb + 12 meses, y meses negativos |
| `test_get_active_caso_devuelve_el_caso_en_progreso` | Búsqueda del activo | Crea NNA + caso por ORM y compara ids |
| `test_get_active_caso_es_none_si_todo_esta_cerrado` | Sin activo | Caso `Cerrado` → `None` |
| `test_get_active_caso_es_none_para_un_nna_inexistente` | UUID desconocido | `None` |
| `test_create_nna_child_sella_el_caso_activo` | Sellado | Crea una `DocumentacionIngreso` y compara `id_caso` e `id_nna` |
| `test_create_nna_child_crea_un_caso_si_no_hay_activo` | Auto-creación | NNA con caso cerrado; crea el hijo y verifica que hay 2 casos y que el nuevo es el activo |
| `test_create_nna_child_respeta_un_id_caso_explicito` | El `id_caso` del payload manda | Pasa `id_caso` explícito y comprueba que se respeta |
| `test_create_nna_child_ignora_el_id_caso_si_el_modelo_no_lo_tiene` | Modelos no agrupados | Con `HistorialConsumoNNA` afirma `not hasattr(creado, "id_caso")` |
| `test_list_nna_children_sin_filtro_devuelve_todos_los_casos` | Sin filtro | Un registro en cada uno de dos casos → `{A, B}` |
| `test_list_nna_children_filtra_por_caso` | Con filtro | Sólo el del caso pedido |
| `test_el_filtro_por_caso_se_ignora_en_modelos_sin_id_caso` | El filtro no rompe modelos no agrupados | Pasa un `id_caso` aleatorio a un modelo sin esa columna y sigue devolviendo 1 |
| `test_assert_caso_abierto_no_hace_nada_si_el_objeto_no_tiene_caso` | Guard tolerante | `SimpleNamespace()` sin `id_caso` no lanza |
| `test_assert_caso_abierto_permite_el_caso_en_progreso` | Caso abierto | No lanza |
| `test_assert_caso_abierto_bloquea_el_caso_cerrado` | Caso cerrado | `HTTPException` con `status_code == 409` |
| `test_update_child_bloquea_la_escritura_en_caso_cerrado` | Guard en el update | 409 antes de escribir |
| `test_update_child_escribe_cuando_el_caso_esta_abierto` | Camino feliz | Persiste el cambio |
| `test_create_diagnostico_informe_crea_el_informe_a_30_dias` | +30 días | Fecha fija `2024-03-10` → vencimiento `2024-04-09`, tipo y estado |
| `test_create_diagnostico_informe_es_idempotente` | No duplica pendientes | Segunda llamada devuelve `None` y hay 1 informe |
| `test_create_diagnostico_informe_no_choca_con_otro_caso` | El guard es por caso | Un Diagnóstico en el caso activo no bloquea el de un caso cerrado |
| `test_create_diagnostico_informe_ignora_los_ya_enviados` | Sólo bloquea el pendiente | Un Diagnóstico `Enviado` no impide crear otro |
| `test_chain_next_informe_desde_diagnostico_usa_el_ingreso_mas_90_dias` | +90 días del ingreso | Con un `AntecedenteIngreso` de fecha fija; verifica tipo `Avance`, estado `Pendiente` y `id_caso` |
| `test_chain_next_informe_desde_diagnostico_sin_ingreso_no_encadena` | Falta el insumo | `None` |
| `test_chain_next_informe_desde_avance_suma_tres_meses` | +3 meses | Vencimiento `2024-01-31` → `2024-04-30` |
| `test_chain_next_informe_desde_avance_sin_vencimiento_no_encadena` | `None` | `None` |
| `test_chain_next_informe_ignora_los_tipos_desconocidos` | Tipo `None` | `None` |
| `test_los_informes_encadenados_no_se_duplican_en_la_base` *(characterization)* | **Defecto B7**: el servicio no tiene guard | Llama dos veces → 3 informes |
| `test_get_latest_fecha_ingreso_devuelve_la_mas_reciente` | Máximo | Tres fechas desordenadas → la mayor |
| `test_get_latest_fecha_ingreso_ignora_los_nulos` | `IS NOT NULL` | Sólo un ingreso con fecha nula → `None` |
| `test_get_latest_fecha_ingreso_filtra_por_caso` | El filtro cambia el resultado | Sin filtro → `2024-09-09`; con filtro al caso activo → `2024-01-01` |
| `test_create_y_listar_hijos_de_familiar` | Helper de familiar | Crea un `AntecedentesPenales` y lo lista |
| `test_create_y_listar_causales_de_ingreso` | Helper de ingreso | Crea un `RegistroCausalIngreso` y lo lista |
| `test_create_y_listar_vinculos_familiares` | Helper de vínculo | Crea y lista comparando el par `(id_familiar, parentesco)` |
| `test_create_vinculo_nna_normaliza_el_orden` | Orden forzado | Pasa el mayor como origen y comprueba que queda como `id_nna_2` |
| `test_list_vinculo_nna_es_bidireccional` | El `OR` de la consulta | Consulta desde ambos extremos → 1 cada uno |
| `test_list_vinculo_nna_de_un_tercero_esta_vacio` | No filtra de más | Un tercer NNA → `[]` |
| `test_el_par_de_vinculo_nna_es_unico` | `UNIQUE` | Segundo intento → `IntegrityError` |
| `test_get_nna_child_devuelve_none_si_no_existe` | Helper genérico | UUID aleatorio → `None` |
| `test_nna_service_create_crea_el_caso_activo` | `NNAService.create` | Verifica que hay caso activo |
| `test_nna_service_get_y_update` | `get` + `update` | Lee y renombra |
| `test_nna_service_get_inexistente_es_none` | 404 del servicio | `None` |
| `test_nna_service_list_devuelve_el_estado_del_caso` | Tupla `(NNA, estado)` | Comprueba id y `"En Progreso"` |
| `test_nna_service_list_prioriza_el_caso_activo` | Cierra el activo y crea otro | Sigue devolviendo `"En Progreso"` |
| `test_nna_service_list_respeta_skip_y_limit` | Paginación del servicio | 3 creados → 2 y 1 |
| `test_familiar_service_crear_consultar_y_actualizar` | `FamiliarService` | Alta, lectura y cambio de teléfono |
| `test_familiar_service_get_inexistente_es_none` | `None` | UUID aleatorio |
| `test_familiar_service_list_pagina` | Paginación | 3 → 3 y 1 |
| `test_borrar_un_nna_por_el_orm_falla_porque_nulea_las_fk_de_sus_hijos` *(characterization)* | **Defecto B4** | Crea un hijo, `session.delete(nna)` + commit → `IntegrityError` |
| `test_borrar_un_ncfas_por_el_orm_arrastra_sus_respuestas_y_comentarios` | Contraste: aquí sí hay cascada | Crea respuestas y comentario, borra el NCFAS y comprueba que ambos quedan vacíos |

### 1.23 `test_migrations.py` — 22 casos

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_hay_exactamente_tres_migraciones` | Inventario | Cuenta los `.py` en `migrations/versions` |
| `test_la_cadena_de_migraciones_es_lineal_y_termina_en_el_head_esperado` | Linealidad | Extrae `revision`/`down_revision` con regex de los tres archivos y comprueba el encadenado y que el head es el único no referenciado |
| `test_la_migracion_de_agrupacion_lista_las_diez_tablas` | Contenido | Busca `"<tabla>"` en el texto de `3f2e134a5977` |
| `test_la_migracion_de_endurecimiento_lista_las_diez_fks_compuestas` | Contenido | Busca `fk_<tabla>_nna_caso` en `bbf68836b0d8` |
| `test_los_nombres_de_tabla_de_las_migraciones_existen_en_los_modelos` | Sin tablas fantasma | Cruza los nombres citados contra `SQLModel.metadata.tables` |
| `test_upgrade_head_construye_el_esquema_desde_una_base_vacia` | Reproducibilidad (B1 resuelto) | Crea `sw_mejor_ninez_migtest`, corre `alembic upgrade head` y espera el esquema completo |
| `test_downgrade_base_no_deja_tablas_de_la_aplicacion` | Reversibilidad (B1 resuelto) | `upgrade` + `downgrade base` y espera 0 tablas de la app |
| `test_la_migracion_inicial_crea_el_esquema_previo_a_la_agrupacion` | Contrato de la inicial | Para en `0b733fafb9a6`: sin tabla `Caso`, sin columnas `id_caso`, con el unique histórico por `id_nna` |
| `test_el_ciclo_upgrade_downgrade_upgrade_es_estable` | Ida y vuelta | `upgrade`→`downgrade`→`upgrade` y comprueba que no quedan residuos |
| `test_el_esquema_construido_por_la_cadena_coincide_con_los_modelos` | Paridad fina | Compara columnas, nulabilidad, PKs, FKs locales y restricciones con nombre entre la cadena y los modelos |
| `test_alembic_no_detecta_deriva_entre_los_modelos_y_el_esquema_migrado` | **B2 resuelto**: `--autogenerate` limpio | Migra a head y compara con `compare_metadata`; exige lista vacía (antes: 10 entradas `modify_nullable` sobre `id_caso`) |
| `test_todas_las_tablas_de_los_modelos_existen_en_el_esquema` | Paridad | Compara `SQLModel.metadata.tables` con `inspect().get_table_names()` de la base de pruebas |
| `test_no_hay_tablas_de_aplicacion_de_mas` | Exhaustividad | Igualdad estricta de conjuntos |
| `test_todas_las_columnas_de_los_modelos_existen` | Columnas | Recorre cada tabla y compara nombres de columna |
| `test_las_tablas_agrupadas_tienen_id_caso_no_nulo` | `NOT NULL` efectivo en la base | `inspect().get_columns()` y `nullable is False` en las 10 |
| `test_los_modelos_declaran_id_caso_no_nulo` | **B2 resuelto**: modelos y base de acuerdo | Afirma `columna.nullable is False` en `SQLModel.metadata` para las 10 |
| `test_las_tablas_agrupadas_tienen_la_fk_compuesta_contra_caso` | FKs compuestas | Busca una FK a `Caso` con columnas `{id_nna, id_caso}` en cada tabla |
| `test_existe_el_indice_parcial_de_un_solo_caso_activo_por_nna` | Índice parcial | Busca `uq_caso_activo_por_nna`, comprueba `unique` y `column_names == ["id_nna"]` |
| `test_la_tabla_caso_tiene_las_restricciones_de_unicidad` | Constraints | `uq_caso_nna_caso` en únicos y `chk_estado_caso` en checks |
| `test_despeje_es_unico_por_nna_y_caso` | Cambio de la migración | `uq_despeje_nna_caso` presente y el antiguo `..._id_nna_key` ausente |
| `test_las_tablas_hijas_de_instrumentos_tienen_su_unique` | Uniques de hijos | `RespuestaNCFAS` y `VinculoNNA` con su nombre; `RespuestaE2P` con uno anónimo |
| `test_los_instrumentos_cascada_declaran_ondelete` | Pendiente conocido | `CASCADE` en NCFAS/PMF y `None` en `RespuestaE2P` |

### 1.24 `test_seed.py` — 15 casos

Corren sobre `sw_mejor_ninez_seedtest`, recreada con `create_all`. Para sembrar
esa base se sustituye `seed.async_session` con `monkeypatch.setattr` (única
costura necesaria; el código de producción queda intacto).

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `test_el_seed_crea_la_base_de_demostracion` | Conteos exactos | Compara el diccionario de 19 conteos completo: 1 usuario, 5 solicitantes, 3 establecimientos, 3 centros, 472+400 E2P, 114 PMF, 70 NCFAS, 3 NNA, 5 familiares, 4 casos, 3 despejes, 5 notificaciones, 3 E2P, 1 PMF, 1 NCFAS, 3 ingresos, 2 informes, 3 de salud |
| `test_el_seed_crea_el_admin_por_defecto` | Usuario admin | Lee el `Usuario`, comprueba email, nombre, `is_active`, que el hash no es la password y que `verify_password("admin123", hash)` es `True` |
| `test_el_seed_deja_un_caso_activo_por_nna_y_uno_cerrado` | 3 activos + 1 cerrado | Agrupa por estado y compara los `id_nna` de los activos con los de los NNA |
| `test_el_seed_sella_los_registros_agrupados_con_su_caso` | Sellado coherente | Construye `{id_caso: id_nna}` y verifica en 7 modelos que `caso_de[registro.id_caso] == registro.id_nna` |
| `test_el_seed_sella_el_caso_de_todos_los_registros_agrupados` | Sellado completo sobre esquema endurecido | Exige que **ninguna** de las 10 tablas tenga `id_caso` nullable, recorre los 10 modelos comprobando `id_caso` no nulo y que el par `(id_caso, id_nna)` exista entre los casos |
| `test_el_seed_no_crea_respuestas_de_instrumentos` *(pendiente conocido)* | Hueco documentado | `RespuestaE2P`, `RespuestaPMF` y `RespuestaNCFAS` en 0 |
| `test_los_e2p_sembrados_tienen_su_perfil_global_pero_no_puntajes` | Datos coherentes a medias | Los 3 perfiles son `{Monitoreo, Optimo, Riesgo}` |
| `test_el_seed_crea_el_despeje_de_cada_nna` | Despejes y notificaciones | Estados `{Cerrado Sin Red, En Notificación, Evaluando}` y notificaciones por despeje `[1, 2, 2]` |
| `test_el_seed_es_idempotente` | Idempotencia | Corre dos veces y compara los 19 conteos |
| `test_la_segunda_corrida_reporta_que_omite_todo` | Los mensajes de "skipping" | Captura stdout con `capsys` y busca los 6 mensajes exactos |
| `test_la_tercera_corrida_tampoco_duplica` | Idempotencia sostenida | Corre tres veces |
| `test_el_mensaje_final_del_seed_exagera_el_numero_de_notificaciones` *(characterization)* | **Defecto B12** | El stdout dice "6 notificaciones" y el conteo real es 5 |
| `test_con_menos_de_dos_nna_el_seed_si_inserta_la_demografia` | Corte `>= 2`, lado bajo | Inserta 1 NNA vacío por ORM y siembra: quedan 4 |
| `test_con_dos_o_mas_nna_el_seed_no_inserta_la_demografia` | Corte `>= 2`, lado alto | Inserta 2 NNA; quedan 2, pero los datos estáticos **sí** se siembran (472, 70, 5) y hay 0 casos |
| `test_el_seed_usa_los_json_de_app_data` | Origen de los datos estáticos | Comprueba `seed._DATA_DIR`, los 3 JSON nombrados y que hay exactamente 10 archivos de dimensión NCFAS |

---

## 2. Frontend

### 2.1 `utils.test.ts` — 22 casos

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `cn > combina clases sueltas` | Unión simple | `cn("px-2","py-1")` |
| `cn > ignora valores falsy` | Falsy descartados | Mezcla `false && ...`, `undefined`, `null`, `""` |
| `cn > resuelve conflictos de Tailwind quedandose con la ultima clase` | `twMerge` | `px-2`+`px-4` → `px-4`; colores de texto |
| `cn > respeta los modificadores como parte de la clase` | `md:` no colisiona con `px-2` | Comprueba el resultado literal |
| `cn > acepta la forma condicional de objeto y arreglo` | API de `clsx` | `{...}` y arreglos anidados |
| `cn > sin argumentos devuelve cadena vacia` | Borde | `cn()` → `""` |
| `calcularEdad > devuelve null sin fecha` | `null` | `calcularEdad(null)` |
| `calcularEdad > devuelve null con una fecha invalida` | Guard `isNaN` | `"no-es-una-fecha"` y `"2020-13-45"` |
| `calcularEdad > cuenta los anos cumplidos` | Cálculo | Construye una fecha de hace 20 años **con el mismo día y mes** para no depender de la fecha de ejecución |
| `calcularEdad > no cuenta el ano cuando el cumpleanos aun no llega` | Resta del año no cumplido | Nacimiento con el día siguiente al de hoy, hace 10 años → 9 |
| `calcularEdad > si cumple anos hoy, ya cuenta el ano nuevo` | Borde exacto | Nacimiento hoy hace 15 años → 15 |
| `calcularEdad > interpreta la fecha en horario local, sin corrimiento de zona` | **`T00:00:00`** | Nacimiento hoy → 0; sin el sufijo daría −1 por UTC |
| `calcularEdad > acepta un nacimiento reciente y devuelve 0` | No negativo | Nacimiento el día 1 del mes actual |
| `iniciales > devuelve un guion largo sin nombre` | Placeholder | `null` y `""` → `"—"` |
| `iniciales > con solo espacios devuelve cadena vacia` | **Defecto F1** (comportamiento actual) | `"   "` → `""` |
| `iniciales > DEFECTO: un nombre de solo espacios deberia devolver el placeholder` **(it.fails)** | El defecto, declarado | Afirma `"—"`; falla hoy, y si se arregla `utils.ts` la prueba pasa y Vitest lo reporta |
| `iniciales > con otros espacios en blanco se comporta igual` | Consistencia | `"\t\n"` → `""` |
| `iniciales > toma las dos primeras palabras en mayuscula` | `slice(0,2)` + `toUpperCase` | `"Ana Muñoz"` → `AM`, `"carlos rojas"` → `CR` |
| `iniciales > ignora las palabras siguientes` | Sólo dos | `"María José Huenchul Paillal"` → `MJ` |
| `iniciales > con una sola palabra devuelve una inicial` | Borde | `"Ana"` → `A` |
| `iniciales > colapsa espacios repetidos y recorta los extremos` | `trim()` + `\s+` | `"  Ana   Muñoz  "` → `AM` |
| `iniciales > no falla con caracteres no ASCII` | Unicode | `"ñandú overo"` → `ÑO` |

### 2.2 `catalogos.test.ts` — 13 casos

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `detectTipoCausa > reconoce la causa proteccional` | `P` → Proteccional | `"P-5678-2025"` y la variante minúscula |
| `detectTipoCausa > reconoce la causa de vulneracion` | `X` → Vulneración | Idem |
| `detectTipoCausa > devuelve null para cualquier otra letra inicial` | Resto de letras | Bucle sobre `A C O R Z 9` |
| `detectTipoCausa > devuelve null sin RIT` | Cadena vacía | `""` |
| `detectTipoCausa > solo mira el primer caracter` | Posición 0 exacta | `"PX-..."` → P; `" P-..."` (espacio inicial) → `null` |
| `detectTipoCausa > ignora el formato del resto del RIT` | RIT de un carácter | `"P"` y `"X"` |
| `catalogos > el catalogo de causales no tiene entradas vacias ni repetidas` | Higiene del catálogo | `all(trim)`, `Set.size == length`, `length > 10` |
| `catalogos > el catalogo de causales cubre las causales de ingreso del dominio` | Contenido de negocio | Busca 5 causales concretas (negligencia, inhabilidad, VIF, consumo, deserción) |
| `catalogos > el catalogo de derechos no tiene repetidos` | Higiene | Set vs length |
| `catalogos > el catalogo de derechos incluye los derechos de la Convencion mas usados` | Contenido | Interés Superior, No discriminación, Ser oído, Identidad |
| `catalogos > el catalogo de documentacion de ingreso es el esperado` | Igualdad exacta | `toEqual` de los 4 valores |
| `catalogos > el catalogo de programas previos termina en Otro` | Convención de cierre | `at(-1) === "Otro"` |
| `catalogos > el catalogo de motivos de egreso termina en Otro` | Idem | `at(-1)` y presencia de "Agravamiento o cronicidad" |

### 2.3 `auth.test.ts` — 18 casos

Se simulan `localStorage`, `window` y `fetch` con `vi.stubGlobal`; `afterEach`
llama a `vi.unstubAllGlobals()`.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `getToken > devuelve null sin token guardado` | Vacío | `getToken()` |
| `getToken > devuelve el token guardado` | Lectura | Escribe y lee |
| `isAuthenticated > es false sin token` | Falso | Sin nada en storage |
| `isAuthenticated > es true con token` | Verdadero | Con token |
| `isAuthenticated > es false con cadena vacia como token` *(documenta F3)* | Devuelve `true` (no `false`) | Afirma que `getToken() === ""` y `isAuthenticated() === true`; el comentario explica el impacto real (bajo: el API daría 403) |
| `getUser > devuelve null sin usuario guardado` | Vacío | — |
| `getUser > devuelve el usuario guardado` | Parseo | Compara el objeto completo |
| `getUser > devuelve null si el JSON guardado esta corrupto` | `try/catch` | Guarda `"{no es json"` |
| `getUser > devuelve null si el valor guardado es la cadena 'null'` | `JSON.parse("null")` | `null` |
| `login > guarda el token y luego el usuario` | Doble escritura | `fetch` encadenado con dos `mockResolvedValueOnce`; verifica storage y `toHaveBeenCalledTimes(2)` |
| `login > manda las credenciales como JSON al endpoint de login` | Contrato de la petición | Inspecciona `fetch.mock.calls[0]`: URL con `/auth/login`, método, `Content-Type` y `body` parseado |
| `login > pide /auth/me con el Bearer recien obtenido` | Segundo paso | Inspecciona `calls[1]`: URL y `Authorization` |
| `login > lanza con el cuerpo del error cuando las credenciales fallan` | Propagación | 401 con `detail`; espera el texto crudo y storage limpio |
| `login > lanza un mensaje generico si el error viene vacio` | Fallback | 500 con cuerpo `""` → "Credenciales inválidas" |
| `login > guarda el token aunque /auth/me falle` | Robustez | Segundo `fetch` en 500: hay token y no hay usuario |
| `login > no borra un usuario previo si /auth/me falla` | No destructivo | Pre-carga un usuario y comprueba que sigue ahí |
| `logout > limpia la sesion y redirige a /login` | Efecto completo | Comprueba storage vacío y `window.location.href` |
| `logout > es idempotente sin sesion previa` | Sin excepción | Llama sin sesión y verifica la redirección |

### 2.4 `api.test.ts` — 61 casos

El archivo más grande: cubre cabeceras, errores, el contrato de rutas y las altas.

**Cabeceras y token (4)**

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `adjunta el Bearer cuando hay token` | Auth | Con token en storage, inspecciona las cabeceras de la llamada |
| `no adjunta Authorization sin token` | Sin fuga | Sin token, `headers["Authorization"]` es `undefined` |
| `manda Content-Type JSON siempre` | Cabecera fija | Comprueba `"application/json"` |
| `construye la URL sobre la base de la API` | Base URL | `api.nna.list()` → `http://localhost:8000/api/nna?skip=0&limit=100` |

**Manejo de errores (4)**

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `lanza con el status, el statusText y el cuerpo` | Formato del error | 404 con cuerpo JSON; compara el mensaje completo `"404 Not Found: {...}"` |
| `en 401 limpia la sesion y redirige a /login` | Interceptor | Pre-carga token y usuario; tras el 401 comprueba storage limpio, `location.href` y el mensaje "Sesión expirada" |
| `en 403 no redirige` | 403 no es sesión expirada | Comprueba que `location.href` sigue vacío y el token intacto |
| `propaga errores de red` | `fetch` rechazando | `mockRejectedValue(new Error("sin red"))` |

**Contrato de rutas del cliente (45)** — tabla `CASOS` dirigida por datos, con
`it.each`: cada fila es `[nombre, invocación, método, ruta esperada]`. Se
comprueba la URL completa contra `API_BASE` y el método HTTP.

| Grupo | Casos |
|---|---|
| NNA | `nna.list` (`skip=10&limit=5`), `nna.get`, `nna.update` (PUT) |
| Casos | `casos.list`, `casos.get`, `casos.update` (PUT) |
| Familiares | `familiares.list`, `familiares.get` |
| Consumo | `historialConsumoNNA.list`, `historialConsumoNNA.update` (PUT), `historialConsumoAdulto.list` |
| Discapacidad | `discapacidadNNA.list`, `discapacidadAdulto.update` (PUT) |
| Penales | `antecedentesPenales.list` |
| Ingreso | `antecedenteIngreso.list`, `antecedenteIngreso.list con caso` (añade `?id_caso=`), `documentacionIngreso.list con caso` |
| Ingreso (hijos) | `causalIngreso.list`, `derechoVulnerado.list` |
| Historial | `historialRed.list` |
| Despeje | `despeje.getByNna`, `despeje.getByNna con caso`, `notificacion.list` |
| Informes | `informeTribunal.list con caso`, `informeTribunal.atrasados`, `informeTribunal.proximosAVencer`, `informeTribunal.proximosAVencer con dias` (añade `?dias=30`) |
| E2P | `e2p.getQuestions` (`/e2p/versions/3-5_anos`), `e2p.get`, `e2p.getPuntaje`, `e2p.listByFamiliar` |
| PMF | `pmf.getQuestions`, `pmf.get` |
| NCFAS | `ncfas.getItems`, `ncfas.get`, `ncfas.getComentarios`, `ncfas.saveComentario` (PUT a `.../A`) |
| Antecedentes | `antecedenteSalud.list` (con caso), `antecedenteEscolar.list`, `antecedenteFamiliar.list` |
| Vínculos | `vinculoFamiliar.list`, `vinculoNNA.list` |
| Catálogos | `solicitanteIngreso.list`, `establecimientoEducacional.list`, `centroSalud.list` |

**Altas (POST) (4)**

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `nna.create manda el cuerpo y usa POST` | Alta | Parsea el `body` y compara con el objeto enviado |
| `casos.create usa el endpoint del NNA y un cuerpo vacio por defecto` | Default `{}` | Verifica URL y `body` parseado |
| `e2p.createByNna usa el endpoint del NNA` | URL correcta | — |
| `ncfas.saveComentario manda solo el campo comentario` | Payload mínimo | `body` == `{comentario: ...}` |

**`api.upload.docs` (4)**

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `manda FormData sin Content-Type explicito` | Multipart correcto | Afirma que el `body` es `instanceof FormData` y que **no** hay `Content-Type` (lo debe poner el navegador con el boundary) |
| `devuelve la URL absoluta quitando el sufijo /api` | Composición de URL | `/uploads/abc.pdf` → `http://localhost:8000/uploads/abc.pdf` |
| `en 401 limpia la sesion y redirige` | Interceptor replicado | Igual que el del cliente general |
| `lanza con el status y el cuerpo ante un 400` | Error de validación | Mensaje `"400: Tipo de archivo no permitido: .exe"` |

### 2.5 `nna-resumen-utils.test.ts` — 24 casos

Usa un helper `notificacion(campos)` que devuelve un `NotificacionFamiliar`
completo con valores por defecto, y `iso(haceDias)` para fechas relativas a hoy.

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `diasDesde > devuelve null sin fecha` | `null` | — |
| `diasDesde > devuelve 0 para hoy` | Borde | `iso(0)` |
| `diasDesde > cuenta los dias transcurridos` | 1, 30 y 365 | Tres comprobaciones |
| `diasDesde > devuelve un numero negativo para una fecha futura` | Signo | `iso(-5)` → −5 |
| `diasDesde > interpreta la fecha en horario local` | El `T00:00:00` | `iso(0)` → 0 |
| `getAlertaResumen > sin notificaciones no hay alerta` | `[]` → `null` | — |
| `getAlertaResumen > verde si algun familiar acepta la evaluacion` | Verde | Resultado "Acepta evaluación" |
| `getAlertaResumen > verde gana sobre una alerta roja de otro familiar` | Precedencia | Un rojo + un verde → verde |
| `getAlertaResumen > verde gana aunque el verde aparezca despues` | El orden no importa | Invierte el arreglo |
| `getAlertaResumen > roja a los 15 dias o mas de la segunda carta sin respuesta` | Roja | 2ª carta hace 20 días |
| `getAlertaResumen > roja en el limite exacto de 15 dias` | Borde `>= 15` | Día 15 exacto |
| `getAlertaResumen > no es roja con 14 dias de la segunda carta` | Borde inferior | Día 14 → `null` |
| `getAlertaResumen > naranja a los 30 dias o mas de la primera carta sin segunda` | Naranja | 1ª carta hace 35 días |
| `getAlertaResumen > naranja en el limite exacto de 30 dias` | Borde `>= 30` | Día 30 exacto |
| `getAlertaResumen > no es naranja con 29 dias de la primera carta` | Borde inferior | Día 29 → `null` |
| `getAlertaResumen > no hay alerta si la primera carta se envio hace poco` | Reciente | 3 días → `null` |
| `getAlertaResumen > una segunda carta reciente desactiva la alerta naranja` | La 2ª carta corta el conteo | 1ª hace 100 días + 2ª hace 2 → `null` |
| `getAlertaResumen > roja gana sobre naranja de otro familiar` | Precedencia | Un naranja + un rojo → rojo |
| `getAlertaResumen > roja gana sobre naranja aunque el naranja aparezca primero` | El orden no importa | Invierte |
| `getAlertaResumen > un familiar con resultado de contacto distinto de aceptar se ignora` | "No responde" | Aunque tenga 2ª carta vieja → `null` |
| `getAlertaResumen > un familiar que rechaza participacion no genera alerta` | "Rechaza participación" | `null` |
| `getAlertaResumen > un familiar fallecido se ignora` | "Fallecido" | `null` |
| `getAlertaResumen > una notificacion sin ninguna carta no alerta` | Sin fechas | `null` |
| `getAlertaResumen > combina varios familiares sin alerta en null` | Ninguno dispara | Tres notificaciones neutras → `null` |

### 2.6 `e2p-utils.test.ts` — 37 casos

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `RANGOS_ETARIOS > cubre los ocho rangos sin huecos ni solapamientos` | Integridad de la tabla | Recorre y comprueba `minMeses === anterior.maxMeses + 1`; extremos 0 y 204 |
| `RANGOS_ETARIOS > sus nombres coinciden con los que acepta el backend` | No se desincroniza del backend | `toEqual` de los 8 identificadores |
| `ageToRangoEtario > devuelve null sin fecha de nacimiento` | `null` | — |
| `ageToRangoEtario > con una fecha invalida cae al ultimo rango` | **Defecto F2**, comportamiento actual | `"no-es-fecha"` y `"2024-13-45"` → `13-17_anos` |
| `ageToRangoEtario > DEFECTO: una fecha invalida deberia devolver null...` **(it.fails)** | El defecto, declarado | Afirma `null`; hoy falla |
| `ageToRangoEtario > bordes de cada rango > nacido 2024-01-15 evaluado X -> Y` (×16) | **Todos los bordes de mes** | `it.each` con los 16 pares: 0, 3, 4, 10, 11, 18, 19, 36, 37, 60, 61, 84, 85, 144, 145 y 204 meses |
| `ageToRangoEtario > por encima del ultimo rango se queda en 13-17_anos` | Saturación superior | 205 meses y un nacimiento del año 2000 |
| `ageToRangoEtario > con la evaluacion antes del nacimiento usa el primer rango` | Meses negativos | Nacimiento posterior a la evaluación |
| `ageToRangoEtario > ignora el dia del mes: solo compara ano y mes` | Sólo año/mes | Nacimiento el 31 y evaluación el 1 del mismo mes → 0 meses |
| `ageToRangoEtario > cambia de rango al cambiar el mes, no el dia` | Borde de mes | 1 ene vs 30 abr → `0-3_meses`; 31 ene vs 1 may → `4-10_meses` |
| `ageToRangoEtario > cubre todos los meses de 0 a 204 con algun rango` | Exhaustividad | Bucle de 205 iteraciones: ningún mes queda sin rango |
| `formatRangoEtario > traduce los ocho rangos a etiquetas legibles` | 4 etiquetas | Incluye "3 a 5 años" |
| `formatRangoEtario > devuelve el valor original si no lo conoce` | Fallback | `99-100_anos` y `""` |
| `formatDate > devuelve un guion largo sin fecha` | `null` → `"—"` | — |
| `formatDate > formatea en es-CL sin corrimiento de zona` | Zona horaria | 1 ene y 31 dic |
| `formatDate > formatea correctamente el primer dia de cada mes` | 12 iteraciones | Evita que un día 1 se muestre como el último del mes anterior |
| `getLikertLabel > traduce los cinco valores de la escala` | 0–4 | Etiquetas exactas |
| `getLikertLabel > devuelve un guion largo fuera de la escala` | 5, −1 y 1.5 | `"—"` |
| `getLikertLabel > LIKERT_OPTIONS tiene los cinco valores en orden` | Orden | `[0,1,2,3,4]` |
| `mapas de colores > cubre las cuatro dimensiones del instrumento` | `CATEGORY_COLORS` | Claves ordenadas |
| `mapas de colores > cubre las tres zonas de frecuencia` | `ZONE_COLORS` | Claves ordenadas |
| `mapas de colores > cubre los tres perfiles de resultado global` | `RESULTADO_STYLES` | Claves ordenadas |

### 2.7 `ncfas-utils.test.ts` — 18 casos

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `MOMENTOS > son los tres que acepta el backend` | Ingreso/Intermedio/Cierre | `[...MOMENTOS]` |
| `PUNTAJE_OPCIONES > cubre el catalogo cerrado de puntajes` | 8 valores | `+2 +1 0 -1 -2 -3 N/A DN` en orden |
| `PUNTAJE_OPCIONES > todas las opciones tienen etiqueta` | Coherencia | Etiqueta no vacía y contiene el valor |
| `dimensiones > las de servicios generales son A a H` | Rango | `["A"..."H"]` |
| `dimensiones > las de reunificacion son I y J` | Rango | `["I","J"]` |
| `dimensiones > no se solapan` | Intersección vacía | Filtro de comunes |
| `isDimensionVisible > las dimensiones de servicios generales siempre se ven` | 8 × 2 combinaciones | Con y sin reunificación |
| `isDimensionVisible > las de reunificacion solo se ven en un NCFAS de reunificacion` | Condicional | `true`/`false` según el flag |
| `isDimensionVisible > una letra desconocida nunca se ve` | `K Z "" a AA` | Siempre `false` |
| `isDimensionVisible > distingue mayusculas de minusculas` | Case-sensitive | `"a"` e `"i"` → `false` |
| `makeItemKey > une la letra y el numero con guion bajo` | Formato | `A_1`, `J_6` |
| `makeItemKey > coincide con el formato que espera el backend` | Paridad con `_make_item_key` | `H_8` |
| `makeItemKey > acepta numeros de dos cifras` | Borde | `A_10` |
| `buildEmptyRespuestas > inicializa los tres momentos vacios` | Estructura | Claves y `{}` interno |
| `buildEmptyRespuestas > devuelve un objeto nuevo cada vez` | Sin estado compartido | Muta uno y comprueba el otro |
| `buildEmptyRespuestas > los momentos internos tampoco se comparten` | Sin aliasing | Muta `Ingreso` y comprueba `Intermedio`/`Cierre` |
| `formatDate > devuelve un guion largo sin fecha` | `null` | — |
| `formatDate > formatea en es-CL sin corrimiento de zona` | Zona horaria | 1 ene y 15 jun |

### 2.8 `busqueda-familiar-utils.test.ts` — 8 casos

| Prueba | Qué verifica | Cómo |
|---|---|---|
| `RESULTADOS_CONTACTO > es el catalogo cerrado que usa el formulario` | 4 valores | `[...RESULTADOS_CONTACTO]` |
| `RESULTADOS_CONTACTO > incluye el valor que dispara la alerta verde` | Acoplamiento con `getAlertaResumen` | Contiene "Acepta evaluación" |
| `formatDate > devuelve un guion largo sin fecha` | `null` y `""` | — |
| `formatDate > formatea en es-CL sin corrimiento de zona` | Zona horaria | 1 ene y 31 dic |
| `diasDesde > devuelve null sin fecha` | `null` y `""` | — |
| `diasDesde > devuelve 0 para hoy` | Borde | `iso(0)` |
| `diasDesde > cuenta los dias transcurridos` | 1, 15 y 30 | Tres comprobaciones |
| `diasDesde > devuelve negativo para una fecha futura` | Signo | `iso(-3)` → −3 |

---

## 3. Pruebas que fallan a propósito

Sólo dos, ambas del frontend, y son la forma de dejar constancia de un defecto sin
arreglarlo. El backend no tiene ninguna hoy: las dos que documentaban el defecto
B1 se convirtieron en aserciones normales al arreglarlo.

| Prueba | Defecto | Qué pasaría al arreglarlo |
|---|---|---|
| `utils.test.ts > iniciales > DEFECTO: ...` | F1 | Pasaría y Vitest lo marca como "expected fail" inesperado |
| `e2p-utils.test.ts > ageToRangoEtario > DEFECTO: ...` | F2 | Ídem |

El resto de los defectos (B2–B12, F3) están fijados con el marcador
`@pytest.mark.characterization` o comentario equivalente: prueban el
comportamiento **actual** y por eso pasan hoy.

---

## 4. Cómo auditar cualquier caso

```bash
# Ver la lista completa de identificadores
docker compose --profile test run --rm backend-tests pytest --collect-only -o addopts=""

# Ejecutar un caso concreto y leer su salida
docker compose --profile test run --rm backend-tests pytest \
  "tests/test_e2p_scoring.py::test_determinar_resultado" -v

# Ver qué hace por dentro, con asserts detallados
docker compose --profile test run --rm backend-tests pytest \
  "tests/test_caso_cerrado.py::test_escritura_sobre_registro_de_caso_cerrado_devuelve_409" -vv

# Frontend: un archivo o un caso
cd frontend
pnpm exec vitest run tests/api.test.ts
pnpm exec vitest run -t "en 401 limpia la sesion"
```

Los nombres del backend siguen `test_<qué>_<condición>`; para localizar el código
de cualquier caso, el nombre del archivo y el identificador bastan para
encontrarlo con una búsqueda literal en `backend/tests/` o `frontend/tests/`.
