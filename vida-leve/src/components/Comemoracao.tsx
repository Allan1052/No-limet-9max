import { useEffect, useRef } from "react";
import { useFesta } from "../store/useFesta";

const CORES = ["#10b981", "#0ea5e9", "#f59e0b", "#f43f5e", "#8b5cf6", "#facc15"];

/** Confete em canvas, sem biblioteca. Respeita "reduzir movimento". */
function Confete() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dpr = window.devicePixelRatio || 1;
    const L = (canvas.width = window.innerWidth * dpr);
    const A = (canvas.height = window.innerHeight * dpr);
    const pedacos = Array.from({ length: 140 }, () => ({
      x: L / 2 + (Math.random() - 0.5) * L * 0.3,
      y: A * 0.45,
      vx: (Math.random() - 0.5) * 22 * dpr,
      vy: (-Math.random() * 22 - 8) * dpr,
      g: 0.55 * dpr,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      w: (6 + Math.random() * 6) * dpr,
      h: (8 + Math.random() * 8) * dpr,
      cor: CORES[Math.floor(Math.random() * CORES.length)]!,
    }));
    let quadro = 0;
    let id = 0;
    const passo = () => {
      ctx.clearRect(0, 0, L, A);
      for (const p of pedacos) {
        p.vy += p.g;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.cor;
        ctx.globalAlpha = Math.max(0, 1 - quadro / 160);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (++quadro < 160) id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[61] h-full w-full" aria-hidden />;
}

export function Comemoracao() {
  const atual = useFesta((s) => s.fila[0]);
  const fechar = useFesta((s) => s.fechar);
  if (!atual) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-6 backdrop-blur-sm" onClick={fechar}>
      <Confete key={atual.titulo} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="festa-titulo"
        className="animar-surgir w-full max-w-sm rounded-3xl bg-superficie p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 text-6xl" aria-hidden>
          {atual.emoji}
        </div>
        <h2 id="festa-titulo" className="text-xl font-bold">
          {atual.titulo}
        </h2>
        <p className="mt-2 text-slate-600">{atual.texto}</p>
        <button type="button" className="botao-primario mt-5 w-full" onClick={fechar} autoFocus>
          Bora! 🎉
        </button>
      </div>
    </div>
  );
}
