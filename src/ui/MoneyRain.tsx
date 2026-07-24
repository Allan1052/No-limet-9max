// Comemoração de ITM: chuva de dinheiro + vibração do aparelho quando a bolha
// estoura. Some sozinha após alguns segundos.
import { useEffect, useMemo } from "react";
import { useT } from "../i18n";

export function MoneyRain({ onDone }: { onDone: () => void }) {
  const { t } = useT();

  // Vibração háptica (quando suportada) no momento da comemoração.
  useEffect(() => {
    try {
      navigator.vibrate?.([120, 60, 120, 60, 240]);
    } catch {
      /* sem vibração — segue só o visual */
    }
    const id = setTimeout(onDone, 4800);
    return () => clearTimeout(id);
  }, [onDone]);

  // Posições/atrasos aleatórios dos ícones caindo (fixos por render).
  const drops = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: Math.round(Math.random() * 100),
        delay: Math.round(Math.random() * 1500),
        dur: 2200 + Math.round(Math.random() * 1600),
        icon: i % 3 === 0 ? "💵" : "💰",
      })),
    [],
  );

  return (
    <div className="money-rain" onClick={onDone}>
      <div className="money-banner">🫧 {t("itm.toast")}</div>
      {drops.map((d, i) => (
        <span
          key={i}
          className="coin"
          style={{
            left: `${d.left}%`,
            animationDelay: `${d.delay}ms`,
            animationDuration: `${d.dur}ms`,
          }}
        >
          {d.icon}
        </span>
      ))}
    </div>
  );
}
