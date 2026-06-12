export const CATALOGO_CAUSALES = [
  "Vulneración en esfera de la sexualidad",
  "Conductas de prácticas abusivas sexuales PAS",
  "Explotación sexual infantil ESCI",
  "Grooming",
  "Bullyng",
  "Violencia Intrafamiliar directa o vicaria",
  "Maltrato",
  "Negligencia parental o del adulto responsable",
  "Inhabilidad parental o del adulto responsable",
  "Trabajo infantil",
  "Situación calle",
  "Derivación socioeconómica",
  "Solicitud NNA",
  "Deserción escolar",
  "Conductas disruptivas asociadas a infracciones de Ley",
  "Con / sin diagnóstico",
  "Consumo de drogas",
];

export const CATALOGO_DERECHOS = [
    "Propiedad", 
    "Libertad de trabajo y seguridad social", 
    "Reunión asociación y sindicalización", 
    "Emitir opinión e informar", 
    "Libertad de enseñanza", 
    "Derecho a la educación", 
    "Protección de la salud", 
    "Medio ambiente libre de contaminación", 
    "Libertad personal y seguridad individual", 
    "Libertad de conciencia", 
    "Inviolabilidad hogar y comunicaciones", 
    "Vida privada y honra", 
    "Igual protección Ley", 
    "Igualdad ante la Ley", 
    "Vida e integridad física",
    "Supervivencia y desarrollo", 
    "Vida, supervivencia y desarrollo",
    "Dirección y orientación, autonomía", 
    "Interés Superior",
    "No discriminación", 
    "Nivel de vida adecuado",
    "Salud",
    "Libertad de expresión y asociación", 
    "Ser oído", 
    "No retención ni traslado", 
    "Reunificación familiar", 
    "No separación de padres", 
    "Identidad", 
    "Nombre, nacionalidad, conocer padres", 
    "Integridad Psíquica"
  
];

export const CATALOGO_DOCUMENTACION_INGRESO = [
  "Constatación de Lesiones", "Orden Judicial de Ingreso", "Certificado de Nacimiento", "Otro"
];

export const CATALOGO_PROGRAMAS_PREVIOS = [
  "Programa Prevencion Focalizada", 
  "Programa de Intervención Especializada", 
  "Programa de Diagnóstico Ambulatorio",
  "Programa de Reparación de Maltrato",
  "Otro"
]

export const CATALOGO_MOTIVO_EGRESO = [
  "Fracaso de la intervención ambulatoria", "Agravamiento o cronicidad de las vulneraciones", "Otro"
]

export function detectTipoCausa(rit: string): string | null {
  if (!rit) return null;
  const first = rit.charAt(0).toUpperCase();
  if (first === "P") return "Proteccional (P)";
  if (first === "X") return "Vulneración (X)";
  return null;
}
