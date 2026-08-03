// ---------------------------------------------------------------------------
// Hook de áudio para a missão 1×1 — toca sons de tensão ao entrar,
// sons curtos por decisão (acerto/erro), e sons de vitória/derrota ao
// concluir um duelo. Usa Web Audio API (sem arquivos externos) para
// sons curtos de feedback e MP3 do public/ para sons mais longos.
// ---------------------------------------------------------------------------
import { useRef, useCallback } from "react";

function getBasePath(): string {
  const base = document.querySelector('script[type="module"]')?.getAttribute('src') || '';
  const match = base.match(/^(\/[a-zA-Z][^/]+\/(?:assets|dist)\/)/);
  if (match) return match[1].replace(/\/(?:assets|dist)\/$/, '/');
  const rootMatch = base.match(/^(\/assets\/)/);
  if (rootMatch) return '/';
  const legacy = base.match(/^(\/[^/]+\/)/);
  return legacy ? legacy[1] : '/';
}

// ---- SOM DE ACERTO (fichas batendo — chink) ----
function playCorrectSound(): void {
  try {
    const ctx = new AudioContext();
    // Dois tons curtos e brilhantes
    const freqs = [880, 1320]; // A5, E6
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.06);
      g.gain.setValueAtTime(0.07, ctx.currentTime + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.25);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + i * 0.06 + 0.25);
    });
  } catch {
    // silencioso
  }
}

// ---- SOM DE ERRO (tom grave — buz) ----
function playWrongSound(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // silencioso
  }
}

// ---- SOM DE TENSÃO (entrada na missão) ----
function playTensionSting(): void {
  try {
    const ctx = new AudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(80, ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(55, ctx.currentTime + 0.8);
    osc2.type = "square";
    osc2.frequency.setValueAtTime(140, ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(60, ctx.currentTime + 1.0);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 1.3);
    osc2.stop(ctx.currentTime + 1.3);
  } catch {
    // silencioso
  }
}

// ---- SOM DE VITÓRIA (acorde triunfal) ----
function playVictorySting(): void {
  try {
    const ctx = new AudioContext();
    const notes = [261.6, 329.6, 392.0, 523.3]; // C4, E4, G4, C5
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.08, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    masterGain.connect(ctx.destination);
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(0.04, ctx.currentTime + i * 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.5);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.5);
    });
  } catch {
    // silencioso
  }
}

// ---- SOM DE DERROTA (descida melancólica) ----
function playDefeatSting(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.8);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.0);
  } catch {
    // silencioso
  }
}

export function useDuelSound() {
  const audioEntryRef = useRef<HTMLAudioElement | null>(null);
  const audioWinRef = useRef<HTMLAudioElement | null>(null);
  const audioLoseRef = useRef<HTMLAudioElement | null>(null);
  const basePath = getBasePath();

  const loadAudios = useCallback(() => {
    if (!audioEntryRef.current) {
      audioEntryRef.current = new Audio(`${basePath}duel-sting.mp3`);
      audioEntryRef.current.volume = 0.4;
    }
    if (!audioWinRef.current) {
      audioWinRef.current = new Audio(`${basePath}duel-win.mp3`);
      audioWinRef.current.volume = 0.5;
    }
    if (!audioLoseRef.current) {
      audioLoseRef.current = new Audio(`${basePath}duel-sting.mp3`);
      audioLoseRef.current.volume = 0.3;
    }
  }, [basePath]);

  const playEntry = useCallback(() => {
    loadAudios();
    if (audioEntryRef.current) {
      audioEntryRef.current.currentTime = 0;
      audioEntryRef.current.play().catch(() => {
        playTensionSting();
      });
    } else {
      playTensionSting();
    }
  }, [loadAudios]);

  const playCorrect = useCallback(() => {
    playCorrectSound();
  }, []);

  const playWrong = useCallback(() => {
    playWrongSound();
  }, []);

  const playVictory = useCallback(() => {
    loadAudios();
    if (audioWinRef.current) {
      audioWinRef.current.currentTime = 0;
      audioWinRef.current.play().catch(() => {
        playVictorySting();
      });
    } else {
      playVictorySting();
    }
  }, [loadAudios]);

  const playDefeat = useCallback(() => {
    loadAudios();
    if (audioLoseRef.current) {
      audioLoseRef.current.currentTime = 0;
      audioLoseRef.current.play().catch(() => {
        playDefeatSting();
      });
    } else {
      playDefeatSting();
    }
  }, [loadAudios]);

  return { playEntry, playCorrect, playWrong, playVictory, playDefeat };
}
