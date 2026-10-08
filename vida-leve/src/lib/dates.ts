/** Data LOCAL (não UTC) no formato AAAA-MM-DD — evita "virar o dia" às 21h no Brasil. */
export function hojeISO(agora: Date = new Date()): string {
  const y = agora.getFullYear();
  const m = String(agora.getMonth() + 1).padStart(2, "0");
  const d = String(agora.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatarDataCurta(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}` : iso;
}

export function formatarDataLonga(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
