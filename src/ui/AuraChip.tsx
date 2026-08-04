// Chip pequeno de "+6 áurea" / "−4 áurea" que aparece depois de cada decisão
// no treino. Positivo = dourado (farmou); negativo = vermelho suave (vazou).
import { useT } from "../i18n";

export function AuraChip({ delta }: { delta: number }) {
  const { t } = useT();
  if (!delta) return null;
  const plus = delta > 0;
  return (
    <div className="aura-chip-row">
      <span className={`aura-chip ${plus ? "plus" : "minus"}`}>
        {plus ? "+" : "−"}
        {Math.abs(delta)} {t("aura.word").toLowerCase()}
      </span>
    </div>
  );
}
