```typescript
import { z } from "zod";

export const INVALID_ASSISTANT_RESPONSE_MESSAGE =
  "Não consigo garantir uma resposta íntegra. Por favor, contate um superior ou tente novamente.";

const dangerousCargoPattern = /cargas? perigosas?/i;
const dangerousReturnAffirmationPatterns = [
  /cargas? perigosas?.*podem ser devolvid[ao]s?/i,
  /devolu(?:cao|ção).*cargas? perigosas?.*(?:é|eh)?\s*poss[ií]vel/i,
  /cargas? perigosas?.*devolu(?:cao|ção).*(?:é|eh)?\s*poss[ií]vel/i,
  /cargas? perigosas?.*s[aã]o eleg[ií]veis/i,
  /cargas? perigosas?.*devolu(?:cao|ção).*(?:permitid[ao]s?|autorizad[ao]s?)/i,
  /pode devolver cargas? perigosas?/i,
];
const dangerousReturnNegationPattern =
  /cargas? perigosas?.*(?:n[aã]o podem ser devolvid[ao]s?|n[aã]o s[aã]o eleg[ií]veis|n[aã]o t[eê]m devolu(?:cao|ção) padr[aã]o)/i;

function shouldBlockDangerousCargoReturn(answer: string): boolean {
  if (!dangerousCargoPattern.test(answer)) {
    return false;
  }

  if (dangerousReturnNegationPattern.test(answer)) {
    return false;
  }

  return dangerousReturnAffirmationPatterns.some((pattern) => pattern.test(answer));
}

export const AssistantResponseSchema = z
  .object({
    answer: z.string().trim().min(1, INVALID_ASSISTANT_RESPONSE_MESSAGE),
    source_document: z
      .array(z.string().trim().min(1, INVALID_ASSISTANT_RESPONSE_MESSAGE))
      .min(1, INVALID_ASSISTANT_RESPONSE_MESSAGE),
    confidence_score: z.number().finite().min(0).max(1),
  })
  .superRefine((response, ctx) => {
    if (shouldBlockDangerousCargoReturn(response.answer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answer"],
        message: INVALID_ASSISTANT_RESPONSE_MESSAGE,
      });
    }
  });
```