/**
 * Relação cintura/altura (RCE): indicador simples de gordura abdominal. Valores
 * abaixo de 0,5 são o alvo usual ("cintura menor que metade da altura").
 */
export function relacaoCinturaAltura(cintura_cm: number, altura_cm: number): number {
  return Math.round((cintura_cm / altura_cm) * 100) / 100;
}

export function classificarRCE(rce: number): { rotulo: string; cor: string } {
  if (rce < 0.5) return { rotulo: "Dentro do alvo (< 0,5)", cor: "bg-emerald-100 text-emerald-800" };
  if (rce < 0.6) return { rotulo: "Atenção (0,5–0,6)", cor: "bg-amber-100 text-amber-800" };
  return { rotulo: "Risco aumentado (≥ 0,6)", cor: "bg-red-100 text-red-800" };
}
