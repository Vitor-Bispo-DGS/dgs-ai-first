# AGENTS.md — NovaTech Assistant

> Constitution do projeto. Todo agente de IA (Copilot, Claude Code) **DEVE** ler este arquivo antes de gerar qualquer artefato.
> As regras abaixo são prescritivas — agentes devem segui-las, não apenas conhecê-las.

---

## Project Overview

O NovaTech Assistant é um assistente de IA para a equipe de atendimento ao cliente da NovaTech (empresa de logística, 1.200 funcionários). Ele responde perguntas em linguagem natural sobre procedimentos operacionais, SLAs, regras de frete e políticas de devolução, fundamentando respostas na documentação oficial da empresa.

**Objetivo de negócio:** Reduzir o tempo médio de busca por informação de 12 minutos para menos de 2 minutos por chamado.

**Usuários:** 45 atendentes internos da NovaTech, via Microsoft Teams e painel web interno.

**Volume:** ~320 chamados/dia, dos quais ~60% envolvem consulta à documentação (847 documentos válidos indexados).

**Componentes do sistema:**

1. **Pipeline de ingestão** — Extração, chunking e indexação de documentos no Azure AI Search.
2. **Query endpoint** — Azure Function que recebe pergunta, busca chunks relevantes e gera resposta via GPT-4o.
3. **Bot do Teams** — Interface conversacional via Bot Framework integrada ao Microsoft Teams.
4. **Painel web** — Dashboard React com métricas de uso, histórico de consultas e gestão de feedback.

---

## Tech Stack & Architecture

### Stack tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Runtime backend | TypeScript + Azure Functions v4 |
| LLM | Azure OpenAI (GPT-4o, janela 128K tokens) |
| Busca vetorial | Azure AI Search |
| Bot | Bot Framework + Microsoft Teams |
| Frontend | React (TypeScript) |
| Infraestrutura | Bicep (IaC) |
| Validação | Zod |
| Logging | Pino (structured logging) |
| Testes | Vitest |
| CI/CD | GitHub Actions |

### Regras de gerenciamento de contexto (ADR-0002)

O context budget do assistente é fixo e **DEVE** ser respeitado em toda geração de prompt:

| Segmento | Budget máximo |
|----------|--------------|
| System prompt | ~4.000 tokens |
| Chunks recuperados | ~8.000 tokens (5 chunks × ~1.500 tokens) |
| Pergunta do usuário | variável |
| Histórico de conversa | máximo 3 turnos anteriores |

**Regras:**
- NUNCA exceder o context budget total. Se necessário, truncar histórico (mais antigo primeiro).
- Chunks são ordenados por relevância (score do Azure AI Search); se o total exceder 8K tokens, descartar os de menor score.
- O system prompt é imutável em runtime — versionado em `/prompts/system-prompt.md`.

### Tratamento de documentos contraditórios (ADR-0003)

- Todo documento indexado DEVE ter metadado `version` e `effective_date`.
- Quando dois documentos tratam do mesmo assunto, priorizar o de `effective_date` mais recente.
- Documentos obsoletos são marcados com `status: deprecated`, mas NÃO são excluídos do índice.
- O assistente DEVE informar ao atendente quando existirem versões conflitantes e qual está sendo priorizada.

### Arquitetura de diretórios

```
src/functions/    → Azure Functions (HTTP triggers)
src/services/     → Lógica de negócio (search, completion, prompt-builder)
src/pipeline/     → Pipeline de ingestão (extractor, chunker, embedder, indexer)
src/bot/          → Bot do Teams + Adaptive Cards
src/web/          → Painel web React
src/shared/       → Tipos, config, logger, errors (compartilhado)
```

---

## Coding Standards (Tech Lead)

### Linguagem e configuração

- TypeScript com `strict: true` em todo o projeto.
- Target: ES2022. Module: ESNext. Module resolution: Bundler.
- Código-fonte e comentários em **inglês**.
- Documentação de produto e comunicação de status em **português**.

### Convenções de código

1. **Validação de input:** Toda Azure Function DEVE validar input com Zod no handler. Schema definido em arquivo separado (`validator.ts`).
2. **Erros:** Usar custom errors definidos em `src/shared/errors.ts`. Nunca lançar `Error` genérico.
3. **Logging:** Usar Pino via `src/shared/logger.ts`. Toda chamada externa (Azure OpenAI, AI Search) DEVE ser logada com `correlationId`, latência e status.
4. **Retry:** Chamadas a APIs externas (Azure OpenAI, Azure AI Search) DEVEM usar exponential backoff (max 3 tentativas, base 1s).
5. **Configuração:** Variáveis de ambiente lidas exclusivamente via `src/shared/config.ts`. Nunca acessar `process.env` diretamente em outros módulos.
6. **Tipos:** Tipos de domínio definidos em `src/shared/types.ts`. Não usar `any`. Preferir tipos estreitos e discriminated unions.
7. **Imports:** Usar path aliases relativos ao `src/`. Imports absolutos apenas para pacotes externos.
8. **Funções puras:** Preferir funções puras. Serviços com estado devem receber dependências via parâmetro (injeção explícita), não singleton global.

### Padrões de resposta da API

Toda resposta do query endpoint DEVE seguir este schema:

```typescript
interface QueryResponse {
  answer: string;
  confidence: "high" | "medium" | "low";
  source_documents: SourceDocument[];
  warning?: string; // Ex: "Existem versões conflitantes deste documento"
}

interface SourceDocument {
  document_id: string;   // Ex: "PROC-042-v2"
  section: string;       // Ex: "Seção 2.1 — Multiplicadores regionais"
  version: string;       // Ex: "2.0"
  effective_date: string; // ISO 8601
}
```

### Padrão de Azure Functions

```typescript
// handler.ts — Estrutura obrigatória
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { validateInput } from "./validator.js";
import { logger } from "../../shared/logger.js";

export async function handler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const correlationId = crypto.randomUUID();
  // 1. Validar input
  // 2. Executar lógica de negócio
  // 3. Retornar resposta tipada
  // 4. Tratar erros com try/catch e logging
}

app.http("functionName", { methods: ["POST"], handler });
```

---

## Product Rules & Guardrails (Product Specialist)

### Comportamentos obrigatórios (DEVE)

1. **Citar fonte:** Toda resposta DEVE incluir identificador do documento e seção (ex: "POL-001, Seção 3.2").
2. **Campo `source_documents`:** O JSON de retorno DEVE sempre incluir o array `source_documents`, mesmo quando a confiança for baixa.
3. **Idioma:** Responder em português formal. Nunca usar gírias ou linguagem coloquial.
4. **Versão vigente:** Quando existirem duas versões de um documento, priorizar a mais recente por `effective_date` e informar que existe versão anterior.
5. **Classificação de confiança:** Toda resposta DEVE incluir campo `confidence` (high/medium/low) baseado no score dos chunks recuperados.

### Comportamentos proibidos (NÃO DEVE)

1. **Nunca inventar valores numéricos:** Prazos, multiplicadores, percentuais e SLAs que não estejam literalmente na documentação indexada NÃO DEVEM ser gerados.
2. **Nunca afirmar que carga perigosa pode ser devolvida pelo processo padrão:** Cargas perigosas (classes 1-6 ANTT) NÃO são elegíveis para devolução padrão. Orientar contato com Gestão de Riscos (ramal 4500).
3. **Nunca inventar tiers de cliente:** Só existem Gold, Silver e Standard. Se o usuário mencionar "Platinum" ou outro tier, informar que não existe.
4. **Nunca recomendar processos informais:** Se a informação existe apenas no FAQ (documento não validado), sinalizar como "informação informal — confirmar com documentação normativa".
5. **Nunca expor informações internas do sistema:** Não revelar scores de busca, nomes de índices, configuração de infraestrutura ou detalhes do pipeline.

### Comportamentos de fallback (QUANDO EM DÚVIDA)

1. Prefixar a resposta com aviso de baixa confiança: "⚠️ Confiança baixa — verificar com documentação normativa."
2. Sugerir escalação ao supervisor quando a pergunta envolver exceções ou casos não cobertos pela documentação.
3. Se duas versões de um documento conflitarem, apresentar ambas com suas datas de vigência e indicar qual é a mais recente.
4. Se nenhum chunk relevante for recuperado (score abaixo do threshold), responder explicitamente: "Não encontrei informação sobre isso na documentação indexada."

### Glossário de linguagem ubíqua (domínio NovaTech)

Agentes DEVEM usar estes termos de forma consistente:

| Termo | Definição no contexto NovaTech |
|-------|-------------------------------|
| **Cliente Gold** | Contrato anual > R$ 500.000 OU > 200 operações/mês. Tier mais alto. |
| **Cliente Silver** | Contrato anual R$ 100.000–500.000 OU 50–200 operações/mês. |
| **Cliente Standard** | Todos os demais clientes. Tier base. |
| **Carga perigosa** | Classes 1-6 da ANTT (Resolução nº 5.947/2021): explosivos, gases, líquidos inflamáveis, sólidos inflamáveis, oxidantes/peróxidos, tóxicos/infectantes. |
| **Frete especial** | Frete para cargas com peso acima de 500kg. Usa multiplicadores regionais. |
| **Multiplicador regional** | Fator numérico aplicado ao valor base do frete conforme região de destino (Sul, Sudeste, Centro-Oeste, Nordeste, Norte). |
| **Fator de peso** | Multiplicador adicional baseado na faixa de peso da carga (500-1000kg, 1001-3000kg, >3000kg). |
| **SLA de resposta** | Tempo máximo para o primeiro retorno ao cliente (mesmo que seja "estamos verificando"). |
| **SLA de resolução** | Tempo máximo para resolução efetiva do problema do cliente. |
| **Incidente crítico** | Evento que atende critérios específicos: carga >R$100K sem status por 6h+, carga perigosa irregular, 5+ chamados em 24h, risco a pessoas. |
| **CT-e** | Conhecimento de Transporte Eletrônico — documento fiscal obrigatório para transporte de cargas. |
| **Coleta reversa** | Processo logístico de recolhimento de mercadoria no endereço do cliente para devolução. |
| **Context budget** | Limite de tokens alocados para cada segmento do prompt (system + chunks + pergunta + histórico). |

### Restrições que impactam geração de código

- Toda resposta da API DEVE incluir o campo `source_documents` (array de `SourceDocument`) — mesmo vazio, nunca `undefined`.
- O campo `confidence` é obrigatório e DEVE ser computado a partir dos scores de busca do Azure AI Search.
- O campo `warning` DEVE ser preenchido quando houver documentos contraditórios nos chunks recuperados.
- Respostas que mencionam valores numéricos (prazos, multiplicadores, SLAs) DEVEM ter validação determinística no `response-validator.ts` — se o valor não estiver no chunk original, a resposta é bloqueada.

### Referências a specs no repositório

- Pipeline de ingestão: `/specs/pipeline-ingestao/`
- Query endpoint: `/specs/query-endpoint/`
- API de feedback: `/specs/feedback-api/`
- Bot do Teams: `/specs/teams-bot/`
- Painel web: `/specs/painel-web/`

---

## Testing Standards (QA)

### Estratégia de testes

| Tipo | Localização | Propósito | Dependências externas |
|------|------------|-----------|----------------------|
| Unit | `/tests/unit/` | Testar funções e módulos isolados | Nenhuma (100% mocked) |
| Integration | `/tests/integration/` | Testar integração entre módulos internos | Mocks para APIs externas (msw) |
| E2E | `/tests/e2e/` | Validar fluxo completo | Ambiente de staging (usa tokens — executar com cautela) |

### Regras obrigatórias

1. **Cobertura mínima:** 80% de linhas cobertas (configurado em `vitest.config.ts`).
2. **Nomenclatura de testes:** `[módulo].test.ts` no diretório correspondente. Ex: `tests/unit/services/search.test.ts`.
3. **Fixture compartilhada:** Dados de teste (chunks simulados, queries, respostas esperadas) vivem em `/tests/fixtures/`. Nunca hardcodar dados de teste dentro do arquivo de teste.
4. **Testes de guardrail:** Para cada guardrail em "NÃO DEVE" (seção Product Rules), DEVE existir ao menos um teste que valide que a resposta é bloqueada ou corrigida.
5. **Testes de regressão:** Todo bug corrigido DEVE ter um teste que reproduz o cenário antes do fix.
6. **Testes determinísticos:** Testes unitários e de integração NÃO DEVEM fazer chamadas reais a LLM. Usar respostas mockadas.
7. **Golden queries:** O arquivo `/prompts/eval/golden-queries.json` contém perguntas de referência com respostas esperadas. Alterações no system prompt DEVEM ser validadas contra essas queries.

### Cenários obrigatórios de teste para o assistente

Baseados nos incidentes identificados na fase de discovery:

| Cenário | O que valida | Tipo |
|---------|-------------|------|
| Pergunta sobre devolução de carga perigosa | Assistente NÃO afirma que pode devolver pelo processo padrão | Unit + Integration |
| Pergunta sobre multiplicadores com docs conflitantes | Assistente usa versão mais recente E informa sobre conflito | Integration |
| Pergunta com nenhum chunk relevante (score < threshold) | Assistente diz "não encontrei" em vez de inventar | Unit |
| Pergunta sobre tier inexistente ("Platinum") | Assistente informa que não existe | Unit |
| Resposta com valor numérico | Validador confirma que valor existe no chunk fonte | Unit |
| Pergunta que cruza 2 categorias | Assistente busca chunks de ambas e cita fontes de cada | Integration |

### Padrão de escrita de testes

```typescript
import { describe, it, expect, vi } from "vitest";

describe("[Módulo] - [Comportamento testado]", () => {
  it("DEVE [resultado esperado] QUANDO [condição]", () => {
    // Arrange
    // Act
    // Assert
  });
});
```

---

## Project Management Rules (Delivery Manager)

### Nomenclatura de tasks e issues

**Formato obrigatório do título:**
```
[MÓDULO] Verbo no infinitivo + objeto — contexto breve
```

**Exemplos:**
- `[QUERY] Implementar validação de input com Zod — POST /api/query`
- `[PIPELINE] Criar chunker com overlap — tratamento de tabelas`
- `[BOT] Configurar Adaptive Card de resposta — integração Teams`

**Labels obrigatórias em toda task:**

| Label | Valores possíveis |
|-------|------------------|
| `módulo` | `pipeline`, `query`, `feedback`, `bot`, `painel`, `infra`, `shared` |
| `tipo` | `feature`, `bugfix`, `refactor`, `docs`, `test` |
| `tamanho` | `P` (< 2h), `M` (2-8h), `G` (> 8h) |
| `spec-ref` | Caminho da spec (ex: `specs/query-endpoint`) |

### Regras de documentação de decisões

1. Toda decisão técnica ou de escopo DEVE ser registrada como ADR em `/docs/adr/`.
2. Nomenclatura: `NNNN-titulo-da-decisao.md` (ex: `0005-estrategia-retry-azure.md`).
3. Formato obrigatório: Contexto → Decisão → Consequências → Alternativas Consideradas.
4. ADRs aceitos são imutáveis. Para reverter, criar novo ADR referenciando o anterior como "Supersede ADR-NNNN".
5. ADRs já existentes no projeto:
   - ADR-0001: Escolha do Azure OpenAI (GPT-4o)
   - ADR-0002: Estratégia de context budget
   - ADR-0003: Tratamento de documentos contraditórios
   - ADR-0004: Escolha Azure AI Search (validado via protótipo)

### Validation gates (checkpoints humanos)

Estas são as transições obrigatórias com aprovação humana. Agentes NÃO DEVEM avançar entre fases sem aprovação explícita.

| Gate | Transição | Aprovador | O que verifica | Tempo máximo | Se reprovado |
|------|-----------|-----------|----------------|--------------|--------------|
| **G1** | Spec → Plan | Product Specialist | Requirements tem outcomes mensuráveis, scope boundaries derivados de bounded contexts, verification criteria testáveis pelo QA | 24h úteis | Retorna ao PS com comentários inline no requirements.md |
| **G2** | Plan → Tasks | Tech Lead | Plan é tecnicamente viável, decisões são coerentes com ADRs existentes, approach não introduz dívida técnica desnecessária | 24h úteis | Retorna ao TL com pontos de revisão |
| **G3** | Tasks → Implement | Tech Lead | Tasks são atômicas (implementáveis e testáveis independentemente), critérios de aceite são verificáveis, dependências estão corretas | 12h úteis | Tasks devolvidas ao Dev para decomposição adicional |
| **G4** | Code → Merge | Tech Lead | Código segue Coding Standards, testes passam, cobertura ≥ 80%, sem secrets hardcoded, PR com 1 approval mínimo | 48h úteis | PR com requested changes — Dev corrige e re-submete |
| **G5** | Tests → Deploy | QA + Tech Lead | Cobertura de testes inclui cenários de guardrail, golden queries validadas, nenhuma regressão nos testes existentes | 24h úteis | Deploy bloqueado até QA aprovar — QA detalha cenários faltantes |

### Ciclo de vida de specs (SDD)

```
Rascunho → Em Revisão → Aprovada → Em Implementação → Validada
```

| Estado | Quem pode alterar | Condição para avançar |
|--------|------------------|----------------------|
| Rascunho | Autor original | — |
| Em Revisão | Autor + Revisor (conforme gate) | PR aberto para a spec |
| Aprovada | Ninguém (congelada) | Gate aprovado |
| Em Implementação | Dev (apenas tasks.md) | Ao menos 1 task iniciada |
| Validada | Ninguém | Todos os verification criteria atendidos |

**Change management:** Se uma spec aprovada precisa mudar:
1. Criar branch `spec/[módulo]-change-[N]`.
2. Registrar motivo e impacto em comment no PR.
3. Revisor do gate original DEVE re-aprovar.
4. Tasks já em andamento afetadas pela mudança são marcadas como `blocked` até re-aprovação.

### Restrições de comunicação

- **Documentos de status, specs e comunicação com stakeholders:** português brasileiro.
- **Código, comments no código, commits, e nomes de variáveis/funções:** inglês.
- **ADRs:** inglês (para consistência com documentação técnica).
- **Commits:** formato Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- **Branch naming:** `feat/[módulo]-descricao`, `fix/[módulo]-descricao`, `spec/[módulo]-descricao`.

---

## Build & Deploy

### Comandos

| Ação | Comando |
|------|---------|
| Instalar dependências | `npm install` |
| Lint (type check) | `npm run lint` |
| Testes | `npm test` |
| Testes em watch | `npm run test:watch` |
| Build | `npm run build` |
| Executar local | `npm start` (requer Azure Functions Core Tools) |

### Pré-requisitos locais

- Node.js 22+
- Azure Functions Core Tools v4
- TypeScript 5.5+
- Git

### Variáveis de ambiente

Copiar `local.settings.json.example` para `local.settings.json` e preencher:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_OPENAI_ENDPOINT": "",
    "AZURE_OPENAI_API_KEY": "",
    "AZURE_OPENAI_DEPLOYMENT": "gpt-4o",
    "AZURE_SEARCH_ENDPOINT": "",
    "AZURE_SEARCH_API_KEY": "",
    "AZURE_SEARCH_INDEX": "novatech-docs"
  }
}
```

**Regra de segurança:** Nunca commitar `local.settings.json`, `.env`, ou qualquer arquivo com secrets. O `.gitignore` já exclui esses arquivos.

### Infraestrutura

- Definições Bicep em `/infra/`.
- Parâmetros por ambiente: `dev.bicepparam`, `staging.bicepparam`, `prod.bicepparam`.
- Deploy de infra via CI/CD — nunca executar `az deployment` manualmente em produção.

### Pipeline CI/CD

1. **CI (em todo PR):** `lint` → `test` → `build`.
2. **CD (após merge em main):** deploy para staging → smoke tests → deploy para produção (com approval gate manual).

---

## Referências rápidas para agentes

| Precisa de... | Onde encontrar |
|---------------|---------------|
| Regras de comportamento do assistente | Esta seção (Product Rules & Guardrails) |
| System prompt | `/prompts/system-prompt.md` |
| Changelog do prompt | `/prompts/prompt-changelog.md` |
| Specs dos módulos | `/specs/[módulo]/requirements.md`, `plan.md`, `tasks.md` |
| Skills reutilizáveis | `/skills/foundation/`, `/skills/domain/`, `/skills/artifact/` |
| Dados de teste | `/tests/fixtures/` |
| Queries de avaliação | `/prompts/eval/golden-queries.json` |
| Decisões arquiteturais | `/docs/adr/` |
| Documentação de negócio NovaTech | `/docs/novatech/` |
| Corpus de chunks (RAG) | `/data/retrieval-corpus/` |
| Infraestrutura | `/infra/` |
