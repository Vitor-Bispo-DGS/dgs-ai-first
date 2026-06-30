import type { QueryResponse } from "../../src/shared/types.js";

export const expectedDevolutionResponse: QueryResponse = {
  answer:
    "A NovaTech aceita devoluções em até 30 dias após a entrega. Para produtos danificados no transporte, o prazo é 7 dias.",
  source_document: ["POL-001-politica-devolucao"],
  confidence_score: 0.95,
};

export const expectedSLAResponse: QueryResponse = {
  answer: "Clientes Platinum têm SLA de 24h para capitais e 48h para demais regiões.",
  source_document: ["SLA-2024-tabela-sla-clientes"],
  confidence_score: 0.88,
};
