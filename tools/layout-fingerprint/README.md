# 🧪 Impressão digital de layout

Ferramenta para **provar com número** que uma mudança visual não quebrou nada.

Ela abre o app num navegador de verdade, vai até a **mesa de jogo** e até a
**mesa de review** (importando uma mão fixa), e grava a posição, o tamanho e os
estilos-chave de ~25 elementos + os 9 assentos. Depois compara duas medições.

Nasceu de um problema real: já aconteceu de um bloco inteiro de regras ser
apagado por engano num recorte de arquivo e ninguém perceber até o Allan abrir
o app no celular. A suíte de testes estava verde — ela não olha a tela.

## Como usar

```bash
# 1) uma vez por container: o navegador e o playwright-core
npm install --no-save playwright-core          # o Chromium já vem no ambiente

# 2) sirva a versão construída
npm run build && npx vite preview --port 4173 --host 127.0.0.1 &

# 3) mede ANTES da mudança
node tools/layout-fingerprint/fingerprint.mjs /tmp/fp-antes.json

# 4) faça a mudança, reconstrua e meça DEPOIS
npm run build
node tools/layout-fingerprint/fingerprint.mjs /tmp/fp-depois.json

# 5) compare
python3 tools/layout-fingerprint/compare.py /tmp/fp-antes.json /tmp/fp-depois.json
```

Saída esperada quando a mudança é segura:

```
TOTAL DE DIFERENÇAS: 0
```

Quando muda algo, ele diz **o quê**, com número:

```
  [mesa] .play-exit-btn[0]: w: 34 -> 23.8; h: 34 -> 21; font: 23px -> 13.3px
  [review] .seat.hero .pod[0]: x: 122 -> 111; w: 116 -> 138
```

## Variáveis de ambiente

| Variável | Padrão | Para quê |
|---|---|---|
| `CF_URL` | `http://127.0.0.1:4173/` | onde o app está servido |
| `CF_CHROME` | `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` | binário do Chromium |

## Ruído: o que ela ignora de propósito

A mesa de jogo sorteia mãos, então a **cor das cartas** (o naipe) muda a cada
execução — o comparador ignora a cor de qualquer `.card`. Os assentos são
comparados pelo **centro**, não pelo canto: assim um pod que fica mais alto por
ter cartas não conta como "assento mudou de lugar".

Medido: duas execuções seguidas, sem mudar nada, dão **0 diferenças**.

## Por que não está no CI

Depende de navegador e de um servidor rodando; é uma ferramenta de **conferência
antes do push**, não um teste de unidade. A suíte (`npx vitest run`) continua
sendo a trava obrigatória.
