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
from app.models.pmf import PMF
from app.models.ncfas import NCFAS
from app.models.antecedentes import (
    AntecedenteEscolar,
    AntecedenteFamiliar,
    AntecedenteSalud,
    VinculoFamiliar,
)

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
    "NCFAS",
    "AntecedenteSalud",
    "AntecedenteEscolar",
    "AntecedenteFamiliar",
    "VinculoFamiliar",
]
