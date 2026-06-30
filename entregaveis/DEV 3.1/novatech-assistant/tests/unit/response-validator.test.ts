import { describe, expect, it } from "vitest";
import { ValidationError } from "../../src/shared/errors.js";
import { mockChunks } from "../fixtures/chunks.js";
import {
  buildAssistantResponse,
  getAssistantResponseRejectionDetails,
  INVALID_ASSISTANT_RESPONSE_MESSAGE,
  shouldBlockDangerousCargoReturn,
  validateAssistantResponse,
} from "../../src/services/response-validator.js";

describe("response-validator", () => {
  it("builds a structured response with mandatory fields", () => {
    const response = buildAssistantResponse("Prazo de devolução em até 7 dias úteis.", mockChunks);

    expect(response.answer).toBeTruthy();
    expect(response.source_document.length).toBeGreaterThan(0);
    expect(response.confidence_score).toBeGreaterThanOrEqual(0);
    expect(response.confidence_score).toBeLessThanOrEqual(1);
  });

  it("throws the standard message when source_document is missing", () => {
    expect(() =>
      validateAssistantResponse({
        answer: "Prazo de devolução em até 7 dias úteis.",
        confidence_score: 0.92,
      })
    ).toThrowError(new ValidationError(INVALID_ASSISTANT_RESPONSE_MESSAGE));
  });

  it("blocks dangerous cargo return answers that say return is possible", () => {
    expect(() =>
      validateAssistantResponse({
        answer: "A devolução de carga perigosa é possível com autorização prévia.",
        source_document: ["POL-001-politica-devolucao"],
        confidence_score: 0.81,
      })
    ).toThrowError(new ValidationError(INVALID_ASSISTANT_RESPONSE_MESSAGE));
  });

  it("extracts detailed rejection reasons for logging", () => {
    try {
      validateAssistantResponse({
        answer: "A devolução de carga perigosa é possível com autorização prévia.",
        source_document: [],
        confidence_score: 1.2,
      });
      expect.unreachable("validation should have failed");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const details = getAssistantResponseRejectionDetails((error as ValidationError).cause);

      expect(details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "source_document",
            reason: "source_document must contain at least one source",
          }),
          expect.objectContaining({
            path: "confidence_score",
            reason: "confidence_score must be between 0 and 1",
          }),
          expect.objectContaining({
            path: "answer",
            reason: "dangerous cargo return answers cannot state that return is possible",
          }),
        ])
      );
    }
  });

  it("allows dangerous cargo answers that keep the prohibition", () => {
    expect(
      shouldBlockDangerousCargoReturn(
        "Cargas perigosas não podem ser devolvidas pelo processo padrão e devem ser tratadas pela Gestão de Riscos."
      )
    ).toBe(false);
  });
});