from app.models.nna import NNA
from app.models.familiar import Familiar, AntecedentesPenales
from app.models.consumo import HistorialConsumoNNA, HistorialConsumoAdulto
from app.models.discapacidad import DiscapacidadNNA, DiscapacidadAdulto
from app.models.ingreso import (
    AntecedenteIngreso,
    DocumentacionIngreso,
    RegistroCausalIngreso,
    RegistroDerechoVulnerado,
)
from app.models.historial import GestionBusquedaFamiliar, HistorialRedProteccional, InformeTribunal
from app.models.e2p import E2P, PreguntaE2P, RespuestaE2P, BaremoE2P, PuntajeE2P
from app.models.pmf import PMF, PreguntaPMF, RespuestaPMF
from app.models.ncfas import NCFAS
from app.models.antecedentes import (
    AntecedenteEscolar,
    AntecedenteFamiliar,
    AntecedenteSalud,
    VinculoFamiliar,
)
from app.models.usuario import Usuario
from app.models.solicitante import SolicitanteIngreso
from app.models.establecimiento import EstablecimientoEducacional
from app.models.centro_salud import CentroSalud
from app.models.registro_grupo_familiar import RegistroGrupoFamiliar
from app.models.vinculo_nna import VinculoNNA

__all__ = [
    "NNA",
    "Familiar",
    "AntecedentesPenales",
    "HistorialConsumoNNA",
    "HistorialConsumoAdulto",
    "DiscapacidadNNA",
    "DiscapacidadAdulto",
    "AntecedenteIngreso",
    "DocumentacionIngreso",
    "RegistroCausalIngreso",
    "RegistroDerechoVulnerado",
    "HistorialRedProteccional",
    "GestionBusquedaFamiliar",
    "InformeTribunal",
    "E2P",
    "PreguntaE2P",
    "RespuestaE2P",
    "BaremoE2P",
    "PuntajeE2P",
    "PMF",
    "PreguntaPMF",
    "RespuestaPMF",
    "NCFAS",
    "AntecedenteSalud",
    "AntecedenteEscolar",
    "AntecedenteFamiliar",
    "VinculoFamiliar",
    "Usuario",
    "SolicitanteIngreso",
    "EstablecimientoEducacional",
    "CentroSalud",
    "RegistroGrupoFamiliar",
    "VinculoNNA",
]
