import { z } from "zod";
import { ValidationError } from "../shared/errors.js";
import type { Chunk, QueryResponse } from "../shared/types.js";

export const INVALID_ASSISTANT_RESPONSE_MESSAGE =
	"Não consigo garantir uma resposta íntegra. Por favor, contate um superior ou tente novamente.";

const ANSWER_REQUIRED_MESSAGE = "answer must not be empty";
const SOURCE_DOCUMENT_REQUIRED_MESSAGE = "source_document must contain at least one source";
const SOURCE_DOCUMENT_ITEM_REQUIRED_MESSAGE = "source_document entries must not be empty";
const CONFIDENCE_SCORE_RANGE_MESSAGE = "confidence_score must be between 0 and 1";
const DANGEROUS_CARGO_RETURN_BLOCK_MESSAGE =
	"dangerous cargo return answers cannot state that return is possible";

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

export const AssistantResponseSchema = z
	.object({
		answer: z.string().trim().min(1, ANSWER_REQUIRED_MESSAGE),
		source_document: z
			.array(z.string().trim().min(1, SOURCE_DOCUMENT_ITEM_REQUIRED_MESSAGE))
			.min(1, SOURCE_DOCUMENT_REQUIRED_MESSAGE),
		confidence_score: z
			.number()
			.finite(CONFIDENCE_SCORE_RANGE_MESSAGE)
			.min(0, CONFIDENCE_SCORE_RANGE_MESSAGE)
			.max(1, CONFIDENCE_SCORE_RANGE_MESSAGE),
	})
	.superRefine((response, ctx) => {
		if (shouldBlockDangerousCargoReturn(response.answer)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["answer"],
				message: DANGEROUS_CARGO_RETURN_BLOCK_MESSAGE,
			});
		}
	});

export function buildAssistantResponse(answer: string, chunks: Chunk[]): QueryResponse {
	const response = {
		answer,
		source_document: [...new Set(chunks.map((chunk) => chunk.source_document).filter(Boolean))],
		confidence_score: calculateConfidenceScore(chunks),
	};

	return validateAssistantResponse(response);
}

export function validateAssistantResponse(response: unknown): QueryResponse {
	const result = AssistantResponseSchema.safeParse(response);

	if (!result.success) {
		throw new ValidationError(INVALID_ASSISTANT_RESPONSE_MESSAGE, result.error);
	}

	return result.data;
}

export function getAssistantResponseRejectionDetails(cause: unknown) {
	if (!(cause instanceof z.ZodError)) {
		return [];
	}

	return cause.issues.map((issue) => ({
		path: issue.path.join("."),
		code: issue.code,
		reason: issue.message,
	}));
}

export function shouldBlockDangerousCargoReturn(answer: string): boolean {
	if (!dangerousCargoPattern.test(answer)) {
		return false;
	}

	if (dangerousReturnNegationPattern.test(answer)) {
		return false;
	}

	return dangerousReturnAffirmationPatterns.some((pattern) => pattern.test(answer));
}

function calculateConfidenceScore(chunks: Chunk[]): number {
	if (chunks.length === 0) {
		return 0;
	}

	const scores = chunks
		.map((chunk) => chunk.score)
		.filter((score): score is number => typeof score === "number" && Number.isFinite(score));

	if (scores.length === 0) {
		return 0;
	}

	const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
	return Math.max(0, Math.min(1, Number(average.toFixed(2))));
}
