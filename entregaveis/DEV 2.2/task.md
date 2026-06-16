# Tasks — Query Endpoint

> Derivadas do plano de implementação `plan.md`.
> Estimativas: **P** (≤ 2h) · **M** (meio dia) · **G** (1–2 dias)

---

## TASK-001 · Scaffold da Azure Function HTTP Trigger

**Descrição**
Criar a estrutura inicial da Azure Function v4 em TypeScript para o endpoint `POST /api/query`, com roteamento, handler vazio e configuração do projeto (tsconfig, package.json, host.json).

**Critérios de aceite**
- Projeto compila sem erros com `tsc --noEmit`.
- `POST /api/query` retorna HTTP 200 com body `{ "status": "ok" }` ao rodar localmente com `func start`.
- `host.json` configurado para Azure Functions v4.
- `.gitignore` e `local.settings.json.example` presentes.

**Dependências**
- Nenhuma.

**Estimativa:** M

---

## TASK-002 · Validação de Input com Zod

**Descrição**
Definir e aplicar o schema Zod para o body do `POST /api/query`, garantindo que campos obrigatórios (ex.: `question: string`) sejam validados antes de qualquer processamento.

**Critérios de aceite**
- Requisição com body inválido retorna HTTP 400 com mensagem de erro estruturada.
- Requisição válida passa para o próximo middleware/handler sem erros.
- Schema exportado e coberto por testes unitários (≥ 2 casos: válido e inválido).

**Dependências**
- TASK-001

**Estimativa:** P

---

## TASK-003 · Integração com Azure OpenAI — Geração de Embedding

**Descrição**
Implementar a função `getEmbedding(question: string): Promise<number[]>` que chama o Azure OpenAI Embeddings API e retorna o vetor da pergunta recebida.

**Critérios de aceite**
- Função retorna array de floats com a dimensão correta do modelo configurado.
- Variáveis de ambiente (`AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`) documentadas em `local.settings.json.example`.
- Retry com exponential backoff implementado (≥ 3 tentativas, backoff 2×).
- Erros de API são logados via `pino` e relançados como erros tipados.

**Dependências**
- TASK-001

**Estimativa:** M

---

## TASK-004 · Integração com Azure AI Search — Busca Semântica (top-5)

**Descrição**
Implementar a função `searchChunks(embedding: number[]): Promise<Chunk[]>` que consulta o índice do Azure AI Search via vector search e retorna os 5 chunks mais relevantes com seus metadados (`content`, `source_document`, `vigencia`).

**Critérios de aceite**
- Retorna exatamente 5 chunks (ou menos se o índice tiver menos resultados).
- Campo `source_document` presente em todos os chunks retornados.
- Variáveis de ambiente (`AZURE_SEARCH_ENDPOINT`, `AZURE_SEARCH_API_KEY`, `AZURE_SEARCH_INDEX_NAME`) documentadas.
- Retry com exponential backoff implementado (≥ 3 tentativas).
- Erros logados via `pino`.

**Dependências**
- TASK-001

**Estimativa:** M

---

## TASK-005 · Leitura e Versionamento do System Prompt

**Descrição**
Implementar utilitário que lê o conteúdo de `/prompts/system-prompt.md` em tempo de inicialização da função e o disponibiliza para montagem do prompt final.

**Critérios de aceite**
- System prompt lido uma única vez no cold start (sem re-leitura a cada request).
- Erro de leitura (arquivo ausente) faz a função falhar com mensagem clara no log.
- Caminho do arquivo configurável via variável de ambiente `SYSTEM_PROMPT_PATH` (com default `/prompts/system-prompt.md`).

**Dependências**
- TASK-001

**Estimativa:** P

---

## TASK-006 · Montagem do Prompt com Context Budget

**Descrição**
Implementar a função `buildPrompt(systemPrompt, chunks, question)` que monta o prompt final respeitando o context budget definido na ADR-0002 (~4K tokens para system prompt, ~8K tokens para chunks, pergunta).

**Critérios de aceite**
- Chunks são truncados ou omitidos se o total exceder 8K tokens.
- A ordem de prioridade no truncamento respeita o metadado de vigência (ADR-0003): documentos mais recentes têm precedência.
- Função coberta por testes unitários com casos de: budget ok, budget estourado por chunks, budget estourado por system prompt.
- Nenhum chunk é cortado ao meio (truncamento sempre em boundary de chunk).

**Dependências**
- TASK-003, TASK-004, TASK-005

**Estimativa:** M

---

## TASK-007 · Integração com GPT-4o — Chamada de Completions

**Descrição**
Implementar a função `getChatCompletion(prompt): Promise<string>` que envia o prompt montado ao Azure OpenAI Chat Completions (GPT-4o) e retorna a resposta em texto.

**Critérios de aceite**
- Variável de ambiente `AZURE_OPENAI_CHAT_DEPLOYMENT` documentada.
- Retry com exponential backoff implementado (≥ 3 tentativas).
- Timeout configurável via variável de ambiente `CHAT_TIMEOUT_MS` (default 30s).
- Erros logados via `pino` com request ID para rastreabilidade.

**Dependências**
- TASK-001

**Estimativa:** M

---

## TASK-008 · Montagem e Retorno do Response com `source_document`

**Descrição**
Integrar todas as funções no handler principal do endpoint, retornando a resposta ao atendente no formato `{ answer: string, source_documents: string[] }`.

**Critérios de aceite**
- Response inclui `answer` (string) e `source_documents` (array de strings únicas com os nomes dos documentos usados nos chunks).
- HTTP 200 em caso de sucesso.
- HTTP 500 em caso de erro interno, com body `{ "error": "internal_error" }` (sem vazar detalhes internos).
- Schema de output validado com Zod antes de retornar.

**Dependências**
- TASK-002, TASK-006, TASK-007

**Estimativa:** P

---

## TASK-009 · Structured Logging com Pino

**Descrição**
Configurar o `pino` como logger centralizado da função, padronizando os campos de log (request ID, duração, etapa, erro) em todos os módulos.

**Critérios de aceite**
- Cada request gera um `requestId` único (UUID v4) propagado em todos os logs da requisição.
- Logs emitidos nas etapas: recebimento da request, geração de embedding, busca no Search, chamada ao GPT-4o, retorno da resposta.
- Duração de cada etapa logada em ms.
- Log de erro inclui stack trace e `requestId`.
- Nível de log configurável via variável de ambiente `LOG_LEVEL` (default `info`).

**Dependências**
- TASK-001

**Estimativa:** M

---

## TASK-010 · Testes de Integração End-to-End (local)

**Descrição**
Criar suite de testes de integração que sobe a função localmente (ou via mocks) e valida o fluxo completo `POST /api/query` → resposta com `answer` e `source_documents`.

**Critérios de aceite**
- Pelo menos 3 cenários cobertos: pergunta válida, body inválido (400), falha simulada no Azure OpenAI (500).
- Testes executam com `npm test` sem dependência de serviços Azure reais (uso de mocks/stubs).
- Pipeline CI configurado (ex.: GitHub Actions) rodando os testes em PRs.

**Dependências**
- TASK-008, TASK-009

**Estimativa:** G

---

## Resumo

| ID       | Título resumido                        | Estimativa | Depende de               |
|----------|----------------------------------------|------------|--------------------------|
| TASK-001 | Scaffold Azure Function                | M          | —                        |
| TASK-002 | Validação de Input (Zod)               | P          | 001                      |
| TASK-003 | Embedding via Azure OpenAI             | M          | 001                      |
| TASK-004 | Busca no Azure AI Search               | M          | 001                      |
| TASK-005 | Leitura do System Prompt               | P          | 001                      |
| TASK-006 | Montagem do Prompt (context budget)    | M          | 003, 004, 005            |
| TASK-007 | Completions GPT-4o                     | M          | 001                      |
| TASK-008 | Response com `source_document`         | P          | 002, 006, 007            |
| TASK-009 | Structured Logging (pino)              | M          | 001                      |
| TASK-010 | Testes de Integração E2E               | G          | 008, 009                 |
