import { describe, expect, it } from "vitest";
import { auditV2AgainstCertified, auditFixtureAgainstV2, formatAuditReport } from "./v2VsCertified";
import { BLIND_WAR_BENCHMARKS } from "../benchmarks/blindWar";
import { BLIND_BATTLE_HAND_FIXTURES } from "../benchmarks/blindBattleHands";

const bw5 = BLIND_WAR_BENCHMARKS.find((f) => f.id === "BW5")!;
const ftbb4 = BLIND_BATTLE_HAND_FIXTURES.find((f) => f.id === "FTBB4")!;

describe("Auditor automático V2 × gabarito V3", () => {
  it("roda em todos os gabaritos mão-a-mão e produz o relatório", () => {
    const summary = auditV2AgainstCertified();
    console.log("\n" + formatAuditReport(summary));
    // Todas as células dos gabaritos atuais são comparáveis (SB_RFI + BB_VS_SB_RAISE).
    expect(summary.comparableHands).toBeGreaterThanOrEqual(27);
    expect(summary.notComparable).toBe(0);
  });

  it("BW5 (SB abre 40bb): V2 concorda nos folds e diverge nos limps", () => {
    const rows = auditFixtureAgainstV2(bw5);
    const agree = rows.filter((r) => r.status === "AGREE").length;
    const diverge = rows.filter((r) => r.status === "DIVERGE").length;
    expect(agree).toBe(4);
    expect(diverge).toBe(7);
    for (const h of ["72o", "62o", "52o", "42o"]) {
      expect(rows.find((r) => r.hand === h)?.status, h).toBe("AGREE");
    }
    const limps = rows.filter((r) => r.status === "DIVERGE" && r.certified === "limp");
    expect(limps.length).toBeGreaterThanOrEqual(5);
  });

  it("FTBB4 (BB defende SB open, mesa final 20bb): V2 já bate no valor, lixo e nos shoves offsuit; só TT diverge", () => {
    const rows = auditFixtureAgainstV2(ftbb4);
    const byHand = (h: string) => rows.find((r) => r.hand === h)!;
    // Valor e lixo: concorda
    expect(byHand("AA").status).toBe("AGREE");
    expect(byHand("AA").v2).toBe("raise");
    for (const h of ["94s", "72s", "62s"]) expect(byHand(h).status, h).toBe("AGREE");
    // Correção do auditor: AKo/AQo agora dão ALL-IN a 20bb (batem com o solver).
    expect(byHand("AKo").status).toBe("AGREE");
    expect(byHand("AKo").v2).toBe("shove");
    expect(byHand("AQo").status).toBe("AGREE");
    expect(byHand("AQo").v2).toBe("shove");
    // Suited/AA seguem no raise (o solver também): AKs/AQs não viram shove.
    expect(byHand("AKs").v2).toBe("raise");
    expect(byHand("AQs").v2).toBe("raise");
    // TT continua divergindo (misto/ICM — deixado pra quando tiver mais dado).
    expect(byHand("TT").status).toBe("DIVERGE");
    expect(byHand("TT").certified).toBe("call");
  });
});
