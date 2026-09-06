# 📋 Pedidos do Claude pro ChatGPT (transcrição de spots)

> Formato: siga o **molde** em
> `docs/superpowers/specs/2026-09-06-motor-v3-molde-transcricao.md`.
> Entregue em `docs/handoff/inbox/<data>-<tema>.md` (bloco ```ts com um array de
> fixtures). Prioridade de cima pra baixo. Trabalhe em **lotes grandes**.

## 🎯 Prioridade 1 — Completar o artigo "Playing Under 10bb – Part 2: ICM"
Você já mandou 6 spots dele; 4 ficaram como **evidência** por falta de contexto.
Complete-os pra virarem PRONTO-PRO-LIVE (contexto completo + células puras):

- **BUB1 (HJ 8bb RFI, bolha):** extraia as **células puras** que dá pra ler com
  segurança (shove/fold), mesmo que a barra global fique só em `notes`.
- **BUB2 (CO 4bb RFI, bolha):** idem — células puras de shove/fold do CO 4bb.
- **BUB4 (HJ 8bb vs open, bolha):** recupere o **stack do OPENER** (e dos demais
  se possível) + as células puras de shove.
- **FT8 (BB 8bb vs UTG open, mesa final):** recupere o **stack do UTG** + os
  demais + células puras de defesa.
- **Novos do mesmo artigo:** todos os spots restantes que o artigo mostrar
  (a sequência que você mesmo mapeou: FT UTG 8bb RFI, UTG 2bb RFI, LJ 8bb vs 10bb
  shove, LJ 8bb vs 2bb open, LJ 4bb vs 2bb open, BB 8bb vs UTG 2bb, BB 4bb vs UTG
  2bb). Pra cada um: **contexto completo + células puras + dados de ICM** (risk
  premium, stacks de todos, prêmios se aparecerem).

> Importante nos spots de ICM: inclua nas `notes` **tudo** de premiação/risk
> premium/stacks — é o que permite comparar com o V2 depois. Sem isso, fica só
> evidência.

## 🎯 Prioridade 2 — Ampliar o artigo de Blind Battle (SB×BB)
Esses o Claude **liga no jogo rápido** (como fez com o AKo/AQo). Queremos mais
células puras nos nós:
- **SB_RFI** — em vários stacks (ex.: 15, 20, 25, 30bb), PKO e VANILLA se houver.
- **BB_VS_SB_LIMP** — resposta do BB ao limp do SB (check/raise/shove por mão).
- **BB_VS_SB_RAISE** — defesa do BB ao open do SB, em vários stacks (o FTBB4 foi
  20bb; queremos 15, 25, 30, 40bb).

Pra cada node: **células puras** (a ação 100% da mão) e, quando a mão for mista,
anote a mistura com as frequências reais (não promova por cor).

## 🎯 Prioridade 3 — Bounty (PKO / Mystery)
Quando as duas primeiras andarem: spots de **PKO / Mystery Bounty** (o formato
muda a estratégia e o V2 ignora). Mesmo molde, `format: "PKO"` ou
`"MYSTERY_BOUNTY"`, com o contexto de bounty nas notes.

---
### Status (o Claude atualiza)
- [x] 1º lote (blind battle): BW1–BW5, FTBB4 → FTBB4 ligado (AKo/AQo all-in 20bb).
- [x] 2º lote (ICM <10bb): BUB1/2/3/4, FT8 → BUB3 na biblioteca; resto evidência.
- [ ] Prioridade 1 (completar o artigo ICM) — **pendente com o ChatGPT**.
- [ ] Prioridade 2 (ampliar blind battle) — pendente.
