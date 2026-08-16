from app.api.routes.nna import router as nna_router
from app.api.routes.casos import casos_router, nna_casos_router
from app.api.routes.familiares import router as familiares_router, familiar_penal_router
from app.api.routes.children import (
    consumo_nna_router,
    consumo_adulto_router,
    consumo_nna_item_router,
    consumo_adulto_item_router,
    disc_nna_router,
    disc_adulto_router,
    disc_nna_item_router,
    disc_adulto_item_router,
    penal_item_router,
)
from app.api.routes.ingreso import (
    causal_item_router,
    causal_router,
    derecho_item_router,
    derecho_router,
    doc_ingreso_item_router,
    doc_ingreso_router,
    ingreso_item_router,
    ingresos_router,
)
from app.api.routes.historial import (
    alerta_router,
    informe_item_router,
    informe_router,
    red_item_router,
    red_router,
)
from app.api.routes.busqueda_familiar import (
    despeje_router,
    despeje_item_router,
    notificacion_router,
    notificacion_item_router,
)
from app.api.routes.e2p import (
    e2p_familiar_router,
    e2p_item_router,
    e2p_questions_router,
    e2p_router,
)
from app.api.routes.pmf import (
    pmf_familiar_router,
    pmf_item_router,
    pmf_questions_router,
    pmf_router,
)
from app.api.routes.ncfas import (
    ncfas_comentarios_router,
    ncfas_familiar_router,
    ncfas_item_router,
    ncfas_items_router,
    ncfas_router,
)
from app.api.routes.antecedentes import (
    vinculo_item_router,
    vinculo_router,
    escolar_item_router,
    escolar_router,
    familiar_item_router,
    familiar_router,
    salud_item_router,
    salud_router,
)
from app.api.routes.auth import auth_router
from app.api.routes.upload import router as upload_router
from app.api.routes.solicitante import router as solicitante_router
from app.api.routes.establecimiento import router as establecimiento_router
from app.api.routes.centro_salud import router as centro_salud_router
from app.api.routes.vinculo_nna import vinculo_nna_router, vinculo_nna_item_router

routers = [
    nna_router,
    nna_casos_router,
    casos_router,
    familiares_router,
    familiar_penal_router,
    consumo_nna_router,
    consumo_adulto_router,
    consumo_nna_item_router,
    consumo_adulto_item_router,
    disc_nna_router,
    disc_adulto_router,
    disc_nna_item_router,
    disc_adulto_item_router,
    penal_item_router,
    ingresos_router,
    ingreso_item_router,
    causal_router,
    causal_item_router,
    derecho_router,
    derecho_item_router,
    doc_ingreso_router,
    doc_ingreso_item_router,
    red_router,
    red_item_router,
    despeje_router,
    despeje_item_router,
    notificacion_router,
    notificacion_item_router,
    informe_router,
    informe_item_router,
    alerta_router,
    e2p_router,
    e2p_item_router,
    pmf_router,
    pmf_questions_router,
    pmf_item_router,
    ncfas_router,
    ncfas_items_router,
    ncfas_comentarios_router,
    ncfas_item_router,
    e2p_familiar_router,
    e2p_questions_router,
    pmf_familiar_router,
    ncfas_familiar_router,
    salud_router,
    salud_item_router,
    escolar_router,
    escolar_item_router,
    familiar_router,
    familiar_item_router,
    vinculo_router,
    vinculo_item_router,
    solicitante_router,
    establecimiento_router,
    centro_salud_router,
    vinculo_nna_router,
    vinculo_nna_item_router,
    upload_router,
]
