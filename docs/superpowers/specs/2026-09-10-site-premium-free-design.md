# CALL OU FOLD /site Premium Redesign — Design Spec

## Scope
Exclusively `https://calloufold.com.br/site/` and files under `site/`. Do not modify the app UI, poker engine, ranges, bots, game logic, GTO/ICM logic, or app-wide theme files.

## Goal
Turn `/site` into a premium, mobile-first acquisition landing page that explains CALL OU FOLD quickly, lets a visitor experience a Call/Fold decision, shows the real product early, and drives the visitor to the free app with minimal friction.

## Product rule: 100% free
CALL OU FOLD is completely free. The site must not show paid plans, subscription prices, paywalls, premium tiers, trial language, or CTAs such as “assinar”. Remove or retire any site-only material that proposes R$ values.

## Brand guardrail: original logo is immutable
The official site logo is the existing repository asset `site/logo.png`.

Rules:
- Reuse `site/logo.png` exactly as-is wherever the CALL OU FOLD logo is shown on `/site`.
- Do not redraw, regenerate, crop into a new mark, recolor pixels, distort, replace, or approximate the logo.
- Do not create an AI-generated logo variation.
- CSS may only control layout properties around the asset such as rendered width/height, max-width, margin and placement while preserving aspect ratio.
- Any future visual asset must be composed around the official logo, never substitute for it.

## Information architecture
1. Compact navigation with official logo, a small “100% grátis” trust label and one primary CTA.
2. Hero in the first viewport: concise value proposition, “100% grátis · sem cadastro · sem dinheiro real”, primary CTA “Jogar grátis agora”, secondary anchor to the interactive demo, and a real app preview visible early.
3. Interactive Call/Fold demo as the primary proof of value.
4. Three product pillars only in the main value section: **Jogue → Entenda → Evolua**.
5. Short proof/trust strip: Portuguese, works on mobile, educational, no real money, free.
6. Product preview using the existing real screenshot `/app-preview.png`.
7. Short creator/project story after the visitor already understands the product.
8. Progression/ranking concept shown compactly; avoid large fictitious leaderboards dominating the landing.
9. Strong final CTA to open the app.
10. Footer with official logo, Instagram/share links and educational/no-real-money disclosure.

## Copy principles
- First-screen copy should be understood in a few seconds by a recreational player.
- Lead with benefit before technical detail.
- Keep honesty about ranges, estimates and “not a professional solver”, but move dense technical caveats out of the first reading path.
- Avoid fake scarcity, revenue claims, promises of winnings, or implication that the product guarantees poker results.
- Use “grátis”, “sem cadastro pra começar” and “sem dinheiro real” as trust signals.

## Visual direction
- Original CALL OU FOLD identity; premium poker feel without copying another brand.
- Dark green/black background with controlled gold accents.
- Fewer decorative effects and fewer competing gold treatments.
- Controlled iconography. Avoid platform-dependent emoji as the main visual language of feature cards or navigation.
- Consistent card radius, spacing, typography and button sizes.
- Mobile-first spacing with clear touch targets and no clipped content.
- Use the existing official logo and existing real app preview rather than inventing brand assets.

## PWA install behavior
Do not interrupt new visitors with an install banner three seconds after arrival. Installation is a secondary action after the visitor has understood or tried the product. Keep install help available near the final CTA/footer if useful.

## SEO/social
Keep canonical `/site/`, Open Graph and Twitter metadata. Align titles/descriptions around free educational poker study, decision training and no real money. Do not imply paid tiers.

## Acceptance criteria
- Changes are limited to `/site` files plus site-specific tests/docs.
- `site/logo.png` remains unchanged and is the only CALL OU FOLD logo asset referenced by the landing markup.
- No `R$`, `/mês`, “Assinar”, paid tier or subscription copy remains in the active site experience or maintained site snippets.
- Hero contains a visible primary CTA without requiring scroll.
- Interactive demo remains functional.
- Real product preview appears before long explanatory sections.
- Main feature story is reduced to Jogue/Entenda/Evolua.
- No automatic 3-second install interruption.
- Ranking preview no longer dominates the page with fictitious detailed standings.
- Mobile layout stays within viewport and primary controls meet practical touch sizing.
- Existing app source and engine directories are untouched.
- Tests/build pass before merge and deployment is verified before claiming completion.
