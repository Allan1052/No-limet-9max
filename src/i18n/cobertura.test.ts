// ---------------------------------------------------------------------------
// Os três idiomas precisam ter as MESMAS chaves.
//
// Em 11/09/2026 a auditoria encontrou 48 chaves faltando no espanhol e 47 no
// inglês. Não quebrava a tela (o `t()` cai para o português), e por isso ficou
// meses sem ninguém ver: a tela simplesmente MISTURAVA os dois idiomas.
// Este teste torna isso visível na hora.
// ---------------------------------------------------------------------------
import { describe, it, expect } from "vitest";
import { TRANSLATIONS } from "./translations";

const idiomas = Object.keys(TRANSLATIONS) as Array<keyof typeof TRANSLATIONS>;
const base = Object.keys(TRANSLATIONS.pt);

describe("cobertura de idiomas", () => {
  it("tem os três idiomas", () => {
    expect(idiomas.sort()).toEqual(["en", "es", "pt"]);
  });

  it.each(idiomas.filter((l) => l !== "pt"))(
    "%s tem todas as chaves do português",
    (lang) => {
      const tem = new Set(Object.keys(TRANSLATIONS[lang]));
      const faltando = base.filter((k) => !tem.has(k));
      expect(faltando, `faltam ${faltando.length} chaves em ${lang}`).toEqual([]);
    },
  );

  it.each(idiomas.filter((l) => l !== "pt"))(
    "%s não tem chave que o português não tenha (resto de renomeação)",
    (lang) => {
      const doPt = new Set(base);
      const sobrando = Object.keys(TRANSLATIONS[lang]).filter((k) => !doPt.has(k));
      expect(sobrando).toEqual([]);
    },
  );

  it.each(idiomas)("%s não deixa texto vazio", (lang) => {
    const vazias = Object.entries(TRANSLATIONS[lang])
      .filter(([, v]) => typeof v === "string" && v.trim() === "")
      .map(([k]) => k);
    expect(vazias).toEqual([]);
  });
});
