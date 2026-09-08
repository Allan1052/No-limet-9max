# Premium Table Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidar a mesa fullscreen existente em uma experiência mobile premium e coerente, sem tocar no motor.

**Architecture:** Manter a arquitetura atual de `100dvh` e controles sobrepostos. A mudança será predominantemente CSS: reduzir peso visual dos pods, reforçar hierarquia do herói/ator, limpar o centro da mesa e integrar melhor os controles ao feltro. O contrato mobile será atualizado antes do CSS para garantir TDD observável no CI.

**Tech Stack:** React, TypeScript, CSS, Vitest, Vite, GitHub Actions/GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-07-premium-table-consolidation-design.md`

## Global Constraints
- Não alterar `src/ranges`, `src/bots`, `src/game` ou `src/v3`.
- Preservar o modo fullscreen atual e safe-area.
- Não copiar branding/assets do GGPoker.
- Atualizar `MUDANCAS.md` em português simples.
- Sem force-push.
- Deploy somente depois de testes e build verdes.

---

### Task 1: Contrato visual premium

**Files:**
- Modify: `src/ui/mobilePolish.contract.test.ts`

**Interfaces:**
- Consumes: CSS textual de `tableModern.css` e `controlsHierarchy.css`.
- Produces: contrato que exige pods mais leves e cockpit integrado.

- [ ] **Step 1: Write the failing test**

Adicionar testes que exijam seletores/regras novas e específicas:

```ts
it("reduz o peso visual dos pods no modo imersivo", () => {
  expect(tableCss).toContain(".app.nav-hidden .table-modern .seat .pod");
  expect(tableCss).toContain("background: rgba(8,12,10,.68);");
});

it("mantém herói e jogador ativo como focos da mesa", () => {
  expect(tableCss).toContain(".app.nav-hidden .table-modern .seat.hero .pod");
  expect(tableCss).toContain(".app.nav-hidden .table-modern .seat.acting .pod");
});

it("integra os controles ao feltro sem painel pesado", () => {
  expect(controlsCss).toContain("background: linear-gradient(");
  expect(controlsCss).toContain("rgba(5,8,7,.88) 100%");
});
```

- [ ] **Step 2: Run test to verify it fails**

Criar/atualizar PR da branch para `main` e aguardar `pr-check.yml`.
Expected: FAIL nos novos contratos porque as regras premium ainda não existem.

- [ ] **Step 3: Commit**

Commit apenas do teste, mantendo o estado RED observável no GitHub Actions.

---

### Task 2: Hierarquia visual da mesa

**Files:**
- Modify: `src/ui/tableModern.css`

**Interfaces:**
- Consumes: classes atuais `.table-modern`, `.seat`, `.pod`, `.hero`, `.acting`, `.felt`, `.tbl-center-col`.
- Produces: visual premium sem alterar DOM nem estado de jogo.

- [ ] **Step 1: Implement the minimal CSS to satisfy the contract**

No bloco mobile imersivo, adicionar regras específicas:

```css
.app.nav-hidden .table-modern .seat .pod {
  background: rgba(8,12,10,.68);
  border-color: rgba(255,255,255,.10);
  box-shadow: 0 7px 18px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.025);
  backdrop-filter: blur(7px);
  -webkit-backdrop-filter: blur(7px);
}

.app.nav-hidden .table-modern .seat.hero .pod {
  background: linear-gradient(180deg, rgba(42,38,22,.88), rgba(13,15,11,.86));
  border-color: rgba(230,196,84,.88);
  box-shadow: 0 0 0 1px rgba(230,196,84,.16), 0 10px 28px rgba(0,0,0,.46);
}

.app.nav-hidden .table-modern .seat.acting .pod {
  border-color: rgba(240,215,127,.92);
  box-shadow: 0 0 0 2px rgba(230,196,84,.18), 0 0 26px rgba(230,196,84,.24), 0 10px 24px rgba(0,0,0,.42);
}

.app.nav-hidden .table-modern .tbl-center-col {
  filter: drop-shadow(0 9px 22px rgba(0,0,0,.40));
}

.app.nav-hidden .table-modern .table-brand-mark {
  opacity: .08;
}
```

- [ ] **Step 2: Keep portrait/landscape guardrails**

Não alterar `position:absolute`, `inset:0`, `100dvh`, hero `top` atual nem as regras landscape já existentes.

- [ ] **Step 3: Commit**

Commit focado em hierarquia visual da mesa.

---

### Task 3: Cockpit de ações integrado

**Files:**
- Modify: `src/ui/controlsHierarchy.css`

**Interfaces:**
- Consumes: `.controls-v2`, `.action-panel`, `.raise-control-panel`, `.action-choice-*`.
- Produces: controles mais leves, ação principal clara e slider secundário.

- [ ] **Step 1: Refine immersive control shell**

Ajustar gradiente final para:

```css
.app.nav-hidden .controls-v2 {
  background: linear-gradient(
    180deg,
    rgba(5,8,7,0) 0%,
    rgba(5,8,7,.54) 38%,
    rgba(5,8,7,.88) 100%
  );
}
```

E tornar os painéis menos sólidos:

```css
.app.nav-hidden .controls-v2 .action-panel,
.app.nav-hidden .controls-v2 .raise-control-panel {
  background: rgba(8,12,10,.72);
  border-color: rgba(230,196,84,.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

- [ ] **Step 2: Preserve touch targets**

Manter `.action-choice { min-height: 48px; padding: 4px; }` no mobile e `touch-action: manipulation`.

- [ ] **Step 3: Commit**

Commit focado apenas nos controles.

---

### Task 4: Registro e verificação

**Files:**
- Modify: `MUDANCAS.md`

**Interfaces:**
- Produces: registro legível para Allan e branch pronta para revisão.

- [ ] **Step 1: Update MUDANCAS.md**

Adicionar no topo:

```md
## 2026-09-07 — ChatGPT — Mesa premium consolidada
- A mesa em tela cheia ganhou uma hierarquia mais limpa: jogadores menos “encaixotados”, herói/vez de agir mais destacados e centro da mesa mais legível.
- Os controles continuam flutuando sobre o feltro, agora com menos painel escuro e aparência mais integrada à mesa.
- Onde: mesa do jogo durante a mão. Sem mudança no motor, ranges, ICM ou decisões.
```

- [ ] **Step 2: Verify PR CI**

Aguardar `pr-check.yml` após todos os commits.
Expected: testes e build verdes.

- [ ] **Step 3: Review diff**

Confirmar que nenhum arquivo do motor foi tocado.

- [ ] **Step 4: Mark PR Ready for Review**

Só depois do CI verde e revisão do diff.
