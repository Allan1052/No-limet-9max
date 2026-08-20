// Auditoria read-only das dicas (Simples + Técnico) do app Call ou Fold.
// Gera ~65k tips (spots × ações × stacks) e compara o que
// os cards dizem contra a linha do próprio motor (preflopDecision) como
// ground truth comportamental.
// NÃO edita nada — só lê e gera relatório JSON + amostras.
import fs from "fs";
import path from "path";
import { preflopDecision, type PreflopContext } from "../src/ranges/preflop";
import { BASELINE_PROFILE } from "../src/bots/profiles";
import { makeCard } from "../src/engine/cards";
import { allHandTypes } from "../src/ranges/types";
import { getHandCommentary } from "../src/ui/handCommentary";

interface HandShape {
  label: string;
  pair: boolean;
  suited: boolean;
  rankHi: number;
  rankLo: number;
}

function classifyLocal(ht: string): HandShape {
  const idx = (c: string) => "23456789TJQKA".indexOf(c);
  if (ht.length === 2) {
    const r = 2 + idx(ht[0]);
    return { label: ht, pair: true, suited: true, rankHi: r, rankLo: r };
  }
  const suited = ht.endsWith("s");
  const hi = 2 + idx(ht[0]);
  const lo = 2 + idx(ht[1]);
  return { label: ht, pair: false, suited, rankHi: hi, rankLo: lo };
}

const POSITIONS = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN", "SB"] as const;
const STACKS = [5, 10, 15, 25, 40, 60, 100, 200];
const HERO_ACTIONS = ["Raise", "Call", "Fold", "3-bet", "4-bet"] as const;

function handFromText(ht: string): [number, number] {
  const idx = (c: string) => "23456789TJQKA".indexOf(c);
  if (ht.length === 2) {
    const r = 2 + idx(ht[0]);
    return [makeCard(r, 0), makeCard(r, 1)];
  }
  if (ht.endsWith("s")) {
    return [makeCard(2 + idx(ht[0]), 0), makeCard(2 + idx(ht[1]), 0)];
  }
  return [makeCard(2 + idx(ht[0]), 0), makeCard(2 + idx(ht[1]), 1)];
}

interface Issue {
  category: string;
  severity: "alto" | "medio" | "baixo";
  detail: string;
  sample: string;
}

interface SpotResult {
  hand: string;
  shape: string;
  pos: string;
  bb: number;
  heroAction: string;
  motorAction: string;
  rating: string;
  catName: string;
  tipFree: string | null;
  tipTech: string | null;
  issues: Issue[];
}

// Faixas de equity GTO esperadas por categoria (vs range médio de confronto).
// Usadas para detectar números citados que destoam demais.
const EXPECTED_EQUITY: Record<string, [number, number]> = {
  premium: [66, 86],
  mediumPair: [42, 62],
  smallPair: [32, 50],
  bigAce: [38, 52],
  goodAce: [32, 44],
  suitedAceMedium: [30, 42],
  weakAce: [24, 38],
  suitedConnector: [36, 48],
  weakBroadway: [28, 42],
  mediumHand: [28, 42],
  trash: [15, 32],
};

const HIPERBOLES = /\b(única linha|sempre (é|foi|foi a)|nunca deve|100% do (range|pote))/i;

function auditPhrase(
  hand: string,
  shape: HandShape,
  pos: string,
  bb: number,
  heroAction: string,
  motorAction: string,
  rating: string,
  catName: string,
  line: string,
  mode: "free" | "technical",
): Issue[] {
  const issues: Issue[] = [];
  const lower = line.toLowerCase();

  // 1) Texto genérico trocado: weakAce usa vocabulário de "Ás baixo/fraco" para AQo/AJo/AKo
  if (catName === "weakAce" && shape.rankLo >= 10) {
    if (/á[sx] (off\b|offsuit|fraco|baixo|médio| off )|fraco de mp|kicker morto/i.test(line)) {
      issues.push({
        category: "texto_generico_trocado",
        severity: "alto",
        detail: `weakAce aplica vocabulário de Ax baixo a ${hand} (kicker ${shape.rankLo >= 12 ? "alto" : "forte"})`,
        sample: line.slice(0, 150),
      });
    }
  }
  // goodAce (AJs+) usando "kicker morto" — kicker morto não existe em Ax suited
  if (catName === "goodAce" && /kicker morto/i.test(line)) {
    issues.push({
      category: "texto_generico_trocado",
      severity: "alto",
      detail: `"kicker morto" não existe em ${hand} (suited, kicker alto)`,
      sample: line.slice(0, 150),
    });
  }

  // 2) Números incompatíveis com a categoria da mão
  for (const m of line.matchAll(/(~?\d{1,2}(?:[.,]\d+)?%)/g)) {
    const num = parseFloat(m[1].replace(",", "."));
    if (isNaN(num) || num > 100) continue;
    const [lo, hi] = EXPECTED_EQUITY[catName] ?? [25, 45];
    if (num < lo - 14 || num > hi + 14) {
      issues.push({
        category: "numero_incompativel",
        severity: "alto",
        detail: `Equity ${num}% citada para ${catName} fora da faixa GTO (${lo}-${hi}%)`,
        sample: line.slice(Math.max(0, (m.index ?? 0) - 55), (m.index ?? 0) + 75),
      });
    }
  }
  // stacks citados que destoam do spot (ex: "170bb deep" num spot de 5bb)
  for (const m of line.matchAll(/(\d{2,3})\s*bb/gi)) {
    const num = parseInt(m[1]);
    if (num > bb * 3) {
      issues.push({
        category: "stack_ignorada",
        severity: "alto",
        detail: `Spot de ${bb}bb com frase citando ${num}bb`,
        sample: line.slice(Math.max(0, (m.index ?? 0) - 55), (m.index ?? 0) + 75),
      });
    }
  }

  // 3) Hiperboles absolutas
  if (HIPERBOLES.test(line)) {
    issues.push({
      category: "hiperbole_absoluta",
      severity: "baixo",
      detail: "Absolutismo: 'única linha', 'sempre', 'nunca deve'",
      sample: line.slice(0, 150),
    });
  }

  // 4) Contradição com o spot: elogio no spot errado
  if (rating === "imprecisa" && /jogada (ótima|muito boa|certa|perfeita)|seguiu a frequência principal/i.test(line)) {
    issues.push({
      category: "contradicao_spot",
      severity: "alto",
      detail: `Elogia a jogada em spot classificado impreciso (motor: ${motorAction})`,
      sample: line.slice(0, 150),
    });
  }
  if (rating === "boa" && /não era pra essa cadeira|pagar aqui é|só chamar para perder|paga caro/i.test(line) && heroAction === motorAction) {
    issues.push({
      category: "contradicao_spot",
      severity: "alto",
      detail: `Criticando a jogada em spot classificado BOA (motor: ${motorAction})`,
      sample: line.slice(0, 150),
    });
  }

  // 5) Posição trocada: frase atribui a POSIÇÃO DO HERÓI a uma cadeira errada
  // (ex.: "de UTG, KQo é peso morto" quando o herói ESTÁ em UTG)
  if (/^de (UTG|early|MP|middle)[,:.]?\s/i.test(line.trim())) {
    if (pos !== "UTG" && pos !== "UTG1" && pos !== "MP" && pos !== "LJ" && pos !== "HJ") {
      issues.push({
        category: "posicao_ignorada",
        severity: "medio",
        detail: "Frase fala do herói como se estivesse em early/UTG (herói está em late)",
        sample: line.slice(0, 150),
      });
    }
  }

  return issues;
}

function run() {
  const hands = allHandTypes();
  const results: SpotResult[] = [];

  for (const ht of hands) {
    const [c1, c2] = handFromText(ht);
    const cat = classifyLocal(ht);
    for (const pos of POSITIONS) {
      for (const bb of STACKS) {
        const ctxG: PreflopContext = {
          heroPosition: pos,
          hand: [c1, c2],
          effectiveBB: bb,
          profile: { ...BASELINE_PROFILE },
          variant: "holdem",
        };
        let motorAction = "?";
        try {
          motorAction = preflopDecision(ctxG).action;
        } catch {
          motorAction = "ERROR";
        }
        const actionsForHand = [motorAction, ...HERO_ACTIONS.filter((a) => a !== motorAction)];
        const sampled = actionsForHand.slice(0, 3);
        for (const heroAction of sampled) {
          const rating = heroAction === motorAction ? "boa" : "imprecisa";
          const ctxTip: any = {
            heroHand: [c1, c2],
            position: pos,
            heroAction,
            heroBB: bb,
            preflop: true,
            rating,
            heroStack: bb,
          };
          const free = getHandCommentary(ctxTip, "free");
          const tech = getHandCommentary(ctxTip, "technical");
          const issues: Issue[] = [];
          for (const [mode, tip] of [
            ["free", free?.lines[0] ?? null],
            ["technical", tech?.lines[0] ?? null],
          ] as const) {
            if (!tip) continue;
            issues.push(...auditPhrase(ht, cat, pos, bb, heroAction, motorAction, rating, cat.label, tip, mode));
          }
          results.push({
            hand: ht,
            shape: cat.label,
            pos,
            bb,
            heroAction,
            motorAction,
            rating,
            catName: cat.label,
            tipFree: free?.lines[0] ?? null,
            tipTech: tech?.lines[0] ?? null,
            issues,
          });
        }
      }
    }
  }

  fs.mkdirSync(path.join(process.cwd(), "audit-out"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), "audit-out", "spots.json"), JSON.stringify(results));

  const totalTips = results.length * 2;
  const withIssues = results.filter((r) => r.issues.length > 0).length;
  const totalIssues = results.reduce((s, r) => s + r.issues.length, 0);
  console.log(`Total spots: ${results.length} | Tips auditadas: ${totalTips} | Spots com problema: ${withIssues} | Problemas: ${totalIssues}`);
  const bySev: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const r of results) for (const i of r.issues) {
    bySev[i.severity] = (bySev[i.severity] ?? 0) + 1;
    byType[i.category] = (byType[i.category] ?? 0) + 1;
  }
  console.log("Por severidade:", JSON.stringify(bySev));
  console.log("Por tipo:", JSON.stringify(byType, null, 2));
}

run();
