// ---------------------------------------------------------------------------
// Coach falado — usa a Web Speech API do navegador para o coach "falar" o
// feedback em voz feminina em português. Zero custo, zero backend, funciona
// offline. Prefere vozes femininas em PT-BR quando disponíveis.
// ---------------------------------------------------------------------------

export type SpeechState = "idle" | "speaking" | "paused";

let currentState: SpeechState = "idle";

const STORAGE_KEY = "coach_auto_speak";

/** Retorna true se o auto-speak está habilitado. */
export function isAutoSpeakEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Habilita ou desabilita o auto-speak. */
export function setAutoSpeak(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    /* ignora */
  }
}

/** Encontra a melhor voz feminina em português disponível. */
function findVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  // Prioriza vozes PT-BR femininas
  const ptFemale = voices.find(
    (v) =>
      (v.lang.startsWith("pt") || v.lang.startsWith("br")) &&
      (v.name.toLowerCase().includes("female") ||
        v.name.toLowerCase().includes("femin") ||
        v.name.toLowerCase().includes("helena") ||
        v.name.toLowerCase().includes("luciana") ||
        v.name.toLowerCase().includes("google") ||
        v.name.toLowerCase().includes("samantha") ||
        v.name.toLowerCase().includes("karen") ||
        v.name.toLowerCase().includes("moira"))
  );
  // Qualquer voz PT
  const ptAny = voices.find((v) => v.lang.startsWith("pt"));
  // Qualquer voz disponível
  return ptFemale ?? ptAny ?? voices[0] ?? null;
}

/** Carrega as vozes (async em alguns browsers). */
function loadVoices(): void {
  speechSynthesis.getVoices();
}

// Garantir que vozes estão carregadas
if (typeof window !== "undefined") {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

/**
 * Fala um texto com a voz do coach.
 * Retorna uma Promise que resolve quando termina de falar.
 */
export function speakCoach(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    // Cancelar fala anterior
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = findVoice();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = "pt-BR";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      currentState = "speaking";
    };
    utterance.onend = () => {
      currentState = "idle";
      resolve();
    };
    utterance.onerror = () => {
      currentState = "idle";
      resolve();
    };

    currentState = "speaking";
    speechSynthesis.speak(utterance);
  });
}

/** Para a fala atual. */
export function stopCoach(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    speechSynthesis.cancel();
    currentState = "idle";
  }
}

/** Pausa a fala atual. */
export function pauseCoach(): void {
  if (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    currentState === "speaking"
  ) {
    speechSynthesis.pause();
    currentState = "paused";
  }
}

/** Retoma a fala pausada. */
export function resumeCoach(): void {
  if (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    currentState === "paused"
  ) {
    speechSynthesis.resume();
    currentState = "speaking";
  }
}

/** Retorna o estado atual do speech. */
export function getSpeechState(): SpeechState {
  return currentState;
}

/** Retorna true se o speechSynthesis está disponível. */
export function isSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
