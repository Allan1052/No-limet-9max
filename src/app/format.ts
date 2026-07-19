// Formatação de valores para exibição em big blinds (bb).
//
// O motor trabalha em fichas (necessário para o cálculo exato de potes e side
// pots). A interface, por sua vez, mostra tudo em bb — a unidade natural de
// estudo. Ex.: com BB = 50, "3000 fichas" vira "60bb" e "345" vira "6.9bb".

export function toBB(chips: number, bigBlind: number): string {
  if (bigBlind <= 0) return `${chips}`;
  const v = chips / bigBlind;
  const rounded = Math.round(v * 10) / 10;
  const s = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${s}bb`;
}
