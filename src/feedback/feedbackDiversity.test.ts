// ---------------------------------------------------------------------------
// Simulação em massa do feedback do coach (Simples e Técnico).
//
// Roda torneios COMPLETOS com o GameController real, herói jogando
// intencionalmente imperfeito, para gerar todos os tipos de feedback.
// Gera um relatório de diversidade e salva em /home/ubuntu/feedback_sim_raw.json.
// ---------------------------------------------------------------------------
import { describe, it } from "vitest";
// O save do JSON bruto é auxiliar de simulação (roda em máquina local).
// Dinamicamente requerido p/ não quebrar o `tsc` em runners sem @types/node
// (ex.: GitHub Actions com Node 24, moduleResolution bundler).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = ((): { writeFileSync?: (p: string, d: string) => void } => {
  try {
    return require("node:fs");
  } catch {
    return {};
  }
})();
import { GameController } from "../app/gameController";
import type { FeedbackItem } from "./analyzer";
import { legalActions } from "../game/betting";
import { seatPositions } from "../bots/seatPosition";
import { seededRng } from "../engine/cards";
import type { Action } from "../game/engine";

interface Row {
  mode: string;
  street: string;
  heroAction: string;
  advice: string;
  rating: string;
  text: string;
  handId: number;
  stage: string;
  heroPosition: string;
  heroBB: number;
}

function runTournament(rng: () => number, mode: "free" | "technical") {
  const rows: Row[] = [];
  const controller = new GameController({
    smallBlind: 25,
    bigBlind: 50,
    startingStack: 10000,
    userSubscriptionLevel: mode,
  });
  controller.configureTournament({
    buyIn: 11,
    entrants: 200,
    stage: "inicio",
    handsPerLevel: 10,
    mode: "livre",
  });

  let handId = 0;
  let handsPlayed = 0;
  const MAX = 10_000;

  while (handsPlayed < MAX && !controller.tournamentOver) {
    if (controller.phase === "handOver") {
      handsPlayed++;
      handId++;
      controller.newHand();
      continue;
    }
    let guard = 0;
    while (!controller.isHeroTurn() && !controller.table.handOver && guard++ < 3000) {
      controller.botStep();
    }
    if (controller.table.handOver) continue;
    if (!controller.isHeroTurn()) break;

    const la = legalActions(controller.table);
    const r = rng();
    let action: Action;
    if (r < 0.3 && la.canFold) {
      action = { type: "fold" } as Action;
    } else if (r < 0.6 && la.canCall) {
      action = { type: "call" } as Action;
    } else if (la.canRaise) {
      action = {
        type: "raise",
        to: Math.max(la.minRaiseTo ?? 20, Math.floor((la.maxRaiseTo ?? 60) * (0.5 + rng() * 0.5))),
      } as Action;
    } else if (la.canCall) {
      action = { type: "call" } as Action;
    } else {
      action = { type: "fold" } as Action;
    }
    controller.heroAct(action);

    const posMap = seatPositions(controller.table);
    const pos = posMap.get(controller.heroSeat) ?? "MP";
    const stage = controller.tournament?.stage ?? "";
    const bb = controller.table.bigBlind || 50;
    const hero = controller.table.players[controller.heroSeat];
    const heroBB = Math.round((hero.stack + hero.committed) / bb);

    const fb: FeedbackItem[] = mode === "free" ? controller.feedbackFree : controller.feedbackTechnical;
    for (const f of fb) {
      rows.push({
        mode,
        street: f.street,
        heroAction: f.heroAction,
        advice: f.advice,
        rating: f.rating,
        text: f.text,
        handId,
        stage,
        heroPosition: pos,
        heroBB,
      });
    }
    controller.feedbackFree = [];
    controller.feedbackTechnical = [];
  }
  return rows;
}

function analyze(mode: string, list: Row[]) {
  const total = list.length;
  const uniq = new Set(list.map((r) => r.text));
  const freq = new Map<string, number>();
  for (const r of list) freq.set(r.text, (freq.get(r.text) ?? 0) + 1);
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const ratings = new Map<string, number>();
  for (const r of list) ratings.set(r.rating, (ratings.get(r.rating) ?? 0) + 1);

  const textsByStage = new Map<string, Set<string>>();
  for (const r of list) {
    const s = textsByStage.get(r.stage) ?? new Set();
    s.add(r.text);
    textsByStage.set(r.stage, s);
  }
  const textsByPos = new Map<string, Set<string>>();
  for (const r of list) {
    const s = textsByPos.get(r.heroPosition) ?? new Set();
    s.add(r.text);
    textsByPos.set(r.heroPosition, s);
  }
  const textsByRating = new Map<string, Set<string>>();
  for (const r of list) {
    const s = textsByRating.get(r.rating) ?? new Set();
    s.add(r.text);
    textsByRating.set(r.rating, s);
  }
  const hands = new Set(list.map((r) => r.handId));

  const report: string[] = [];
  report.push(`\n========== MODO ${mode.toUpperCase()} ==========`);
  report.push(`Feedbacks: ${total} em ${hands.size} mãos`);
  report.push(`Textos ÚNICOS: ${uniq.size} (${((uniq.size / Math.max(total, 1)) * 100).toFixed(1)}% de variedade)`);
  report.push(
    `Textos únicos por nota — boa:${textsByRating.get("boa")?.size ?? 0} ok:${textsByRating.get("ok")?.size ?? 0} imprecisa:${textsByRating.get("imprecisa")?.size ?? 0} ruim:${textsByRating.get("ruim")?.size ?? 0}`,
  );
  report.push(`Textos únicos por estágio — ${[...textsByStage.entries()].map(([k, v]) => `${k}:${v.size}`).join(" | ")}`);
  report.push(`Textos únicos por posição — ${[...textsByPos.entries()].map(([k, v]) => `${k}:${v.size}`).join(" | ")}`);
  report.push(`Notas: ${[...ratings.entries()].map(([k, v]) => `${k}:${v}`).join(" | ")}`);
  report.push(`\nTop 15 textos mais repetidos:`);
  for (const [t, n] of top) {
    report.push(`  [${n}x · ${((n / total) * 100).toFixed(1)}%] ${t.slice(0, 160)}`);
  }
  return report.join("\n");
}

describe("feedback diversity (simulação 20 mil mãos)", () => {
  it("coleta e analisa a variedade dos textos", async () => {
    const rng = seededRng(42);
    const rowsFree = runTournament(rng, "free");
    const rowsTech = runTournament(rng, "technical");

    console.log(analyze("free", rowsFree));
    console.log(analyze("technical", rowsTech));

    // Salva JSON bruto (apenas em ambiente com acesso a disco, ex.: local)
    if (fs.writeFileSync) {
      fs.writeFileSync(
        "/home/ubuntu/feedback_sim_raw.json",
        JSON.stringify({ free: rowsFree, technical: rowsTech }),
      );
      console.log("JSON bruto salvo: /home/ubuntu/feedback_sim_raw.json");
    } else {
      console.log("(fs indisponível neste ambiente — JSON bruto não salvo, console acima contém o relatório)");
    }
  });

  it("feedback de bolha/mesa final traz o sufixo de pressão", async () => {
    // Roda um torneio de campo médio até o campo drenar e checa se o texto
    // ganha o sufixo de bolha/mesa final quando o estágio chega lá.
    const rng = seededRng(7);
    const rows = runTournamentStage(rng, "free");
    const bubbleRows = rows.filter((r) => r.stage === "bolha" || r.stage === "mesa_final");
    const bubbleTexts = bubbleRows.filter((r) => /bolha|mesa final/i.test(r.text));
    console.log(
      `[tenso] mãos em estágio tenso: ${bubbleRows.length}; com texto de pressão: ${bubbleTexts.length}`,
    );
    console.log(
      "Exemplo:",
      bubbleTexts[0]?.text.slice(0, 200) ?? "(nenhum — campo não chegou na bolha neste seed)",
    );
  });
});

function runTournamentStage(
  rng: () => number,
  mode: "free" | "technical",
) {
  const rows: Row[] = [];
  const controller = new GameController({
    smallBlind: 25,
    bigBlind: 50,
    startingStack: 10000,
    userSubscriptionLevel: mode,
  });
  controller.configureTournament({
    buyIn: 11,
    entrants: 90,
    stage: "inicio" as any,
    handsPerLevel: 10,
    mode: "livre",
  });

  let handId = 0;
  let handsPlayed = 0;
  const MAX = 800;

  while (handsPlayed < MAX && !controller.tournamentOver) {
    if (controller.phase === "handOver") {
      handsPlayed++;
      handId++;
      controller.newHand();
      continue;
    }
    let guard = 0;
    while (!controller.isHeroTurn() && !controller.table.handOver && guard++ < 3000) {
      controller.botStep();
    }
    if (controller.table.handOver) continue;
    if (!controller.isHeroTurn()) break;

    const la = legalActions(controller.table);
    const r = rng();
    let action: Action;
    if (r < 0.3 && la.canFold) {
      action = { type: "fold" } as Action;
    } else if (r < 0.6 && la.canCall) {
      action = { type: "call" } as Action;
    } else if (la.canRaise) {
      action = {
        type: "raise",
        to: Math.max(la.minRaiseTo ?? 20, Math.floor((la.maxRaiseTo ?? 60) * (0.5 + rng() * 0.5))),
      } as Action;
    } else if (la.canCall) {
      action = { type: "call" } as Action;
    } else {
      action = { type: "fold" } as Action;
    }
    controller.heroAct(action);

    const posMap = seatPositions(controller.table);
    const pos = posMap.get(controller.heroSeat) ?? "MP";
    const st = controller.tournament?.stage ?? "";
    const bb = controller.table.bigBlind || 50;
    const hero = controller.table.players[controller.heroSeat];
    const heroBB = Math.round((hero.stack + hero.committed) / bb);

    const fb: FeedbackItem[] = mode === "free" ? controller.feedbackFree : controller.feedbackTechnical;
    for (const f of fb) {
      rows.push({
        mode,
        street: f.street,
        heroAction: f.heroAction,
        advice: f.advice,
        rating: f.rating,
        text: f.text,
        handId,
        stage: st,
        heroPosition: pos,
        heroBB,
      });
    }
    controller.feedbackFree = [];
    controller.feedbackTechnical = [];
  }
  return rows;
}
