---
name: typescript-conventions
description: Define os padrões obrigatórios de escrita TypeScript no projeto: configuração strict, convenções de nomenclatura, uso de tipos vs interfaces, organização de imports e regras de linting. É a referência base que garante consistência em todo código gerado.
---

# Padrões de código

- **SOLID e clean code:** O código deve sempre prezar pelo padrão SOLID e escrita de código limpo.
- **try-catch:** Evite ao máximo usar try-catch. Recorra a tratamento global de exceções ou outras alternativas para lidar com erros e logging. Use apenas quando de fato não houver nenhuma alternativa mais limpa.
- **Funções curtas**: funções não podem ser longas. Se uma função começar a ficar muito grande, divida-a em subfunções menores com nomes descritivos para manter uma baixa carga cognitiva.
- **Modularização**: cada classe e função deve ter um único propósito bem definido.
- **Carga cognitiva**: busque sempre manter o código com baixa carga cognitiva, evitando algoritmos sofisticados que não trazem ganho real e que são difíceis de ler. Mantenha o nome de funções e variáveis claras.

---

## Nomenclatura

| Contexto | Convenção | Exemplo |
|---|---|---|
| Arquivos | `kebab-case` | `response-builder.ts`, `prompt-builder.ts` |
| Classes e tipos | `PascalCase` | `SearchResult`, `QueryRequest` |
| Interfaces | `PascalCase` sem prefixo `I` | `ChunkMetadata`, não `IChunkMetadata` |
| Funções e variáveis | `camelCase` | `buildPrompt`, `chunkCount` |
| Constantes de configuração | `UPPER_SNAKE_CASE` | `MAX_CHUNK_TOKENS`, `DEFAULT_HISTORY_TURNS` |
| Enums | `PascalCase` (valor e chave) | `DocumentStatus.Active` |
| Componentes React | `PascalCase` | `FeedbackCard`, `MetricsDashboard` |

**Anti-padrão — nomes genéricos ou abreviados:**
```ts
// ❌
const d = await search(q);
function proc(i: Input) { ... }

// ✅
const searchResult = await searchDocuments(query);
function processQueryRequest(input: QueryInput) { ... }
```

---

## Types vs Interfaces

- Use `interface` para contratos de entidades de domínio e objetos que outras partes do código implementam.
- Use `type` para uniões, interseções, tipos condicionais e aliases de tipos utilitários.
- Nunca misture os dois para representar a mesma coisa — escolha um e seja consistente no módulo.

```ts
// ✅ Interface para entidade de domínio
interface DocumentChunk {
  id: string;
  content: string;
  source: string;
  validFrom: Date;
}

// ✅ Type para união de estados
type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

// ✅ Type para composição
type QueryContext = DocumentChunk & { relevanceScore: number };

// ❌ Type para entidade de domínio (perde extensibilidade)
type DocumentChunk = {
  id: string;
  content: string;
};
```

---

## Strict mode — regras obrigatórias

O projeto usa `strict: true` no `tsconfig.json`. As seguintes regras decorrem disso e **não podem ser violadas**:

### Proibido usar `any`

```ts
// ❌
function parseResponse(data: any) {
  return data.choices[0].message.content;
}

// ✅ Use unknown + type guard ou Zod
function parseResponse(data: unknown): string {
  const parsed = CompletionResponseSchema.parse(data);
  return parsed.choices[0].message.content;
}
```

### Retorno explícito em funções públicas

```ts
// ❌ — retorno implícito em função exportada
export async function buildPrompt(chunks: DocumentChunk[], question: string) {
  return `${systemPrompt}\n\n${chunks.map(c => c.content).join('\n')}\n\n${question}`;
}

// ✅
export async function buildPrompt(
  chunks: DocumentChunk[],
  question: string
): Promise<string> {
  return `${systemPrompt}\n\n${chunks.map(c => c.content).join('\n')}\n\n${question}`;
}
```

### Non-null assertion (`!`) — uso restrito

```ts
// ❌ — esconde possível null em runtime
const content = response.choices[0]!.message!.content!;

// ✅ — trate a ausência explicitamente
const content = response.choices[0]?.message?.content;
if (!content) throw new CompletionEmptyError();
```

### Variáveis não inicializadas

```ts
// ❌
let result: SearchResult;
// ... lógica condicional ...
return result;

// ✅ — inicialize ou use undefined explícito
let result: SearchResult | undefined;
```

---

## Organização de imports

Ordem obrigatória, separada por linha em branco:

1. Módulos nativos do Node (`node:fs`, `node:path`)
2. Pacotes externos (`@azure/search-documents`, `openai`, `zod`)
3. Módulos internos compartilhados (`../shared/types`, `../shared/config`)
4. Módulos do mesmo contexto (`./validator`, `./response-builder`)

```ts
// ✅
import { readFile } from 'node:fs/promises';

import { SearchClient } from '@azure/search-documents';
import { z } from 'zod';

import { logger } from '../shared/logger';
import type { DocumentChunk } from '../shared/types';

import { buildPromptContext } from './prompt-builder';

// ❌ — imports misturados sem separação
import { buildPromptContext } from './prompt-builder';
import { SearchClient } from '@azure/search-documents';
import { logger } from '../shared/logger';
import { readFile } from 'node:fs/promises';
```

- Prefira `import type` para importações usadas apenas em tipagem — não gera código em runtime.
- Evite `import * as X` exceto para módulos sem exports nomeados.

---

## Zod — validação de input nos endpoints

Todo input externo (corpo de requisição HTTP, variável de ambiente, resposta de API) deve ser validado com Zod. **Não declare o tipo manualmente se o schema já o define.**

```ts
// ✅ — tipo inferido do schema
const QueryRequestSchema = z.object({
  question: z.string().min(1).max(500),
  historyTurns: z.number().int().min(0).max(3).default(0),
});

type QueryRequest = z.infer<typeof QueryRequestSchema>;

// ❌ — tipo duplicado manualmente (vai desincronizar)
interface QueryRequest {
  question: string;
  historyTurns: number;
}
const QueryRequestSchema = z.object({
  question: z.string(),
  historyTurns: z.number(),
});
```

---

## Funções — estilo

- Use **funções nomeadas** (`function foo()`) para declarações de nível de módulo — aparecem no stack trace.
- Use **arrow functions** para callbacks, handlers inline e dentro de `.map`/`.filter`.
- Evite funções com mais de 3 parâmetros posicionais — agrupe em um objeto tipado.

```ts
// ❌ — muitos parâmetros posicionais
async function search(query: string, top: number, minScore: number, index: string) { ... }

// ✅ — objeto de configuração
interface SearchOptions {
  query: string;
  top: number;
  minScore: number;
  indexName: string;
}
async function searchDocuments(options: SearchOptions): Promise<DocumentChunk[]> { ... }
```

---

## Azure Functions — tipagem de handlers

```ts
// ✅
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

async function queryHandler(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const body = await req.json();
  const input = QueryRequestSchema.parse(body);
  // ...
  return { status: 200, jsonBody: response };
}

app.http('query', { methods: ['POST'], handler: queryHandler });

// ❌ — sem tipagem de request/response
async function queryHandler(req: any, context: any) {
  const body = await req.json();
  // ...
  return { status: 200, body: JSON.stringify(response) };
}
```

---

## Componentes React (painel web)

- Use **function components nomeados** — não use `React.FC` (proibe `children` implícito e complica generics).
- Defina props como `interface` com sufixo `Props`.
- Não use `export default` — use named exports para facilitar refatoração e tree-shaking.

```tsx
// ✅
interface MetricsCardProps {
  title: string;
  value: number;
  unit: string;
}

export function MetricsCard({ title, value, unit }: MetricsCardProps) {
  return (
    <div className="card">
      <span>{title}</span>
      <strong>{value} {unit}</strong>
    </div>
  );
}

// ❌
const MetricsCard: React.FC<{ title: string; value: number; unit: string }> = (props) => {
  return <div>{props.title}: {props.value} {props.unit}</div>;
};
export default MetricsCard;
```

---

## Anti-padrões gerais

| Anti-padrão | Problema | Alternativa |
|---|---|---|
| `as Type` (type assertion) | Força o compilador a confiar sem verificar | Use Zod `.parse()` ou type guard |
| Enum numérico implícito | Valores mudam ao reordenar | Use string enum ou union literal |
| Arquivo com mais de 200 linhas | Viola SRP, dificulta leitura | Quebre em módulos menores |
| Comentários que explicam "o quê" | O código já diz isso | Comente só o "por quê" não óbvio |
| `console.log` em produção | Não estruturado, sem contexto | Use `logger` de `src/shared/logger.ts` |

```ts
// ❌ type assertion sem verificação
const chunk = rawResult as DocumentChunk;

// ✅ type guard explícito
function isDocumentChunk(value: unknown): value is DocumentChunk {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as DocumentChunk).content === 'string'
  );
}
```
