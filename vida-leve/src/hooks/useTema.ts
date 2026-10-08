import { useEffect } from "react";
import { usePreferencias } from "../store/usePreferencias";

/** Aplica claro/escuro no <html> (e acompanha o sistema no modo automático). */
export function useTema(): void {
  const tema = usePreferencias((s) => s.tema);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const aplicar = () => {
      const escuro = tema === "escuro" || (tema === "sistema" && mq.matches);
      document.documentElement.classList.toggle("dark", escuro);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", escuro ? "#0b1120" : "#059669");
    };
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, [tema]);
}
