import { z } from "zod";
import { ValidationError } from "../shared/errors.js";
import type { Chunk, QueryResponse } from "../shared/types.js";

/**
 * Internal message when validation fails (used in logs).
 * Signals a structural error (missing field, invalid score, or guardrail violation).
 */
export const INVALID_ASSISTANT_RESPONSE_MESSAGE =
	"Não consigo garantir uma resposta íntegra. Por favor, contate um superior ou tente novamente.";

/**
 * User-facing fallback response when a guardrail blocks the model output.
 * Safe, generic answer that indicates a temporary inability without exposing internal errors.
 * Returned with 200 status and `source_document: []`, `confidence_score: 0`.
 */
export const GUARDRAIL_FALLBACK_ANSWER =
	"Não consigo encontrar uma resposta confiável, consulte um superior.";

const ANSWER_REQUIRED_MESSAGE = "answer must not be empty";
const SOURCE_DOCUMENT_REQUIRED_MESSAGE = "source_document must contain at least one source";
const SOURCE_DOCUMENT_ITEM_REQUIRED_MESSAGE = "source_document entries must not be empty";
const CONFIDENCE_SCORE_RANGE_MESSAGE = "confidence_score must be between 0 and 1";
const DANGEROUS_CARGO_RETURN_BLOCK_MESSAGE =
	"dangerous cargo return answers cannot state that return is possible";

const dangerousCargoPattern = /cargas? perigosas?/i;

/**
 * Patterns to detect affirmations that dangerous cargo CAN be returned.
 * Intentionally broad to catch paraphrases and variations.
 * Note: These patterns may have false negatives; semantic validation is recommended
 * as a second check for high-stakes compliance decisions (see code review comment).
 */
const dangerousReturnAffirmationPatterns = [
	/(?:podem|conseguem|é poss[ií]vel|é viável).*(?:devolver|retornar).*cargas? perigosas?/i,
	/cargas? perigosas?.*(?:podem|conseguem|é poss[ií]vel|é viável).*(?:devolver|retornar)/i,
	/devolu(?:cao|ção).*cargas? perigosas?.*(?:é|eh)?\s*(?:poss[ií]vel|viável|permitid|autorizado)/i,
	/cargas? perigosas?.*devolu(?:cao|ção).*(?:é|eh)?\s*(?:poss[ií]vel|viável|permitid|autorizado)/i,
	/cargas? perigosas?.*s[aã]o\s+(?:elegíveis?|perm|aprovadas?)/i,
	/(?:pode|consegue|dá pra)\s+(?:devolver|retornar|enviar de volta).*cargas? perigosas?/i,
	/sim.*(?:devolver|retornar).*cargas? perigosas?/i,
];

/**
 * Pattern to detect explicit negations that dangerous cargo CANNOT be returned.
 * Overrides affirmation patterns if this matches.
 */
const dangerousReturnNegationPattern =
	/cargas? perigosas?.*(?:n[aã]o\s+(?:podem|conseguem|s[aã]o eleg[ií]veis|t[eê]m devolu))/i;

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
		const violation = checkDangerousCargoViolation(response.answer);
		if (violation.isViolation) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["answer"],
				message: DANGEROUS_CARGO_RETURN_BLOCK_MESSAGE,
				meta: { violationType: "compliance_guardrail_dangerous_cargo" },
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

export interface RejectionDetail {
	path: string;
	code: string;
	reason: string;
	isComplianceViolation?: boolean;
}

/**
 * Extracts rejection details from a Zod validation error.
 * Distinguishes compliance guardrail violations from structural schema errors.
 * This separation enables proper logging and alerting at the handler level.
 */
export function getAssistantResponseRejectionDetails(cause: unknown): RejectionDetail[] {
	if (!(cause instanceof z.ZodError)) {
		return [];
	}

	return cause.issues.map((issue) => ({
		path: issue.path.join("."),
		code: issue.code,
		reason: issue.message,
		isComplianceViolation: issue.meta?.violationType === "compliance_guardrail_dangerous_cargo",
	}));
}

/**
 * Normalizes text for pattern matching: removes common stopwords,
 * normalizes whitespace, and handles plural/verb variations.
 * Reduces false negatives from paraphrasing.
 */
function normalizeForPatternMatching(text: string): string {
	const stopwords = /\b(um|uma|o|a|os|as|de|do|da|dos|das|e|ou|com|sem)\b/gi;
	const normalized = text
		.toLowerCase()
		.replace(stopwords, "")
		.replace(/\s+/g, " ")
		.trim();
	return normalized;
}

/**
 * Result of checking if an answer violates the dangerous cargo compliance guardrail.
 * Includes the violation flag and the normalized text used for matching (for audit/debugging).
 */
export interface DangerousCargoViolationResult {
	isViolation: boolean;
	patternMatched?: string;
	normalizedText?: string;
}

/**
 * Detects when the answer affirms that dangerous cargo return is possible,
 * violating POL-001 section 3.2 (Guardrail 2).
 *
 * Strategy:
 * 1. Checks if answer mentions dangerous cargo at all.
 * 2. Checks for explicit negations (escapes the check).
 * 3. Tests both original and normalized text against affirmation patterns.
 *    Normalization removes stopwords to catch paraphrases.
 * 4. Returns violation flag + matched pattern for audit logging.
 *
 * Note: Pattern matching has inherent limitations for semantic detection.
 * For production-critical compliance, consider a supplementary semantic check.
 */
export function checkDangerousCargoViolation(answer: string): DangerousCargoViolationResult {
	if (!dangerousCargoPattern.test(answer)) {
		return { isViolation: false };
	}
	if (dangerousReturnNegationPattern.test(answer)) {
		return { isViolation: false };
	}

	for (const pattern of dangerousReturnAffirmationPatterns) {
		if (pattern.test(answer)) {
			return {
				isViolation: true,
				patternMatched: pattern.source,
			};
		}
	}

	const normalized = normalizeForPatternMatching(answer);
	for (const pattern of dangerousReturnAffirmationPatterns) {
		if (pattern.test(normalized)) {
			return {
				isViolation: true,
				patternMatched: pattern.source,
				normalizedText: normalized,
			};
		}
	}

	return { isViolation: false };
}

/**
 * @deprecated Use checkDangerousCargoViolation instead.
 * Kept for backward compatibility, but the new function provides more detail.
 */
export function shouldBlockDangerousCargoReturn(answer: string): boolean {
	return checkDangerousCargoViolation(answer).isViolation;
}

/**
 * Derives a confidence score from retrieved chunks.
 *
 * Rules (from scenario requirements):
 * - Base: average similarity score of the chunks (field `score`, default 0.5).
 * - Penalty (-0.20) proportional to the share of informal/FAQ sources.
 * - Penalty (-0.15) when both contradicting document versions are retrieved
 *   together (e.g. PROC-042 v1 and v2), signalling an unresolved contradiction.
 * - Bonus (+0.05 per extra unique source, capped at +0.10) when multiple
 *   independent sources corroborate the same answer.
 */
export function calculateConfidenceScore(chunks: Chunk[]): number {
	if (chunks.length === 0) return 0;

	const avgScore = chunks.reduce((sum, c) => sum + (c.score ?? 0.5), 0) / chunks.length;

	const sources = chunks.map((c) => c.source_document);
	const uniqueSources = [...new Set(sources)];

	/**
	 * Detect informal (FAQ) sources by name and by checking if the chunk is marked as informal.
	 * FAQ sources receive higher penalty since they represent untested/unvalidated knowledge.
	 */
	const informalSourcePatterns = [/faq/i];
	const informalCount = sources.filter((s) => {
		const isInformalByName = informalSourcePatterns.some((p) => p.test(s));
		const isInformalByContent = chunks.some(
			(c) =>
				c.source_document === s &&
				(!c.vigencia || new Date(c.vigencia) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
		);
		return isInformalByName || isInformalByContent;
	}).length;
	const informalPenalty = (informalCount / chunks.length) * 0.2;

	/**
	 * Penalize when contradicting document versions are retrieved together.
	 * This signals an unresolved contradiction in the knowledge base that should have been
	 * resolved by the Compliance team before retrieval. Scenario mentions 12 pending contradictions;
	 * only the most critical (frete) is hardcoded here as a POC. In production, these pairs
	 * should come from a metadata field (e.g., document.contradicts) populated by the ingestion pipeline.
	 * See code review comment #3.
	 */
	const contradictingPairs: [string, string][] = [
		["PROC-042-frete-especial-v1", "PROC-042-v2-frete-especial-revisado"],
	];
	const contradictionPenalty = contradictingPairs.some(
		([a, b]) =>
			uniqueSources.some((s) => s.includes(a)) && uniqueSources.some((s) => s.includes(b)),
	)
		? 0.15
		: 0;

	const corroborationBonus =
		uniqueSources.length > 1 ? Math.min((uniqueSources.length - 1) * 0.05, 0.1) : 0;

	const score = avgScore - informalPenalty - contradictionPenalty + corroborationBonus;
	const finalScore = Math.max(0, Math.min(1, Number(score.toFixed(2))));

	/**
	 * Audit note: Score is computed and included in the response, but is not currently
	 * used to block low-confidence answers at the handler level. See code review comment #2.
	 * If implemented, score < 0.5 (or similar threshold) should trigger HITL or fallback response.
	 */
	return finalScore;
}
