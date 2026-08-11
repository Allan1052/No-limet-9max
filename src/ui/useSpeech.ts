// Fala do coach (Text-to-Speech via Web Speech API). Fala a nota da jogada e a
// recomendação quando pedida. Degrada com elegância: sem suporte, `supported`
// é false e a UI não mostra o alto-falante.
import { useCallback, useMemo, useRef } from "react";

export function useSpeech() {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  const supported = !!synth;
  const speakingRef = useRef(false);

  const speak = useCallback(
    (text: string) => {
      if (!synth || !text) return;
      try {
        synth.cancel(); // não empilha — sempre a fala mais recente
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "pt-BR";
        u.rate = 1.05;
        u.pitch = 1;
        u.onstart = () => {
          speakingRef.current = true;
        };
        u.onend = () => {
          speakingRef.current = false;
        };
        u.onerror = () => {
          speakingRef.current = false;
        };
        const vs = synth.getVoices();
        const v = vs.find((x) => /pt[-_]?br/i.test(x.lang)) || vs.find((x) => /^pt/i.test(x.lang));
        if (v) u.voice = v;
        synth.speak(u);
      } catch {
        /* sem fala */
      }
    },
    [synth],
  );

  // O coach está falando agora? (para o comando de voz não ouvir a própria voz.)
  const isSpeaking = useCallback(() => speakingRef.current || !!synth?.speaking, [synth]);

  const cancel = useCallback(() => {
    try {
      synth?.cancel();
    } catch {
      /* nada */
    }
    speakingRef.current = false;
  }, [synth]);

  return useMemo(
    () => ({ supported, speak, isSpeaking, cancel }),
    [supported, speak, isSpeaking, cancel],
  );
}
