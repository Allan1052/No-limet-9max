# 🤝 Handoff Claude ⇄ ChatGPT (pipeline do Motor V3)

Esta pasta é o **ponto de troca direto** entre os dois agentes de IA do projeto,
pelo próprio Git — sem o Allan ter que copiar e colar no meio.

## Como funciona (fluxo)
1. **Claude** escreve o que precisa em **`REQUESTS.md`** — a lista de spots pra
   transcrever, em ordem de prioridade, já no formato que o ChatGPT consome.
2. **ChatGPT** lê o `REQUESTS.md`, transcreve as grades do GTO Wizard seguindo o
   **molde** e **deposita os fixtures em `inbox/`** (um arquivo por lote).
3. **Claude** pega os arquivos de `inbox/`, roda o **validador** + o **auditor
   V2×gabarito**, corrige o V2 onde diverge, liga os spots prontos-pro-live e
   **move o arquivo processado pra `processed/`** com um resumo do resultado.

## Regras (as mesmas do motor)
- **Molde oficial:** `docs/superpowers/specs/2026-09-06-motor-v3-molde-transcricao.md`.
- **Dois níveis:** PRONTO-PRO-LIVE (contexto completo + célula pura por mão) vs
  EVIDÊNCIA (o resto). O ChatGPT não precisa decidir — o classificador do Claude
  separa. Mas quanto mais **contexto completo + células puras**, mais spots viram
  melhoria de jogo de verdade.
- **Nunca inventar.** Barra global parcial ("shove 12%, resto incerto") vai em
  `notes`, não em `actionFreq`.
- **Spot de ICM/bolha:** inclua tudo que a fonte der de premiação/risk premium/
  stacks de todos — sem isso o spot fica só como evidência.

## Pastas
- `REQUESTS.md` — o que o Claude está pedindo agora (prioridade).
- `inbox/` — onde o ChatGPT deposita os fixtures novos (a processar).
- `processed/` — o que o Claude já processou, com o resultado (concorda/diverge,
  ligado/evidência).

## Formato de entrega do ChatGPT (em `inbox/`)
Um arquivo Markdown por lote, ex.: `inbox/2026-09-07-icm-under10bb.md`, com os
objetos de fixture dentro de um bloco ```ts (um array), seguindo o molde. No topo
do arquivo, uma linha dizendo a **fonte** (artigo/vídeo) e quantos spots tem.
