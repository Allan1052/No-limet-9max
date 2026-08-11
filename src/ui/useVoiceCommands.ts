// Comando de voz para as ações do jogo (Web Speech API — Chrome/Android).
// O jogador fala "fold", "call", "raise" (ou variações em PT) e a ação dispara.
// Degrada com elegância: em navegadores sem suporte, `supported` é false e a UI
// simplesmente não mostra o microfone.
import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceCmd = "fold" | "check" | "call" | "raise" | "allin";

export interface VoiceParse {
  cmd: VoiceCmd | null;
  /** Valor absoluto falado (em bb ou fichas, conforme a unidade da tela). */
  amount?: number;
  /** Porcentagem do pote falada ("60 por cento", "75%"). */
  percent?: number;
}

// Ordem importa: all-in antes de "raise"/"call" para não ser engolido.
const PATTERNS: [RegExp, VoiceCmd][] = [
  [/\ball[\s-]?in\b|\btudo\b/i, "allin"],
  [/\bfold(ar|ei)?\b|\bdesist|\bcorr(e|er|i)\b/i, "fold"],
  [/\bchec?k?\b|\bmesa\b|\bpass(o|a|ar)\b/i, "check"],
  [/\bcall\b|\bc[óo]l\b|\bpag(a|ar|o|ou|uei)\b/i, "call"],
  [/\brais(e|er)?\b|\br[ei]is\b|\baument(a|ar|o|ei)\b|\bapost(a|ar|o|ei)\b|\bsob(e|i|ir|o)\b/i, "raise"],
];

// Números falados por extenso mais comuns (0–20 + dezenas), pra quando o motor
// transcreve "vinte" em vez de "20".
const WORD_NUM: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, "três": 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13,
  quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18,
  dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
  setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100,
};

function firstNumberWord(t: string): number | undefined {
  for (const w of t.split(/[^a-zà-ú]+/i)) {
    if (w && w in WORD_NUM) return WORD_NUM[w];
  }
  return undefined;
}

function parse(text: string): VoiceParse {
  const t = text.toLowerCase();
  let cmd: VoiceCmd | null = null;
  for (const [re, c] of PATTERNS) if (re.test(t)) { cmd = c; break; }

  // Porcentagem do pote: "60 por cento", "75%".
  let percent: number | undefined;
  const pm = t.match(/(\d{1,3})\s*(%|por\s*cento|porcento)/);
  if (pm) percent = Number(pm[1]);

  // Valor absoluto: primeiro número (dígitos), ignorando o usado no percentual.
  let amount: number | undefined;
  const nums = (t.match(/\d+(?:[.,]\d+)?/g) || []).map((n) => Number(n.replace(",", ".")));
  if (percent !== undefined) {
    const i = nums.indexOf(percent);
    if (i >= 0) nums.splice(i, 1);
  }
  if (nums.length) amount = nums[0];
  else if (percent === undefined) amount = firstNumberWord(t);

  return { cmd, amount, percent };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useVoiceCommands(onCommand: (p: VoiceParse) => void) {
  const SR =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : undefined;
  const supported = !!SR;
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<any>(null);
  const wantRef = useRef(false); // usuário quer ouvir? (para reiniciar sozinho)
  const onCmdRef = useRef(onCommand);
  onCmdRef.current = onCommand;

  useEffect(() => {
    if (!supported) return;
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r.isFinal) continue;
        // Testa as alternativas — pega a 1ª que traga comando, valor ou %.
        let hit: VoiceParse | null = null;
        for (let a = 0; a < r.length && !hit; a++) {
          const p = parse(r[a].transcript || "");
          if (p.cmd || p.amount !== undefined || p.percent !== undefined) hit = p;
        }
        if (hit) onCmdRef.current(hit);
      }
    };
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microfone bloqueado — libere a permissão para usar a voz.");
        wantRef.current = false;
        setListening(false);
      }
    };
    rec.onend = () => {
      // O motor encerra sozinho após um tempo; reinicia enquanto o usuário quer.
      if (wantRef.current) {
        try {
          rec.start();
        } catch {
          /* já iniciando */
        }
      } else {
        setListening(false);
      }
    };
    recRef.current = rec;
    return () => {
      wantRef.current = false;
      try {
        rec.stop();
      } catch {
        /* nada */
      }
      recRef.current = null;
    };
  }, [supported, SR]);

  const start = useCallback(() => {
    if (!recRef.current) return;
    setError(null);
    wantRef.current = true;
    try {
      recRef.current.start();
    } catch {
      /* já rodando */
    }
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    wantRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* nada */
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    (wantRef.current ? stop : start)();
  }, [start, stop]);

  return { supported, listening, error, toggle };
}
