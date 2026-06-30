export const validQueries = [
  "Qual é o prazo de devolução de produtos?",
  "Qual o SLA de entrega para clientes Platinum?",
  "Como solicitar frete especial para cargas pesadas?",
  "Qual o horário de atendimento?",
];

export const invalidQueryBodies = [
  {},
  { question: "" },
  { question: 123 },
  null,
  "string_instead_of_object",
  { pergunta: "wrong field name" },
];
