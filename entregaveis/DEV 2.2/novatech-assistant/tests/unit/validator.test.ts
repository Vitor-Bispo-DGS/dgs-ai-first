import { describe, it, expect } from "vitest";
import { validateQueryRequest, QueryRequestSchema } from "../../src/functions/query/validator.js";
import { ZodError } from "zod";

describe("validateQueryRequest", () => {
  it("accepts a valid question", () => {
    const result = validateQueryRequest({ question: "Qual é o prazo de devolução?" });
    expect(result.question).toBe("Qual é o prazo de devolução?");
  });

  it("rejects empty question", () => {
    expect(() => validateQueryRequest({ question: "" })).toThrow(ZodError);
  });

  it("rejects missing question field", () => {
    expect(() => validateQueryRequest({})).toThrow(ZodError);
  });

  it("rejects non-string question", () => {
    expect(() => validateQueryRequest({ question: 123 })).toThrow(ZodError);
  });

  it("rejects question exceeding max length", () => {
    expect(() => validateQueryRequest({ question: "a".repeat(2001) })).toThrow(ZodError);
  });

  it("accepts question at max length boundary", () => {
    const result = validateQueryRequest({ question: "a".repeat(2000) });
    expect(result.question).toHaveLength(2000);
  });
});

describe("QueryRequestSchema", () => {
  it("safeParse returns success=false for invalid input", () => {
    const result = QueryRequestSchema.safeParse({ question: "" });
    expect(result.success).toBe(false);
  });

  it("safeParse returns success=true for valid input", () => {
    const result = QueryRequestSchema.safeParse({ question: "valid question" });
    expect(result.success).toBe(true);
  });
});
