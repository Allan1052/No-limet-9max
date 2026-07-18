// ---------------------------------------------------------------------------
// Ajuste por profundidade de stack (medida em big blinds efetivos).
//
// A profundidade muda drasticamente o pré-flop:
//   - ~100bb+ : jogo "normal", ranges de abertura padrão.
//   - 25-40bb : levemente mais apertado no early, ainda com raise padrão.
//   - 13-25bb : território de raise/fold; poucas mãos especulativas.
//   - < ~12bb : push/fold — abrir = dar all-in (jam), não dá para dar raise
//               "pequeno" e foldar depois.
//
// Aqui devolvemos um fator de largura e sinalizamos a zona de push/fold. O
// tamanho concreto da aposta (jam vs. 2.3bb) fica no módulo de sizing/decisão.
// `adaptability` do perfil controla o quanto o bot realmente aplica o ajuste.
// ---------------------------------------------------------------------------

export interface StackDepthAdjust {
  /** Multiplicador de largura aplicado ao alvo de abertura. */
  factor: number;
  /** Verdadeiro quando abrir significa dar all-in. */
  pushFold: boolean;
}

/**
 * @param effectiveBB stack efetivo em big blinds
 * @param adaptability 0..1 do perfil — 1 aplica o ajuste cheio, 0 ignora.
 */
export function stackDepthAdjust(effectiveBB: number, adaptability = 1): StackDepthAdjust {
  let rawFactor: number;
  let pushFold = false;

  if (effectiveBB >= 60) rawFactor = 1.0;
  else if (effectiveBB >= 40) rawFactor = 1.0;
  else if (effectiveBB >= 25) rawFactor = 0.95;
  else if (effectiveBB >= 18) rawFactor = 0.9;
  else if (effectiveBB >= 13) {
    rawFactor = 0.85;
  } else {
    // Push/fold: a range de jam é relativamente ampla, mas o jogo muda de forma.
    rawFactor = 1.0;
    pushFold = true;
  }

  // Adaptabilidade interpola entre "não ajusta" (1.0) e o ajuste cheio.
  const factor = 1 + (rawFactor - 1) * adaptability;
  return { factor, pushFold };
}
