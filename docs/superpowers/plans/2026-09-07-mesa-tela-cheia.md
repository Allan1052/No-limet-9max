# Mesa Tela Cheia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a mesa mobile ocupar a viewport durante a mão, com controles flutuando sobre o feltro e sem cobrir herói/pods.

**Architecture:** Preservar DOM e lógica existentes. Implementar somente no escopo `.app.nav-hidden`, usando `tableModern.css` para viewport/feltro e `controlsHierarchy.css` para overlay dos controles, protegidos por teste-contrato.

**Tech Stack:** React, TypeScript, CSS, Vitest, Vite/PWA.

**Spec:** `docs/superpowers/specs/2026-09-07-mesa-tela-cheia-design.md`

## Global Constraints
- Não tocar em `src/ranges`, `src/bots`, `src/game`, `src/v3`.
- Preservar cartas 4 cores, avatars, stacks em BB e popup de range.
- Respeitar safe area do aparelho.
- Fora do modo `.app.nav-hidden`, não alterar layout.
- Atualizar `MUDANCAS.md` e `dist`.
- Testes e build precisam ficar verdes antes de integração.

---

### Task 1: Fixar contrato visual do modo tela cheia

**Files:**
- Modify: `src/ui/mobilePolish.contract.test.ts`

**Interfaces:**
- Consumes: texto de `tableModern.css` e `controlsHierarchy.css`.
- Produces: contrato que exige viewport imersiva e controles em overlay.

- [ ] **Step 1: Write the failing test**

Adicionar asserts para exigir no CSS imersivo:
```ts
expect(tableCss).toContain("min-height: 100dvh");
expect(tableCss).toContain("position: absolute");
expect(tableCss).toContain("inset: 0");
expect(controlsCss).toContain(".app.nav-hidden .controls-v2");
expect(controlsCss).toContain("bottom: max(6px, env(safe-area-inset-bottom, 0px))");
```
Remover o contrato antigo que exige a altura `calc(100dvh - 268px)` no modo mobile.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/mobilePolish.contract.test.ts`
Expected: FAIL porque o CSS ainda não contém a geometria nova.

- [ ] **Step 3: Commit RED**

Commit: `test(ui): require fullscreen table overlay layout`

### Task 2: Implementar viewport/feltro em tela cheia

**Files:**
- Modify: `src/ui/tableModern.css`

**Interfaces:**
- Consumes: `.app.nav-hidden`, `.play`, `.table-modern`, `.felt` já existentes.
- Produces: mesa 100dvh, feltro expandido e zona inferior segura para o herói.

- [ ] **Step 1: Implement minimal CSS**

No `@media (max-width: 640px)`, tornar `.play` o palco fixo e `.table-modern` uma camada absoluta que ocupa a viewport; expandir `.felt`; remover dependência do `clamp(calc(100dvh - ...))` no modo imersivo; reservar `padding-bottom`/safe zone visual para os controles.

- [ ] **Step 2: Run contract test**

Run: `npx vitest run src/ui/mobilePolish.contract.test.ts`
Expected: PASS.

### Task 3: Flutuar controles sobre o feltro

**Files:**
- Modify: `src/ui/controlsHierarchy.css`

**Interfaces:**
- Consumes: `.controls-v2`, `.action-panel`, `.raise-control-panel`.
- Produces: overlay inferior tocável, com fundo translúcido e safe-area.

- [ ] **Step 1: Implement minimal overlay CSS**

Adicionar seletor `.app.nav-hidden .controls-v2` apenas no mobile com `position:absolute`, `left/right`, `bottom`, `z-index`, gradiente de proteção e sem aumentar a altura do fluxo.

- [ ] **Step 2: Run contract test**

Run: `npx vitest run src/ui/mobilePolish.contract.test.ts`
Expected: PASS.

### Task 4: Documentar e verificar regressão

**Files:**
- Modify: `MUDANCAS.md`
- Rebuild: `dist/**`

- [ ] **Step 1: Add changelog entry**

Registrar no topo: mesa mobile em tela cheia durante a mão, controles flutuantes, sem mudança no motor.

- [ ] **Step 2: Run full tests**

Run: `npx vitest run`
Expected: todos os testes verdes, com apenas o skip histórico.

- [ ] **Step 3: Build**

Run: `npx vite build`
Expected: build/PWA/dist sem erro.

- [ ] **Step 4: Verify GTO audit**

Run: `npm run audit:gto`
Expected: `SELO GTO 61/61 = 100%`.

- [ ] **Step 5: Commit GREEN**

Commit: `feat(ui): make poker table fullscreen on mobile`

### Task 5: Revisão no aparelho

- [ ] Allan fecha e reabre o PWA duas vezes.
- [ ] Allan envia print durante uma mão.
- [ ] Ajustar apenas geometria fina (hero/seats/controles) com novo ciclo RED→GREEN se necessário.
