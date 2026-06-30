## Foundation

### `typescript-conventions.md`
| Campo | Valor |
|---|---|
| **Nome** | TypeScript Conventions |
| **Descrição** | Define os padrões obrigatórios de escrita TypeScript no projeto: configuração strict, convenções de nomenclatura, uso de tipos vs interfaces, organização de imports e regras de linting. É a referência base que garante consistência em todo código gerado. |
| **Quem cria** | Tech Lead |
| **Quem consome** | Copilot (inline completion em todo `.ts`/`.tsx`), Claude Code (geração de novos arquivos) |
| **Frequência** | **Alta** — pré-requisito implícito de toda geração de código; ativada em cada novo arquivo |

---

### `error-handling.md`
| Campo | Valor |
|---|---|
| **Nome** | Error Handling |
| **Descrição** | Estabelece a estratégia de tratamento de erros do projeto: hierarquia de custom errors, como erros de serviços externos (Azure AI Search, Azure OpenAI) devem ser capturados e propagados, e o contrato de resposta HTTP em casos de falha. |
| **Quem cria** | Tech Lead + Dev Sênior |
| **Quem consome** | Copilot (autocomplete em try/catch e respostas HTTP), Claude Code (revisão e completude de módulos) |
| **Frequência** | **Alta** — toda função que acessa Azure AI Search, Azure OpenAI ou processa documentos |

---

### `project-structure.md`
| Campo | Valor |
|---|---|
| **Nome** | Project Structure |
| **Descrição** | Documenta a árvore de diretórios do repositório e as regras de localização de artefatos: onde vive cada tipo de arquivo (handlers, services, tests, specs), como nomear módulos e pastas, e quais convenções de organização seguir ao criar novos componentes. |
| **Quem cria** | Tech Lead |
| **Quem consome** | Claude Code (orientação de localização antes de qualquer geração), Copilot (referência em onboarding) |
| **Frequência** | **Média** — ativada no início de cada novo módulo e durante onboarding de devs |

---

## Domain

### `azure-functions-endpoint.md`
| Campo | Valor |
|---|---|
| **Nome** | Azure Functions Endpoint |
| **Descrição** | Descreve o padrão de construção de endpoints HTTP no projeto: estrutura de um Azure Function trigger, como aplicar validação de input com Zod, como montar o objeto de resposta padronizado e como registrar logs via pino. |
| **Quem cria** | Dev Sênior |
| **Quem consome** | Claude Code (scaffolding dos handlers), Copilot (completar `validator.ts` e `response-builder.ts`) |
| **Frequência** | **Média** — 3 endpoints no projeto (query, feedback, health); padrão reutilizado por ambos os devs |

---

### `azure-ai-search-integration.md`
| Campo | Valor |
|---|---|
| **Nome** | Azure AI Search Integration |
| **Descrição** | Especifica como o projeto se integra ao Azure AI Search: configuração do client SDK, estrutura dos índices de documentos, como montar queries de busca vetorial com filtros de metadado de vigência e como interpretar e mapear os resultados retornados. |
| **Quem cria** | Tech Lead + Dev Sênior |
| **Quem consome** | Claude Code (gera `search.ts` e `indexer.ts`), Copilot (autocompletar chamadas SDK) |
| **Frequência** | **Média** — 2 pontos de integração distintos: retrieval no query-endpoint e indexação no pipeline |

---

### `react-components.md`
| Campo | Valor |
|---|---|
| **Nome** | React Components |
| **Descrição** | Define os padrões de construção de componentes React no painel web: estrutura de arquivos por componente, convenções de props e tipagem, uso de hooks, padrões de estilização e regras de composição entre componentes de UI. |
| **Quem cria** | Dev Pleno |
| **Quem consome** | Copilot (inline em `src/web/src/components/`), Claude Code (geração de páginas completas) |
| **Frequência** | **Média** — repetida a cada componente do painel (métricas, histórico, filtros) |

---

### `testing-patterns.md`
| Campo | Valor |
|---|---|
| **Nome** | Testing Patterns |
| **Descrição** | Estabelece as três camadas de teste do projeto e suas regras: unitários com mocks totais via vitest, integração com msw para simular Azure AI Search e Azure OpenAI, e e2e com consumo real de tokens. Define também a estrutura de fixtures compartilhadas e os critérios de cobertura esperados por módulo. |
| **Quem cria** | QA + Dev Sênior |
| **Quem consome** | Claude Code (geração de suites completas), Copilot (completar casos individuais), QA (referência de padrão msw/vitest) |
| **Frequência** | **Alta** — todo módulo exige testes; ativada em paralelo com cada artifact skill |

---

## Artifact

### `create-rag-endpoint.md`
| Campo | Valor |
|---|---|
| **Nome** | Create RAG Endpoint |
| **Descrição** | Receita completa para gerar o fluxo RAG do assistente: como orquestrar retrieval no Azure AI Search (5 chunks, budget de ~8K tokens), montagem do prompt com system prompt + chunks + histórico (até 3 turnos), chamada ao Azure OpenAI GPT-4o e construção da resposta com indicação de fonte. Cobre todos os arquivos de `src/functions/query/` e `src/services/`. |
| **Quem cria** | Tech Lead + Dev Sênior |
| **Quem consome** | Claude Code (tarefa de maior complexidade — orquestra `search.ts`, `completion.ts`, `prompt-builder.ts`, `handler.ts`) |
| **Frequência** | **Baixa** — acionada uma vez para o módulo `query-endpoint`; é a skill de maior peso do projeto |

---

### `create-integration-test.md`
| Campo | Valor |
|---|---|
| **Nome** | Create Integration Test |
| **Descrição** | Receita para gerar suites de teste de integração entre módulos internos: como configurar msw para interceptar chamadas ao Azure AI Search e Azure OpenAI, como usar os fixtures de `tests/fixtures/` (chunks, queries, respostas esperadas) e como estruturar os cenários de sucesso, falha parcial e timeout. |
| **Quem cria** | QA + Dev Sênior |
| **Quem consome** | Claude Code (gera suites em `tests/integration/`), Copilot (adiciona casos de borda) |
| **Frequência** | **Média** — uma chamada por módulo testável (query-endpoint, feedback-api, pipeline-ingestao) |

---

### `create-react-card.md`
| Campo | Valor |
|---|---|
| **Nome** | Create React Card |
| **Descrição** | Receita dual para gerar cards de apresentação de respostas: componentes React para o painel web (estrutura, props, tipagem) e Adaptive Cards TypeScript para o Teams bot (schema de card, actions de feedback, binding de dados da resposta do assistente). |
| **Quem cria** | Dev Pleno |
| **Quem consome** | Copilot (componentes React no painel web), Claude Code (Adaptive Cards TypeScript do bot — `response-card.ts`, `feedback-card.ts`) |
| **Frequência** | **Baixa-Média** — 2 cards fixos no Teams + número variável de componentes no painel conforme o painel-web evolui |