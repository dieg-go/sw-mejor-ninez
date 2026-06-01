import React from "react";

const faqs = [
  {
    question: "¿Qué es Mejor Niñez?",
    answer:
      "Mejor Niñez es una plataforma dedicada a brindar apoyo y recursos para el bienestar infantil y el acompañamiento familiar.",
  },
  {
    question: "¿Cómo puedo obtener ayuda?",
    answer:
      "Puedes explorar los servicios disponibles en el sitio y contactarnos a través del formulario de contacto o los datos que aparecen en la sección de contacto.",
  },
  {
    question: "¿Quién puede acceder a los recursos?",
    answer:
      "Los recursos están dirigidos a familias, niños, niñas y adolescentes que necesiten orientación o apoyo en temas de salud, educación y protección.",
  },
  {
    question: "¿Hay costos para acceder a la información?",
    answer:
      "La mayoría de los recursos e información en el sitio son gratuitos. Algunos servicios específicos pueden tener condiciones especiales.",
  },
];

export default function FAQPage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "Arial, sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Preguntas Frecuentes</h1>
      <p style={{ marginBottom: "2rem", color: "#555" }}>
        Encuentra respuestas rápidas a las dudas más comunes sobre Mejor Niñez.
      </p>
      <section>
        {faqs.map((item, index) => (
          <article
            key={index}
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "#f9f9f9",
            }}
          >
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>{item.question}</h2>
            <p style={{ margin: 0, color: "#333" }}>{item.answer}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
