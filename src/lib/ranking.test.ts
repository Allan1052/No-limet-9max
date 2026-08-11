import { describe, it, expect } from "vitest";
import { isTestPlayerKey, isTestNickname } from "./ranking";

describe("ranking — filtro anti-teste", () => {
  it("chaves de teste por prefixo são barradas", () => {
    for (const k of ["e2e_abc", "diag_1", "qa_x", "test_9"]) expect(isTestPlayerKey(k)).toBe(true);
    for (const k of ["3cd4bfe25066", "abc123"]) expect(isTestPlayerKey(k)).toBe(false);
  });

  it("apelidos de teste (chave comum) também são barrados", () => {
    for (const n of ["CircuitoQA01", "QA2", "teste", "e2e_run", "diag bot", "DEBUG mesa", "staging"]) {
      expect(isTestNickname(n)).toBe(true);
    }
  });

  it("apelidos reais NÃO são barrados", () => {
    for (const n of ["Call ou Fold", "Joaquim", "Contestador", "Estrategista", "Paçoca", "O Doidão"]) {
      expect(isTestNickname(n)).toBe(false);
    }
  });
});
