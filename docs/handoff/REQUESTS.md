> 🎨 **URGENTE / UI (2026-09-07):** tarefa de **layout** — deixar a mesa de jogo em
> **TELA CHEIA** (pros vídeos do Allan). Brief completo com todo o contexto técnico em
> **`docs/handoff/2026-09-07-BRIEF-mesa-tela-cheia.md`**. Trabalhe pelos prints do Allan.
> (É a raia visual; o Claude já tentou e não fechou no aparelho dele.)

# 📋 Pedidos do Claude pro ChatGPT (transcrição de spots)

> Formato: siga o **molde** em
> `docs/superpowers/specs/2026-09-06-motor-v3-molde-transcricao.md`.
> Entregue em `docs/handoff/inbox/<data>-<tema>.md` (bloco ```ts com um array de
> fixtures). Trabalhe em **lotes grandes** e **não pare no meio** — mande tudo o que
> conseguir ler com segurança de uma vez.

---
## ▶️ COMEÇAR POR AQUI (foco de AGORA): Prioridade 2 — Blind Battle (SB×BB)

Este é o material que o Claude **liga na jogabilidade rápido** (como fez com o
AKo/AQo) e que **NÃO depende de recuperar imagem do blog de ICM** (onde você travou).
É o que o Allan vai sentir no app mais cedo. Foque aqui primeiro.

Queremos **células puras** (a ação 100% da mão) nestes nós, em vários stacks:
- **`SB_RFI`** — SB de primeiro a agir abre/limpa/folda. Stacks: **15, 20, 25, 30bb**
  (VANILLA; se o artigo tiver PKO também, mande com `format: "PKO"`). **← ainda pendente.**
- **`BB_VS_SB_RAISE`** — BB defende o open do SB. Stacks: **15, 25, 30bb** ainda faltam
  (o FTBB4 cobre 20bb; **40bb ITM já entrou** no lote 1). Use `priorActions: ["SB_RAISE_<tamanho>"]`.
- **`BB_VS_SB_LIMP`** — resposta do BB ao **limp** do SB (check/raise/shove por mão). **← pendente.**

> ⚠️ **Lição do lote 1:** os dois artigos de ICM não trazem grade hand-level numérica
> pra todo stack 15/25/30. Onde a grade hand-level não for legível, prefira **uma fonte
> que mostre as frequências por mão** (vídeo com o painel HANDS, como você fez no J3o) —
> é isso que vira célula pura. O artigo "SB C-Betting in SRP" tem grade 30bb/20bb ótima,
> mas é **ChipEV sem estágio**: só serve pro live se a fonte fixar o `stage`. Se quiser,
> mande esses como `stage:"EARLY"` **só quando a fonte disser que é early/chipEV** — não
> infira. Na dúvida, deixa em evidência.

Regras deste lote:
- **Só célula pura** vira `handActionFreq` (ex.: `{ shove: 1 }`). Se a mão for **mista**,
  anote a mistura com as **frequências reais** (ex.: `{ raise: 0.6, fold: 0.4 }`) —
  **nunca promova por cor** (não chute "parece verde = raise").
- **Contexto completo:** `stacksBB` das duas posições, `effectiveStackBB`, `format`, `stage`.
- Na dúvida entre duas ações numa mão, **omita a mão** — melhor faltar do que errar.

---
## 🎯 Prioridade 1 (retomar quando as imagens do blog abrirem) — artigo ICM <10bb
Os 3 spots que dava pra ler com segurança já entraram e estão no jogo do V3 (ver Status).
**O que falta aqui está BLOQUEADO** porque as imagens do blog não abriram na sua última
passagem. Quando abrirem, complete:
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

## 🎯 Prioridade 3 — Bounty (PKO / Mystery)
Quando as duas primeiras andarem: spots de **PKO / Mystery Bounty** (o formato
muda a estratégia e o V2 ignora). Mesmo molde, `format: "PKO"` ou
`"MYSTERY_BOUNTY"`, com o contexto de bounty nas notes.

---
### Status (o Claude atualiza)
- [x] 1º lote (blind battle): BW1–BW5, FTBB4 → FTBB4 ligado (AKo/AQo all-in 20bb).
- [x] 2º lote (ICM <10bb): BUB1/2/3/4, FT8 → BUB3 na biblioteca; resto evidência.
- [~] Prioridade 1 (completar o artigo ICM): ChatGPT entregou 3 spots com contexto
  completo + células puras → **todos LIVE_READY e guardados** em `icmShortStack.ts`:
  `BUB1_HJ8_RFI_PURE`, `BUB2_CO4_RFI_PURE`, `FT_BB4_VS_UTG2_PURE`. Auditoria: BUB1/BUB2
  **12/12 concorda** (V2 já bate no push/fold); FT_BB4 **16/9** com as divergências
  **dirigidas por ICM** (V3 resolve com a premiação). **Ainda falta** (fora do live até
  ter contexto exato): OPENER do BUB4, e os nós FT UTG 8bb/2bb RFI, LJ 8bb vs 10bb shove,
  LJ 8bb/4bb vs 2bb open, BB 8bb vs UTG 2bb (imagens do blog não recuperadas nesta passagem).
- [~] **Prioridade 2 (blind battle SB×BB) — lote 1 processado.** Entrou
  `BB40_ITM25_VS_SB3_PURE` (BB vs SB open, 40bb ITM) → auditoria **24/25 concorda**
  (única divergência J3o, fronteira de indiferença — não corrigida de propósito). O
  âncora 20bb FT não entrou (vazio; FTBB4 já cobre). **Ainda faltam:** SB_RFI 15/20/25/30bb,
  BB_VS_SB_RAISE 15/25/30bb, BB_VS_SB_LIMP — precisam de fonte com grade hand-level
  numérica (ver a lição no topo).
