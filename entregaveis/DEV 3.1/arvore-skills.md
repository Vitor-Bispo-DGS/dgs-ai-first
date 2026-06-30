## Árvore de Skills — NovaTech Assistant

### Legenda de consumo
- **[CONSUMIDA]** — ativada diretamente por um ou mais módulos do projeto
- **[GAP]** — módulo do projeto sem cobertura de skill

---

## Foundation — Convenções globais

| Skill | Consumida por | Justificativa |
|---|---|---|
| `typescript-conventions.md` | **Todos os 5 módulos** | Stack é TypeScript em todo o backend (functions, pipeline, bot) e React/TS no frontend. `tsconfig strict: true` exige convenções explícitas. |
| `error-handling.md` | query-endpoint, feedback-api, pipeline-ingestao, teams-bot | Azure Functions expõe erros HTTP; pipeline pode falhar em extração/indexação; bot deve tratar falhas do GPT-4o com graceful degradation. |
| `project-structure.md` | **Todos os 5 módulos** | Define onde novos arquivos devem ser criados (`src/functions/`, `src/services/`, `tests/`) — pré-requisito para qualquer geração de artefato. |

---

## Domain — Padrões por camada

| Skill | Consumida por | Justificativa |
|---|---|---|
| `azure-functions-endpoint.md` | query-endpoint, feedback-api | Padrão HTTP trigger + Zod validation + response shape. Cobre `handler.ts` + `validator.ts` dos dois módulos de endpoint. |
| `azure-ai-search-integration.md` | query-endpoint, pipeline-ingestao | query-endpoint usa para retrieval (5 chunks ~1.500 tokens, ADR-0002); pipeline-ingestao usa no `indexer.ts` para ingestão. |
| `react-components.md` | painel-web | Exclusivo do painel web React (`src/web/src/components/`, `pages/`). |
| `testing-patterns.md` | **Todos os 5 módulos** | Cobre as 3 camadas definidas no Anexo C: unit (mocks totais), integration (msw), e2e (fluxo completo com tokens reais). |

---

## Artifact — Receitas de geração específicas

| Skill | Módulo(s) que a disparam | O que gera |
|---|---|---|
| `create-rag-endpoint.md` | query-endpoint | `src/functions/query/handler.ts`, `validator.ts`, `response-builder.ts` + `src/services/search.ts`, `completion.ts`, `prompt-builder.ts` — fluxo RAG completo (retrieve → rank → augment → generate). |
| `create-integration-test.md` | query-endpoint, feedback-api, pipeline-ingestao | `tests/integration/` com msw para mockar Azure AI Search e Azure OpenAI; testa integração entre módulos internos. |
| `create-react-card.md` | painel-web, teams-bot | `src/web/src/components/` (React) + `src/bot/cards/response-card.ts` e `feedback-card.ts` (Adaptive Cards do Teams). |

---

## Mapa de consumo por módulo

```
query-endpoint      → typescript-conventions + error-handling + project-structure
                      azure-functions-endpoint + azure-ai-search-integration + testing-patterns
                      create-rag-endpoint + create-integration-test

feedback-api        → typescript-conventions + error-handling + project-structure
                      azure-functions-endpoint + testing-patterns
                      create-integration-test

pipeline-ingestao   → typescript-conventions + error-handling + project-structure
                      azure-ai-search-integration + testing-patterns
                      create-integration-test
                      ⚠️ GAP: sem artifact skill de geração de pipeline

teams-bot           → typescript-conventions + error-handling + project-structure
                      testing-patterns
                      create-react-card (só Adaptive Cards)
                      ⚠️ GAP: sem domain skill de Bot Framework / Teams

painel-web          → typescript-conventions + project-structure
                      react-components + testing-patterns
                      create-react-card
```

---

## Gaps identificados

Dois módulos do projeto não têm cobertura de artifact — os desenvolvedores precisarão improvisar sem receita:

| Gap | Módulo afetado | Skill ausente sugerida |
|---|---|---|
| Nenhuma receita para pipeline de extração + chunking + embedding | pipeline-ingestao | `artifact/create-ingestion-pipeline.md` |
| Nenhum padrão de Bot Framework (activity handlers, diálogo, proactive messages) | teams-bot | `domain/teams-bot-integration.md` |

As 10 skills definidas no Anexo C são **todas consumidas** — nenhuma é dead weight. Os dois gaps acima são módulos que vão para produção sem skill de cobertura, aumentando o risco de inconsistência no código gerado pelo agente.