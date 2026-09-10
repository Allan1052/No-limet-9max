# CALL OU FOLD /site Premium Free Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize only `/site` into a premium, mobile-first, 100% free acquisition landing page while preserving the official logo asset exactly.

**Architecture:** Keep the landing as a static HTML/CSS/JS surface under `site/`, but simplify its information architecture and visual system. Protect critical product/brand rules with a site-specific Vitest contract test that reads `site/index.html` and the retired pricing snippet.

**Tech Stack:** Static HTML/CSS/vanilla JS, Vitest/Node `fs`, existing GitHub Pages/Vite repository pipeline.

**Spec:** `docs/superpowers/specs/2026-09-10-site-premium-free-design.md`

## Global Constraints

- Scope is exclusively `site/` plus site-specific test/docs.
- Do not modify app UI, engine, ranges, bots, game, GTO/ICM logic or `src/ui/theme.css`.
- CALL OU FOLD is 100% free: no prices, paid plans, subscription/paywall copy or paid CTAs.
- `site/logo.png` is immutable and must remain the official landing logo.
- Do not generate, redraw, recolor, crop into a replacement, distort or substitute the logo.
- Keep the interactive Call/Fold demo functional.
- Keep canonical `/site/` and social metadata.
- Do not auto-show the PWA install banner after 3 seconds.

---

### Task 1: Add site brand/free contract test

**Files:**
- Create: `site/siteLanding.contract.test.ts`

**Interfaces:**
- Consumes: `site/index.html`, `site/planos-section.html`
- Produces: regression checks for immutable logo reference, zero paid copy, first-screen CTA, three-pillar story and no timed install interruption.

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const pricing = readFileSync(new URL("./planos-section.html", import.meta.url), "utf8");

describe("/site premium-free contract", () => {
  it("uses only the official site/logo.png brand asset in landing markup", () => {
    const logoRefs = [...html.matchAll(/<img[^>]+src=["']([^"']*logo[^"']*)["']/gi)].map((m) => m[1]);
    expect(logoRefs.length).toBeGreaterThan(0);
    expect(new Set(logoRefs)).toEqual(new Set(["logo.png"]));
  });

  it("contains no paid offer language in maintained site HTML", () => {
    const corpus = `${html}\n${pricing}`;
    expect(corpus).not.toMatch(/R\$\s*\d/i);
    expect(corpus).not.toMatch(/\/\s*m[eê]s/i);
    expect(corpus).not.toMatch(/\bassin(ar|atura|e)\b/i);
  });

  it("puts a free primary CTA in the hero and uses three core pillars", () => {
    const hero = html.match(/<header class="hero"[\s\S]*?<\/header>/i)?.[0] ?? "";
    expect(hero).toMatch(/Jogar gr[aá]tis agora/i);
    expect(html).toMatch(/>Jogue</i);
    expect(html).toMatch(/>Entenda</i);
    expect(html).toMatch(/>Evolua</i);
  });

  it("does not schedule an automatic install banner after three seconds", () => {
    expect(html).not.toMatch(/setTimeout\(createBanner,\s*3000\)/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- site/siteLanding.contract.test.ts`
Expected: FAIL because the current hero has no primary CTA, paid plan copy remains in `site/planos-section.html`, and the install banner is scheduled after 3000ms.

- [ ] **Step 3: Commit RED contract**

```bash
git add site/siteLanding.contract.test.ts
git commit -m "test: lock free site and original logo"
```

---

### Task 2: Rebuild landing hierarchy and premium visual system

**Files:**
- Modify: `site/index.html`

**Interfaces:**
- Consumes: `site/logo.png`, `/app-preview.png`, current demo JS, Umami analytics.
- Produces: streamlined premium landing with hero CTA, early real preview, three pillars, compact trust/progression/story sections and final CTA.

- [ ] **Step 1: Replace the top-level content order**

Implement this sequence in `site/index.html`:

```text
nav
hero (official logo context + 100% free trust + CTA)
real app preview
demo Call ou Fold
three pillars: Jogue / Entenda / Evolua
trust/proof strip
compact progression section
short creator story
final CTA
footer
```

Hero copy must include:

```html
<h1>Treine decisões de poker.<br><span class="g">Entenda o porquê.</span></h1>
<p class="hero-trust">100% grátis · sem cadastro pra começar · sem dinheiro real</p>
<p class="sub">Jogue mãos, receba feedback e transforme cada decisão em estudo — direto no celular.</p>
<div class="cta-row">
  <a class="btn primary" href="https://calloufold.com.br/">Jogar grátis agora</a>
  <a class="btn ghost" href="#demo">Testar uma decisão</a>
</div>
```

- [ ] **Step 2: Reduce the feature catalog to three pillars**

Use exactly three primary cards:

```html
<h3>Jogue</h3>
<p>Treine mãos, torneios simulados e situações de pressão sem dinheiro real.</p>

<h3>Entenda</h3>
<p>Receba feedback da decisão em linguagem simples ou técnica e revise seus spots.</p>

<h3>Evolua</h3>
<p>Use histórico, missões, ranges de referência e ferramentas de estudo para enxergar o próximo passo.</p>
```

Dense tool names may appear only in a compact secondary line after the three cards.

- [ ] **Step 3: Move the real screenshot before long explanatory copy**

Use the existing image exactly:

```html
<img src="/app-preview.png" alt="Tela real do Call ou Fold" loading="eager" />
```

Do not generate a replacement visual and do not alter `site/logo.png`.

- [ ] **Step 4: Compact ranking/progression**

Remove the large illustrative leaderboard and replace it with a short progression block describing XP, missions, achievements and rankings conceptually. Do not show invented player names, invented positions or fake point totals.

- [ ] **Step 5: Shorten story**

Keep the authentic origin of the project but reduce it to one compact card after product value. Preserve the recreational-player voice without making it compete with the primary CTA.

- [ ] **Step 6: Normalize visual system**

In the existing `<style>` block:
- keep the green/black/gold identity;
- standardize section spacing around 72px desktop / 52px mobile;
- standardize card radius at 18px;
- keep primary touch targets at least 44px high;
- reduce decorative gradients/shadows;
- replace main emoji feature icons/navigation decoration with simple CSS/icon-neutral labels;
- keep `img` logo aspect ratio natural (`height:auto`).

- [ ] **Step 7: Keep demo behavior and analytics**

Retain the current `data-a="fold"` / `data-a="call"` interaction, verdict behavior and CTA tracking. Update event origin strings only if the corresponding CTA location changes.

- [ ] **Step 8: Run contract and full tests**

Run:
```bash
npm test -- site/siteLanding.contract.test.ts
npm test
npm run build
```
Expected: all PASS.

- [ ] **Step 9: Commit landing redesign**

```bash
git add site/index.html
git commit -m "feat: modernize free Call ou Fold site"
```

---

### Task 3: Retire paid-plan proposal and install interruption

**Files:**
- Modify: `site/planos-section.html`
- Modify: `site/index.html`

**Interfaces:**
- Consumes: free-product rule.
- Produces: zero paid offer language in maintained site artifacts and non-interruptive install UX.

- [ ] **Step 1: Replace the pricing proposal with a retired-note file**

Replace `site/planos-section.html` content with:

```html
<!--
  ARQUIVO RETIRADO — 2026-09-10
  O CALL OU FOLD É 100% GRÁTIS.
  Esta antiga proposta de planos pagos não deve ser reutilizada.
  A landing oficial é site/index.html.
-->
```

- [ ] **Step 2: Remove automatic install banner scheduling**

Delete the calls that schedule `createBanner` after 3000ms. Keep explicit install help/button only as a secondary action near the final CTA/footer.

- [ ] **Step 3: Run tests**

Run:
```bash
npm test -- site/siteLanding.contract.test.ts
npm test
npm run build
```
Expected: all PASS.

- [ ] **Step 4: Commit free-only cleanup**

```bash
git add site/index.html site/planos-section.html
git commit -m "fix: keep site completely free and non intrusive"
```

---

### Task 4: Document and verify publication safety

**Files:**
- Modify: `MUDANCAS.md`

**Interfaces:**
- Consumes: completed site redesign.
- Produces: traceable release note and verification record.

- [ ] **Step 1: Add release note**

Add a dated entry stating that only `/site` was modernized, the original `site/logo.png` was preserved unchanged, paid-plan language was retired, the first-screen CTA was added, and install interruption was removed. Explicitly state that APP/engine were untouched.

- [ ] **Step 2: Verify diff scope**

Expected changed production paths:
```text
site/index.html
site/planos-section.html
```
Allowed supporting paths:
```text
site/siteLanding.contract.test.ts
docs/superpowers/specs/2026-09-10-site-premium-free-design.md
docs/superpowers/plans/2026-09-10-site-premium-free.md
MUDANCAS.md
```
No `src/` production file may change.

- [ ] **Step 3: Final verification**

Run:
```bash
npm test
npm run build
```
Expected: PASS.

Confirm the blob SHA of `site/logo.png` still equals the pre-change SHA and that `/site/` serves the new landing after deployment.

- [ ] **Step 4: Commit release note**

```bash
git add MUDANCAS.md
git commit -m "docs: record premium free site redesign"
```
