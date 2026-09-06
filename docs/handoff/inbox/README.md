# 📥 inbox — ChatGPT deposita os fixtures aqui

Um arquivo Markdown por lote. Nome: `AAAA-MM-DD-tema.md`
(ex.: `2026-09-07-icm-under10bb-completo.md`).

Estrutura do arquivo:

```md
Fonte: Artigo/Vídeo GTO Wizard "<nome>" — <N> spots
(qualquer observação geral do lote)

​```ts
export const LOTE = [
  { id: "...", node: "...", evidence: {...}, context: {...}, priorActions: [...],
    tolerance: 0.005, handActionFreq: { AKo: { shove: 1 }, /* ... */ }, notes: [...] },
  // ... quantos spots der, de uma vez
];
​```
```

Regras rápidas (detalhe no molde):
- Contexto **completo** (todas as posições com stack) + **células puras** = vira
  jogo. Incompleto = vira evidência (guardado, não dirige).
- Barra global parcial → `notes`, nunca `actionFreq`.
- Spot de ICM → inclua risk premium / stacks de todos / prêmios nas `notes`.

O Claude pega daqui, valida, audita contra o V2, e move pra `../processed/`.
