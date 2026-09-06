import { describe, expect, it } from "vitest";
import { auditV2AgainstCertified, auditFixtureAgainstV2, formatAuditReport } from "./v2VsCertified";
import { BLIND_WAR_BENCHMARKS } from "../benchmarks/blindWar";
import { BLIND_BATTLE_HAND_FIXTURES } from "../benchmarks/blindBattleHands";
import { ICM_SHORT_STACK_FIXTURES } from "../benchmarks/icmShortStack";

const bw5 = BLIND_WAR_BENCHMARKS.find((f) => f.id === "BW5")!;
const ftbb4 = BLIND_BATTLE_HAND_FIXTURES.find((f) => f.id === "FTBB4")!;
const byId = (id: string) => ICM_SHORT_STACK_FIXTURES.find((f) => f.id === id)!;

describe("Auditor automático V2 × gabarito V3", () => {
  it("roda em todos os gabaritos mão-a-mão e produz o relatório", () => {
    const summary = auditV2AgainstCertified();
    console.log("\n" + formatAuditReport(summary));
    // SB_RFI + BB_VS_SB_RAISE são comparáveis; o nó de defesa vs shove (BUB3)
    // sai como NOT_COMPARABLE (precisa de ICM/payouts), honestamente.
    expect(summary.comparableHands).toBeGreaterThanOrEqual(27);
    expect(summary.notComparable).toBeGreaterThanOrEqual(2);
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

  it("BB 40bb vs SB open (ITM 25%): V2 bate no valor e no lixo (24/25); só J3o diverge (fronteira de indiferença)", () => {
    const bb40 = BLIND_BATTLE_HAND_FIXTURES.find((f) => f.id === "BB40_ITM25_VS_SB3_PURE")!;
    const rows = auditFixtureAgainstV2(bb40);
    const byHand = (h: string) => rows.find((r) => r.hand === h)!;
    const agree = rows.filter((r) => r.status === "AGREE").length;
    const diverge = rows.filter((r) => r.status === "DIVERGE").length;
    expect(agree).toBe(24);
    expect(diverge).toBe(1);
    // Valor: o V2 aumenta igual ao solver.
    for (const h of ["AA", "AKs", "KK", "QQ", "JJ"]) expect(byHand(h).v2, h).toBe("raise");
    // Lixo offsuit: folda igual.
    for (const h of ["72o", "32o", "Q3o", "T3o"]) expect(byHand(h).status, h).toBe("AGREE");
    // A única divergência é J3o (solver call, V2 fold) — coin-flip, não leak.
    expect(byHand("J3o").status).toBe("DIVERGE");
    expect(byHand("J3o").certified).toBe("call");
    expect(byHand("J3o").v2).toBe("fold");
  });

  it("ICM RFI stack curto (BUB1 HJ 8bb / BUB2 CO 4bb): células puras — V2 concorda 100%", () => {
    for (const id of ["BUB1_HJ8_RFI_PURE", "BUB2_CO4_RFI_PURE"]) {
      const rows = auditFixtureAgainstV2(byId(id));
      const agree = rows.filter((r) => r.status === "AGREE").length;
      expect(rows.every((r) => r.status === "AGREE"), `${id}: tudo AGREE`).toBe(true);
      expect(agree).toBe(12);
      // Empurra os premium, folda o lixo — bate com o solver (chipEV coincide).
      expect(rows.find((r) => r.hand === "AKs")?.v2).toBe("shove");
      expect(rows.find((r) => r.hand === "32o")?.v2).toBe("fold");
    }
  });

  it("ICM BB 4bb vs UTG open (mesa final): V2 (chipEV) empurra mais largo que o solver — divergência dirigida por ICM", () => {
    const rows = auditFixtureAgainstV2(byId("FT_BB4_VS_UTG2_PURE"));
    const byHand = (h: string) => rows.find((r) => r.hand === h)!;
    // Premium: concorda no all-in.
    for (const h of ["AKs", "KK", "QQ", "TT"]) expect(byHand(h).status, h).toBe("AGREE");
    // Suited conectores/broadway: solver PAGA (call), V2 empurra (shove) — ICM.
    for (const h of ["KJs", "KTs", "QJs", "QTs", "JTs", "T9s", "98s"]) {
      expect(byHand(h).status, h).toBe("DIVERGE");
      expect(byHand(h).certified, h).toBe("call");
      expect(byHand(h).v2, h).toBe("shove");
    }
    // Offsuit marginal: solver FOLDA, V2 empurra — o V2 arrisca demais sob ICM.
    for (const h of ["K9o", "Q8o"]) {
      expect(byHand(h).status, h).toBe("DIVERGE");
      expect(byHand(h).certified, h).toBe("fold");
      expect(byHand(h).v2, h).toBe("shove");
    }
    const diverge = rows.filter((r) => r.status === "DIVERGE").length;
    expect(diverge).toBe(9);
  });
});
