import type { Chunk } from "../../src/shared/types.js";

export const mockChunks: Chunk[] = [
  {
    id: "chunk-001",
    content:
      "A NovaTech aceita devoluções em até 30 dias após a entrega, desde que o produto esteja em perfeitas condições e acompanhado da nota fiscal. Para produtos danificados no transporte, o prazo é de 7 dias a partir do recebimento.",
    source_document: "POL-001-politica-devolucao",
    vigencia: "2024-01-15",
    score: 0.95,
  },
  {
    id: "chunk-002",
    content:
      "Clientes Platinum têm SLA de entrega de 24h para capitais e 48h para demais regiões. Clientes Gold têm SLA de 48h para capitais e 72h para demais regiões.",
    source_document: "SLA-2024-tabela-sla-clientes",
    vigencia: "2024-03-01",
    score: 0.88,
  },
  {
    id: "chunk-003",
    content:
      "Para frete especial acima de 500kg, é necessário solicitar cotação prévia com 48h de antecedência. O processo deve ser iniciado pelo formulário PROC-042.",
    source_document: "PROC-042-v2-frete-especial-revisado",
    vigencia: "2024-06-01",
    score: 0.82,
  },
  {
    id: "chunk-004",
    content:
      "Frete especial para cargas acima de 500kg requer cotação em 72h de antecedência. (Versão anterior do procedimento — substituída pela v2)",
    source_document: "PROC-042-frete-especial-v1",
    vigencia: "2023-11-01",
    score: 0.79,
  },
  {
    id: "chunk-005",
    content:
      "O atendimento ao cliente opera de segunda a sexta das 8h às 18h e aos sábados das 9h às 13h. Em casos urgentes fora do horário comercial, o cliente deve ligar para o número de plantão.",
    source_document: "FAQ-atendimento",
    vigencia: "2024-02-01",
    score: 0.75,
  },
];

export const singleChunk: Chunk = mockChunks[0];
