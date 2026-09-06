import { describe, expect, it } from "vitest";
import { auditV2AgainstCertified, formatAuditReport } from "./v2VsCertified";

describe("Auditor automático V2 × gabarito V3", () => {
  it("roda nos gabaritos com dado mão-a-mão e produz o relatório", () => {
    const summary = auditV2AgainstCertified();
    // Imprime pro registro (aparece no output do teste).
    console.log("\n" + formatAuditReport(summary));

    // Hoje só o BW5 tem gabarito mão-a-mão (11 células puras, nó SB_RFI).
    expect(summary.comparableHands).toBe(11);
    expect(summary.notComparable).toBe(0);
  });

  it("BW5: V2 concorda nos folds óbvios e diverge nos limps (o ganho do V3)", () => {
    const summary = auditV2AgainstCertified();
    // Resultado conhecido do BW5 (SB abre 40bb, ITM): 4 concordam / 7 divergem.
    expect(summary.agree).toBe(4);
    expect(summary.diverge).toBe(7);

    // As divergências de limp têm que estar marcadas com a razão certa.
    const limpDiverge = summary.rows.filter(
      (r) => r.status === "DIVERGE" && r.certified === "limp",
    );
    expect(limpDiverge.length).toBeGreaterThanOrEqual(5);
    for (const r of limpDiverge) expect(r.reason).toContain("limp");
  });

  it("as mãos de lixo (72o/62o/52o/42o) o V2 já folda igual ao solver", () => {
    const summary = auditV2AgainstCertified();
    for (const h of ["72o", "62o", "52o", "42o"]) {
      const row = summary.rows.find((r) => r.hand === h);
      expect(row?.status, h).toBe("AGREE");
      expect(row?.v2, h).toBe("fold");
    }
  });
});
