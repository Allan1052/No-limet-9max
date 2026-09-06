// ---------------------------------------------------------------------------
// ACELERADOR V3 — Validador de transcrição (parte 1 do "molde").
//
// Objetivo: pegar um fixture transcrito de material de solver (GTO Wizard) e
// dizer, de forma automática, se ele está CERTIFICADO-SEGURO pra entrar no motor
// V3 — sem depender do olho humano. Cada transcrição nova passa por aqui: se
// tiver erro (frequência que não soma 1, contexto incompleto, sem evidência,
// mão inexistente), o validador aponta. Isso deixa o ChatGPT/Manus produzir
// spots em massa com rede de segurança.
//
// Módulo PURO e de intake (não dirige nenhuma decisão). Reaproveita os tipos
// oficiais do V3 (ExternalBenchmarkFixture) pra não haver formato paralelo.
// ---------------------------------------------------------------------------
import type { ExternalBenchmarkFixture, HandActionFreq } from "../benchmarks/types";
import { allHandTypes } from "../../ranges/types";

const VALID_HAND_TYPES = new Set(allHandTypes());
const VALID_ACTIONS = new Set(["fold", "limp", "raise", "shove", "check", "call"]);

/** Uma frequência é válida se for número finito dentro de [0, 1]. */
function freqValid(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1;
}

/**
 * Um conjunto de frequências precisa ser não-vazio, cada uma em [0,1] e somar ~1.
 * O solver arredonda (ex.: 0.180+0.250+0.439+0.131 = 1.000, mas às vezes 0.999),
 * então aceitamos a soma dentro da `tolerance` do próprio fixture (+ folga mínima
 * pra ruído de ponto flutuante).
 */
function checkMixSumsToOne(
  entries: Array<[string, unknown]>,
  label: string,
  tolerance: number,
  errors: string[],
): void {
  if (entries.length === 0) {
    errors.push(`${label}: vazio (precisa de pelo menos uma ação).`);
    return;
  }
  let total = 0;
  for (const [action, freq] of entries) {
    if (!freqValid(freq)) {
      errors.push(`${label}: frequência inválida em "${action}" (precisa ser número entre 0 e 1).`);
      return;
    }
    total += freq;
  }
  const allow = Math.max(tolerance, 1e-6);
  if (Math.abs(total - 1) > allow) {
    errors.push(`${label}: as frequências somam ${total.toFixed(4)} — precisam somar 1 (tolerância ${allow}).`);
  }
}

/**
 * Valida um fixture certificado. Devolve a lista de erros encontrados (vazia =
 * fixture OK pra entrar). Não lança exceção: acumula tudo pra o transcritor ver
 * todos os problemas de uma vez.
 */
export function validateCertifiedFixture(fixture: ExternalBenchmarkFixture): string[] {
  const errors: string[] = [];
  // Tolerância pra soma de frequências (o solver arredonda). Se o campo estiver
  // inválido, isso é reportado à parte; aqui usamos um padrão seguro.
  const tol = typeof fixture.tolerance === "number" && fixture.tolerance > 0 ? fixture.tolerance : 0.005;

  // Identidade
  if (!fixture.id || !fixture.id.trim()) errors.push("id: obrigatório.");
  if (!fixture.node || !fixture.node.trim()) errors.push("node: obrigatório (ex.: SB_RFI, BB_VS_SB_LIMP).");

  // Evidência — CERTIFICADO exige solver + fonte rastreável (vídeo+minuto OU nota).
  const ev = fixture.evidence;
  if (!ev) {
    errors.push("evidence: obrigatório.");
  } else if (ev.level === "CERTIFIED") {
    if (!ev.solver) errors.push("evidence.solver: obrigatório em CERTIFICADO (GTO_WIZARD ou HRC).");
    const hasVideo = !!ev.videoId && !!ev.timestamp;
    const hasNote = !!ev.note && ev.note.trim().length > 0;
    if (!hasVideo && !hasNote) {
      errors.push("evidence: CERTIFICADO exige videoId+timestamp OU uma nota citando a fonte (artigo/imagem).");
    }
  }

  // Contexto exato (sem isso o V3 nunca casa um spot no live)
  const c = fixture.context;
  if (!c) {
    errors.push("context: obrigatório.");
  } else {
    if (!c.format) errors.push("context.format: obrigatório (VANILLA, PKO ou MYSTERY_BOUNTY).");
    if (!c.stage) errors.push("context.stage: obrigatório (EARLY, MIDDLE, BUBBLE, IN_THE_MONEY, FINAL_TABLE).");
    if (!Array.isArray(c.positions) || c.positions.length < 2) {
      errors.push("context.positions: precisa listar pelo menos 2 posições (ex.: [\"SB\",\"BB\"]).");
    }
    if (!(typeof c.effectiveStackBB === "number" && c.effectiveStackBB > 0)) {
      errors.push("context.effectiveStackBB: obrigatório e > 0.");
    }
    if (!c.stacksBB || typeof c.stacksBB !== "object") {
      errors.push("context.stacksBB: obrigatório (stack de cada posição, em bb).");
    } else if (Array.isArray(c.positions)) {
      for (const pos of c.positions) {
        if (!(typeof c.stacksBB[pos] === "number" && c.stacksBB[pos] > 0)) {
          errors.push(`context.stacksBB["${pos}"]: faltando ou inválido (todas as posições precisam de stack em bb).`);
        }
      }
    }
  }

  // Tolerância (margem de arredondamento do solver)
  if (!(typeof fixture.tolerance === "number" && fixture.tolerance > 0 && fixture.tolerance <= 0.1)) {
    errors.push("tolerance: precisa ser um número em (0, 0.1] (ex.: 0.005).");
  }

  // Um fixture precisa certificar ALGO: a barra global (actionFreq) OU as células
  // mão-a-mão (handActionFreq). A barra global é OPCIONAL — quando não é legível
  // na fonte, não se inventa; o que dirige o live são as células por mão mesmo.
  const hasGlobal = !!fixture.actionFreq && typeof fixture.actionFreq === "object";
  const hasHands = !!fixture.handActionFreq && Object.keys(fixture.handActionFreq).length > 0;
  if (!hasGlobal && !hasHands) {
    errors.push("Fixture vazio: precisa de actionFreq (barra global) OU handActionFreq (células por mão).");
  }
  // Frequências GLOBAIS do node (o que aparece na barra do solver) — só valida se presente.
  if (hasGlobal) {
    const entries = Object.entries(fixture.actionFreq!);
    for (const [action] of entries) {
      if (!VALID_ACTIONS.has(action)) errors.push(`actionFreq: ação desconhecida "${action}".`);
    }
    checkMixSumsToOne(entries, "actionFreq", tol, errors);
  }

  // Frequências MÃO-A-MÃO (o que dirige o live). Opcional, mas quando existe tem
  // que ser impecável: mão válida, ações válidas, cada mão somando 1.
  if (fixture.handActionFreq) {
    for (const [hand, mix] of Object.entries(fixture.handActionFreq) as Array<[string, HandActionFreq]>) {
      if (!VALID_HAND_TYPES.has(hand)) {
        errors.push(`handActionFreq: mão inválida "${hand}" (use o código padrão: AKs, AKo, TT, 72o...).`);
        continue;
      }
      const entries = Object.entries(mix);
      for (const [action] of entries) {
        if (!VALID_ACTIONS.has(action)) errors.push(`handActionFreq["${hand}"]: ação desconhecida "${action}".`);
      }
      checkMixSumsToOne(entries, `handActionFreq["${hand}"]`, tol, errors);
    }
  }

  // Sizing certificado (opcional). Raise nunca pode ser <= 1bb; freqs, se todas
  // declaradas, somam 1.
  if (fixture.actionSizing) {
    for (const [action, options] of Object.entries(fixture.actionSizing)) {
      if (!options || options.length === 0) {
        errors.push(`actionSizing["${action}"]: precisa de pelo menos um tamanho.`);
        continue;
      }
      for (const opt of options) {
        if (!(typeof opt.sizeBB === "number" && Number.isFinite(opt.sizeBB) && opt.sizeBB > 0)) {
          errors.push(`actionSizing["${action}"]: sizeBB inválido.`);
        }
        if (action === "raise" && opt.sizeBB <= 1) {
          errors.push(`actionSizing["raise"]: sizeBB precisa ser > 1bb (raise total, não incremento).`);
        }
        if (opt.freq !== undefined && !freqValid(opt.freq)) {
          errors.push(`actionSizing["${action}"]: freq inválida.`);
        }
      }
      const declared = options.filter((o) => o.freq !== undefined);
      if (declared.length === options.length && declared.length > 0) {
        const total = declared.reduce((s, o) => s + (o.freq ?? 0), 0);
        if (Math.abs(total - 1) > 1e-6) {
          errors.push(`actionSizing["${action}"]: as frequências de tamanho somam ${total.toFixed(4)} — precisam somar 1.`);
        }
      }
    }
  }

  return errors;
}

/** Açúcar: true quando o fixture passou sem nenhum erro. */
export function isCertifiedFixtureValid(fixture: ExternalBenchmarkFixture): boolean {
  return validateCertifiedFixture(fixture).length === 0;
}
