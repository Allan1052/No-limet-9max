// Rede de segurança contra "tela branca": se qualquer parte do app lançar um
// erro no render, mostramos uma tela de recuperação (com estilos inline, que
// não dependem do CSS ter carregado) e dois botões — recarregar, ou limpar os
// dados salvos e recomeçar (útil quando um save antigo/corrompido derruba o app).
import { Component, type ReactNode, type CSSProperties } from "react";

interface State {
  error: Error | null;
}

async function hardReset(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    localStorage.clear();
  } catch {
    /* segue para o reload */
  }
  // Cache-buster: força buscar o index.html novo da rede (evita apontar para
  // um bundle antigo que já não existe no servidor).
  const url = new URL(location.href);
  url.searchParams.set("u", Date.now().toString());
  location.replace(url.toString());
}

function reloadFresh(): void {
  const url = new URL(location.href);
  url.searchParams.set("u", Date.now().toString());
  location.replace(url.toString());
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // eslint-disable-next-line no-console
    console.error("Call ou Fold — erro capturado:", error);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    const box: CSSProperties = {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      padding: 24,
      textAlign: "center",
      background: "#0d0f0d",
      color: "#e8e6dc",
      fontFamily: "system-ui, sans-serif",
    };
    const btn: CSSProperties = {
      border: "1px solid #c9b458",
      background: "linear-gradient(180deg,#d4af37,#c9b458)",
      color: "#0d0f0d",
      fontWeight: 800,
      fontSize: 15,
      padding: "12px 18px",
      borderRadius: 10,
      cursor: "pointer",
      width: "min(320px, 90vw)",
    };
    const btn2: CSSProperties = { ...btn, background: "transparent", color: "#c9b458" };
    return (
      <div style={box}>
        <div style={{ fontSize: 40 }}>♠️</div>
        <h2 style={{ color: "#d4af37", margin: 0 }}>Ops, algo travou.</h2>
        <p style={{ color: "#9a988c", maxWidth: 420, lineHeight: 1.5, margin: 0 }}>
          Não se preocupe — ninguém perdeu nada. Toque em recarregar. Se continuar,
          use “Limpar e recomeçar” (isso zera os dados salvos neste aparelho).
        </p>
        <button style={btn} onClick={reloadFresh}>
          🔄 Recarregar
        </button>
        <button style={btn2} onClick={hardReset}>
          Limpar e recomeçar
        </button>
      </div>
    );
  }
}
