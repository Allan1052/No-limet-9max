// ---------------------------------------------------------------------------
// Testes do checkForUpdate (detecção automática de nova versão) — 16/08
// ---------------------------------------------------------------------------
import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractBundleHash } from "./pwaUpdate";

describe("pwaUpdateCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extrai o hash do bundle do HTML do index", () => {
    const html = `<script type="module" src="/assets/index-CTsrZP_V.js"></script>`;
    expect(extractBundleHash(html)).toBe("CTsrZP_V");
  });

  it("extrai o hash mesmo com hashes longos do vite build", () => {
    const html = `<script type="module" crossorigin src="/assets/index-84f907a8.js"></script>`;
    expect(extractBundleHash(html)).toBe("84f907a8");
  });

  it("retorna vazio quando não há referência de bundle", () => {
    expect(extractBundleHash("<html><body></body></html>")).toBe("");
  });

  it("prioriza o primeiro index-*.js (bundle do app) antes de outros assets", () => {
    // vendor-CdGPq não é o index do app; o regex pega o primeiro match, que no
    // HTML real é sempre o bundle da aplicação.
    const real = `<script type="module" src="/assets/index-DeO0JheB.js"></script><script src="/assets/vendor-CdGPq-lP.js"></script>`;
    expect(extractBundleHash(real)).toBe("DeO0JheB");
  });
});
