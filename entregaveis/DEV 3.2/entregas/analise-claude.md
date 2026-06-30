## Veredito geral
O handler funciona no caminho feliz, mas viola pelo menos 6 das 8 regras da seção "Convenções de código" do AGENTS.md, não segue o "Padrão de Azure Functions" obrigatório, e introduz um risco de exposição de dados sensíveis. **Não deveria passar no Gate G4** (Code → Merge) como está.

---

## Violações críticas

**1. Sem validação de input com Zod — viola regra #1**
```ts
const body = await request.json() as any;
```
Não há `validator.ts`, não há schema Zod, e o cast para `any` viola também a regra #6 ("Não usar `any`"). `body.rating` pode ser qualquer coisa, `body.queryId` pode não existir, `body.attendantEmail` não é validado como e-mail. Nada impede que um payload malformado seja persistido no Cosmos.

**2. Log de dado sensível do atendente — risco de segurança/privacidade**
```ts
console.log('Feedback recebido:', JSON.stringify(feedback));
```
Isso loga `attendantEmail` (PII) e `comment` (texto livre, que pode conter informações de cliente) em texto plano. O AGENTS.md não lista isso explicitamente como proibido, mas é exatamente o problema apontado no cenário e contraria a prática de logging estruturado — dados de PII não deveriam ir para logs sem mascaramento/redaction.

**3. Logging incorreto — viola regra #3**
Usa `console.log` em vez de Pino via `src/shared/logger.ts`. Também não gera `correlationId`, exigido tanto pela regra #3 quanto pelo "Padrão de Azure Functions obrigatório" (`const correlationId = crypto.randomUUID();`). Sem isso, é impossível rastrear esse feedback em caso de erro.

**4. Acesso direto a `process.env` — viola regra #5**
```ts
const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
```
Variáveis de ambiente devem ser lidas exclusivamente via `src/shared/config.ts`. Aqui, além de violar a regra, `COSMOS_CONNECTION_STRING` nem aparece no `local.settings.json` de referência do AGENTS.md — sugere que a config nem foi centralizada para esse recurso.

**5. Sem tratamento de erro — viola regra #2 e o padrão obrigatório**
Não há `try/catch`. Se `container.items.create(feedback)` falhar (timeout, throttling do Cosmos, payload inválido), a exceção sobe sem controle, sem usar os custom errors de `src/shared/errors.ts`, sem log de erro com `correlationId`. O atendente recebe um 500 não estruturado — e, dependendo de como a Azure Function trata isso, pode até expor detalhes de stack trace/infra, o que contraria a regra de produto "Nunca expor informações internas do sistema".

**6. Sem retry/backoff — viola regra #4**
Chamada externa ao Cosmos DB não tem exponential backoff (3 tentativas, base 1s). Cosmos é sujeito a throttling (429) com regularidade — sem retry, qualquer pico de carga gera falhas de feedback que seriam evitáveis.

**7. `require()` dinâmico em vez de import — quebra padrão de módulo**
```ts
const { CosmosClient } = require('@azure/cosmos');
```
O projeto usa `Module: ESNext`. Misturar `require` CommonJS quebra a convenção e normalmente nem funciona limpo num projeto `"type": "module"`. Deveria ser `import { CosmosClient } from '@azure/cosmos';` no topo do arquivo.

**8. Cliente Cosmos instanciado a cada invocação — viola regra #8 e é ineficiente**
Criar um `CosmosClient` novo em toda chamada HTTP desperdiça conexões/handshakes. A regra #8 pede injeção explícita de dependências — o client deveria ser criado uma vez (ex.: em `src/services/feedback-service.ts`) e recebido por parâmetro, não instanciado dentro do handler.

**9. Assinatura não segue o padrão obrigatório do AGENTS.md**
O padrão exige:
```ts
export async function handler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>
```
O handler atual nem recebe `InvocationContext`, então não tem acesso ao contexto de invocação nativo da Function (útil para logging/telemetria integrados ao Azure).

**10. Resposta não tipada**
Retorna `{ status: 200, body: 'OK' }` — texto livre, sem um schema de resposta tipado (o AGENTS.md exige tipos de domínio em `src/shared/types.ts`, sem `any`, com discriminated unions onde fizer sentido). Não há `FeedbackResponse` ou equivalente.

**11. Localização/estrutura**
Pelo `Arquitetura de diretórios`, isso deveria estar em `src/functions/feedback/handler.ts`, com `validator.ts` ao lado e imports via path alias (`../../shared/logger.js`). Não há como confirmar a localização real pelo conteúdo, mas os imports ausentes (`validateInput`, `logger`) já indicam que a estrutura modular não foi seguida.

---