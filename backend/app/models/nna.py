import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.consumo import HistorialConsumoNNA
    from app.models.discapacidad import DiscapacidadNNA
    from app.models.ingreso import AntecedenteIngreso, DocumentacionIngreso
    from app.models.historial import HistorialRedProteccional, GestionBusquedaFamiliar, InformeTribunal
    from app.models.e2p import E2P
    from app.models.pmf import PMF
    from app.models.ncfas import NCFAS
    from app.models.antecedentes import AntecedenteSalud, AntecedenteEscolar, AntecedenteFamiliar


class NNA(SQLModel, table=True):
    __tablename__ = "NNA"

    id_nna: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    nombre: Optional[str] = None
    run: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    sexo: Optional[str] = None
    etnia_declarada: Optional[str] = None
    nacionalidad: Optional[str] = None
    domicilio: Optional[str] = None
    poblacion_o_villa: Optional[str] = None
    comuna: Optional[str] = None
    region: Optional[str] = None

    historial_consumo: list["HistorialConsumoNNA"] = Relationship(back_populates="nna")
    discapacidades: list["DiscapacidadNNA"] = Relationship(back_populates="nna")
    antecedentes_ingreso: list["AntecedenteIngreso"] = Relationship(back_populates="nna")
    documentacion_ingreso: list["DocumentacionIngreso"] = Relationship(back_populates="nna")
    historial_red_proteccional: list["HistorialRedProteccional"] = Relationship(back_populates="nna")
    gestiones_busqueda: list["GestionBusquedaFamiliar"] = Relationship(back_populates="nna")
    informes_tribunal: list["InformeTribunal"] = Relationship(back_populates="nna")
    evaluaciones_e2p: list["E2P"] = Relationship(
        back_populates="nna",
        sa_relationship_kwargs={"foreign_keys": "E2P.id_nna"},
    )
    evaluaciones_pmf: list["PMF"] = Relationship(
        back_populates="nna",
        sa_relationship_kwargs={"foreign_keys": "PMF.id_nna"},
    )
    evaluaciones_ncfas: list["NCFAS"] = Relationship(
        back_populates="nna",
        sa_relationship_kwargs={"foreign_keys": "NCFAS.id_nna"},
    )
    antecedentes_salud: list["AntecedenteSalud"] = Relationship(back_populates="nna")
    antecedentes_escolares: list["AntecedenteEscolar"] = Relationship(back_populates="nna")
    antecedentes_familiares: list["AntecedenteFamiliar"] = Relationship(back_populates="nna")
