// Onde o regex de blinds está no parseHandBlock? buscar linhas com /\( e Y/Y
const header1 = `PokerStars Hand #325678901234: Hold'em No Limit ($0.50/$1.00 USD) - 2026/08/21 1:23:45 AM (ET)`;
const header2 = `PokerStars Hand #325678901234: Hold'em No Limit ($0.50/$1.00)`;
const header3 = `PokerStars Hand #325678901234:  Hold'em No Limit (50/100)`;
for (const [label, h] of Object.entries({ real: header1, noUSD: header2, chips: header3 })) {
  const m = h.match(/\(\s*([\d.,]+)\s*\/\s*([\d.,]+)/);
  console.log(label, "=>", m ? `${m[1]}/${m[2]}` : "NENHUMA");
}
console.log("Nota: \\$ quebra a captura — o PokerStars real usa $0.50/$1.00, que não casa com [\\d.,]");
