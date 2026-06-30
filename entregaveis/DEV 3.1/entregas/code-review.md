# Code Review do Claude

---

### 🔴 Achado crítico #1 — O guardrail de carga perigosa é facilmente contornado por paráfrase

Este é o ponto mais grave do arquivo. O `shouldBlockDangerousCargoReturn` depende de regex com **ordem fixa de palavras**:

```ts
const dangerousReturnAffirmationPatterns = [
	/cargas? perigosas?.*podem ser devolvid[ao]s?/i,
	/devolu(?:cao|ção).*cargas? perigosas?.*(?:é|eh)?\s*poss[ií]vel/i,
	/cargas? perigosas?.*devolu(?:cao|ção).*(?:é|eh)?\s*poss[ií]vel/i,
	/cargas? perigosas?.*s[aã]o eleg[ií]veis/i,
	/cargas? perigosas?.*devolu(?:cao|ção).*(?:permitid[ao]s?|autorizad[ao]s?)/i,
	/pode devolver cargas? perigosas?/i,
];
```

Teste mentalmente uma resposta plausível do LLM:

> **"Sim, é possível devolver cargas perigosas, desde que documentadas."**

- `dangerousCargoPattern` (`/cargas? perigosas?/i`) → bate, ok.
- `dangerousReturnNegationPattern` → não bate (não é negação).
- Agora as 6 regras de afirmação: todas exigem que **"cargas perigosas" venha antes** de "devolução"/"possível", ou a frase literal "pode devolver cargas perigosas" colada. Mas aqui a ordem é "possível → devolver → cargas perigosas" — **nenhum padrão cobre essa ordem.** `shouldBlockDangerousCargoReturn` retorna `false`, e a resposta — que viola diretamente a POL-001 seção 3.2 — passa pelo Zod, passa pelo handler, e vai pro atendente como se fosse válida.

Outro exemplo que falha: **"Sim, você pode devolver a carga perigosa."** — o padrão `/pode devolver cargas? perigosas?/i` exige adjacência literal entre "devolver" e "cargas?"; o artigo **"a"** entre eles já quebra o match.

Isso não é um detalhe de regex mal escrita — é uma limitação estrutural de usar correspondência sintática para capturar uma violação semântica. Qualquer variação de ordem, sinônimo ("liberada" em vez de "permitida"), ou LLM respondendo em outro registro ("Cargas perigosas? Sem problema, a devolução é viável.") escapa. Dado que esse é o **único guardrail de compliance regulatório (ANTT) implementado no código**, e a documentação (Anexo B, armadilha #4) trata exatamente disso como o caso mais grave de "inversão de regra", eu marcaria isso como bloqueador antes do go-live — não dá pra confiar a única defesa contra um erro regulatório a um conjunto de 6 regex.

→ Sugestão mínima: normalizar o texto (remover stopwords/artigos, lematizar verbos) antes de aplicar os padrões, e ampliar generosamente os `.*` entre termos-chave. Sugestão melhor: complementar com uma segunda verificação semântica (um classificador dedicado, ou um segundo prompt curto e determinístico do tipo "esta resposta afirma que devolução de carga perigosa é permitida? responda apenas sim/não"), já que regex para linguagem natural gerada por LLM tem taxa de falso-negativo estruturalmente alta.

---

### 🔴 Achado crítico #2 — Confirma o gap da review anterior: o `confidence_score` calculado aqui é sofisticado, mas **nada no handler usa esse número**

Agora que vejo `calculateConfidenceScore`, o problema fica mais nítido. O cálculo é genuinamente bom — pondera score médio de similaridade, penaliza fontes informais (FAQ), penaliza contradição de versões, bonifica corroboração — mas, como já apontei na review do `handler.ts`, esse valor só é **anexado** à resposta (`confidence_score: calculateConfidenceScore(chunks)`), nunca **comparado a um limiar** para decidir nada. Ou seja: todo esse trabalho de engenharia de sinal fica decorativo até que o handler implemente o gate HITL que o `cenario-pt3` pede. Hoje, uma resposta com `confidence_score: 0.15` (baseada quase inteiramente em FAQ) sai para o atendente com status 200, exatamente como uma resposta com `confidence_score: 0.95`.

---

### 🟠 Achado #3 — Só uma das 12 contradições documentadas tem proteção

```ts
const contradictingPairs: [string, string][] = [
	["PROC-042-frete-especial-v1", "PROC-042-v2-frete-especial-revisado"],
];
```

O `cenario-pt2` é explícito: **"847 documentos válidos (12 deles com contradições pendentes de resolução pelo Compliance)"**. Este código só sabe sobre **um** par de contradição, com IDs de documento hardcoded como string literal. As outras 11 contradições pendentes não recebem nenhuma penalidade de confiança — o sistema as trata como se fossem fontes perfeitamente consistentes. Isso é uma lista que claramente devia vir de configuração/metadado (ex.: um campo `contradicts: string[]` no índice do Azure AI Search, populado pelo pipeline de ingestão), não hardcoded no validador de resposta. Hoje, toda vez que o Compliance resolver ou criar uma nova contradição, alguém precisa lembrar de editar este arquivo TS e fazer deploy — processo que claramente não vai escalar e provavelmente será esquecido.

---

### 🟡 Achado #4 — Heurística de "fonte informal" é só `/faq/i` no nome do documento

```ts
const informalSourcePatterns = [/faq/i];
```

Funciona apenas se a convenção de nomenclatura do `source_document` contiver literalmente "FAQ". Além disso, trata todo FAQ igual: o Anexo B diferencia explicitamente FAQ-03 (tem alternativa formal, ramal 4500) de FAQ-32/FAQ-38 (**"Nenhum documento formal cobre isso"**) — esses dois deveriam pesar muito mais do que uma penalidade proporcional genérica de 0.2, já que ali o FAQ não é "suporte informal a uma resposta formal", é a **única fonte existente**. O cálculo atual não distingue "FAQ complementando documento oficial" de "FAQ sendo a única base da resposta".

---

### 🟡 Achado #5 — Falha de schema e falha de guardrail de compliance são tratadas como a mesma coisa

O `.superRefine` injeta a violação de carga perigosa como mais um `ZodIssueCode.custom`, misturado com erros estruturais comuns (campo vazio, score fora do range). No `handler.ts`, ambos caem no mesmo `catch (ValidationError)` e geram o mesmo `logger.warn` genérico. Operacionalmente isso é um problema: um trip do guardrail regulatório (carga perigosa) é um evento que provavelmente merece alerta/métrica dedicada — não devia ficar indistinguível de "o LLM esqueceu o campo `source_document`" nos logs. `getAssistantResponseRejectionDetails` já devolve `reason`, então dá pra filtrar por `DANGEROUS_CARGO_RETURN_BLOCK_MESSAGE` — mas hoje nada faz isso.

---

### 🟢 Pontos positivos que valem reconhecer

- `source_document.min(1)` no schema **de fato fecha** o gap citado no cenário ("nada impede a resposta de seguir sem fonte") — isso responde diretamente ao problema relatado, ao contrário do que eu hipotetizei na review anterior sem ver este arquivo.
- `buildAssistantResponse` → `validateAssistantResponse` → `safeParse` → retorno tipado via `result.data`, sem `as` cast. Tipagem ponta a ponta correta.
- O design de `calculateConfidenceScore` como função pura, exportada e testável isoladamente é uma boa decisão de arquitetura — facilita escrever os testes que faltam (lembrando que `tests/` está vazio no Anexo C).
- Separar `INVALID_ASSISTANT_RESPONSE_MESSAGE` (mensagem interna/log) de `GUARDRAIL_FALLBACK_ANSWER` (mensagem ao usuário) é intencional e correto — só merece um comentário no código explicando a distinção, porque a primeira leitura sugere duplicação redundante.

# Minhas considerações

## Pontos realmente relevantes:

**Achado #1**: é realmente um problema que identifiquei desde a implementação, mas mantive para fazer o code review da primeira iteração. Se o agente usar paráfrase, esse guardrail passa facilmente despercebido. É uma correção válida e necessária

**Achado #2**: o número é utilizado na resposta, mas pode ser interessante de fato usar o valor para incluir um aviso de baixa confiabilidade por enquanto, já que não foi especificada a necessidade de bloquear mensagens de baixa confiança.

**Achado #4**: de fato, a verificação pode ser extendida para ver conteúdo também além do nome do arquivo

**Achado #5**: também é válido diferenciar os 2 tipos de exceção

## Pontos irrelevantes/incorretos

**Achado #3**: identificou como problema por falta de contexto. Não foi informado que esses documentos todos fazem parte do cenário e não estão disponíveis fisicamente.

