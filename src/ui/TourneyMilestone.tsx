// Avisos chamativos de marco do torneio: formação da MESA FINAL e início do
// HEADS-UP. Overlay dramático (dourado/felt) com brilho, vibração háptica e
// auto-dismiss — o mesmo padrão do MoneyRain, mas com peso de "grande momento".
import { useEffect, useMemo } from "react";

type Villain = { name: string; stackBB: number };

export function TourneyMilestone({
  kind,
  players = 9,
  heroBB = 0,
  villain,
  onDone,
}: {
  kind: "finalTable" | "headsUp";
  players?: number;
  heroBB?: number;
  villain?: Villain;
  onDone: () => void;
}) {
  useEffect(() => {
    try {
      navigator.vibrate?.(kind === "headsUp" ? [220, 90, 220, 90, 320] : [120, 60, 120, 60, 260]);
    } catch {
      /* sem vibração — segue só o visual */
    }
    const id = setTimeout(onDone, kind === "headsUp" ? 4200 : 4600);
    return () => clearTimeout(id);
  }, [kind, onDone]);

  // Faíscas caindo (só na mesa final — heads-up é mais "duelo", sem confete).
  const sparks = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        left: Math.round(Math.random() * 100),
        delay: Math.round(Math.random() * 1000),
        dur: 1600 + Math.round(Math.random() * 1500),
        icon: i % 3 === 0 ? "⭐" : i % 3 === 1 ? "✨" : "🏆",
      })),
    [],
  );

  if (kind === "finalTable") {
    return (
      <div className="milestone ms-final" onClick={onDone}>
        {sparks.map((s, i) => (
          <span
            key={i}
            className="ms-spark"
            style={{ left: `${s.left}%`, animationDelay: `${s.delay}ms`, animationDuration: `${s.dur}ms` }}
          >
            {s.icon}
          </span>
        ))}
        <div className="ms-card">
          <div className="ms-eyebrow">os {players} melhores</div>
          <div className="ms-title">MESA FINAL</div>
          <div className="ms-sub">Você chegou. Agora vale tudo. 🏆</div>
        </div>
      </div>
    );
  }

  return (
    <div className="milestone ms-hu" onClick={onDone}>
      <div className="ms-card">
        <div className="ms-eyebrow">só sobraram dois</div>
        <div className="ms-title ms-title-hu">HEADS-UP</div>
        <div className="ms-duel">
          <div className="ms-side ms-me">
            <span className="ms-name">Você</span>
            <span className="ms-stk">{heroBB}bb</span>
          </div>
          <div className="ms-vs">⚔️</div>
          <div className="ms-side">
            <span className="ms-name">{villain?.name ?? "Oponente"}</span>
            <span className="ms-stk">{villain?.stackBB ?? 0}bb</span>
          </div>
        </div>
        <div className="ms-sub">Um a um, pelo título.</div>
      </div>
    </div>
  );
}
