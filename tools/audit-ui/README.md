# 📏 Régua de auditoria de interface

Mede a interface em vez de olhar para ela. Abre o app num Chromium de verdade,
em tamanho de celular (412×915), percorre as telas e grava, **para cada uma**:

| O que mede | Critério | Vem de |
|---|---|---|
| Alvos de toque | ≥ **44px** | critério 3 da auditoria |
| Tamanho de texto | ≥ **11px** | critério 4 |
| Contraste texto/fundo | ≥ **4,5:1** (3:1 se grande) | critério 5 |
| Rolagem lateral | nunca | — |

```bash
npm run build && npx vite preview --port 4173 --host 127.0.0.1 &
node tools/audit-ui/audit.mjs /tmp/audit.json
```

## O que ela NÃO acusa (de propósito)

- **Fundo com degradê.** Quando qualquer elemento acima tem `background-image`,
  o contraste não é calculável por cor computada. A régua devolve "não medível"
  em vez de chutar o fundo da página. Sem isso ela acusava **22 falhas falsas**
  em botões dourados — uma auditoria que inventa problema é pior que nenhuma.
- **Emoji.** São desenhos, não texto: contraste de cor não se aplica.
- Fundos semitransparentes são **compostos** com o que está atrás, não ignorados.

## Variáveis

| Variável | Padrão |
|---|---|
| `CF_URL` | `http://127.0.0.1:4173/` |
| `CF_CHROME` | `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` |
| `CF_SHOTS` | `/tmp/claude-0/shots` |

Companheira da `tools/layout-fingerprint/` (aquela prova que nada MUDOU; esta
prova se o que está lá **atende aos critérios**).
