# 🧪 Experimento: as 4 camadas de CSS da mesa são código morto?

**Data:** 10/09/2026 · **Quem fez:** Claude · **Resposta curta: NÃO.**

## Por que o experimento existiu

O passo 3 da auditoria previa "consolidar as camadas de CSS mortas" no arquivo
autoritário (`tableFinalLayout.css`). A hipótese era que `tableModern.css`,
`tableFullscreenRound2.css`, `tableRound4.css` e `tableHierarchy.css` já
estivessem quase todas sobrescritas e pudessem sair.

Em vez de refatorar no escuro, **medimos**.

## Como foi medido

Ferramenta nova, versionada em `tools/layout-fingerprint/`: abre o app num
Chromium de verdade, vai até a **mesa de jogo** (fechada e com a barra de aumento
aberta) e até a **mesa de review** (importando uma mão fixa 9-max com ante), e
grava posição, tamanho e estilos-chave de ~25 elementos + os 9 assentos.

**Validação do método antes de confiar nele:** duas execuções seguidas, sem
mudar nada, deram **0 diferenças**. Depois de desligar e restaurar todas as
camadas, a medição voltou a bater com a original: **0 diferenças**.

Para cada camada: esvaziar o arquivo → `vite build` → medir → comparar → restaurar.

## Resultado

| Camada | Diferenças ao desligar | Veredito |
|---|---|---|
| `tableRound4.css` | **6** | **viva** |
| `tableModern.css` | **17** | **viva** |
| `tableFullscreenRound2.css` | **16** | **viva** |
| `tableHierarchy.css` | **18** | **viva** |

**Nenhuma delas é código morto.** O que cada uma ainda controla sozinha:

- **tableRound4** — o botão ✕ de sair (34px vira 24px e a fonte cai de 23 para
  13px sem ela) e o fundo do pod do herói.
- **tableModern** — a marca no feltro (posição e `transform`), o
  `.tbl-center-col` (pote + cartas comunitárias), o raio da mesa no review e a
  largura do assento do herói no review (116px vira 138px sem ela).
- **tableFullscreenRound2** — o "Ver dicas" (cor, fundo e raio), a altura do pod
  do herói e o tamanho das cartas dele.
- **tableHierarchy** — as cores do nome e do stack do herói e a posição das
  cartas dentro do pod.

## Conclusão e recomendação

A leitura de que "são camadas mortas" estava **errada**. Não é lixo acumulado: é
a **base do visual, espalhada em 4 arquivos**, com o `tableFinalLayout.css`
sobrescrevendo só uma parte (por isso ele precisa de 385 `!important`).

Logo, o passo 3 **não é uma limpeza barata**: é uma migração manual de regras
vivas, com risco alto e **nenhum ganho visível para o Allan**.

**Recomendação: não fazer agora.** Fazer só quando houver uma mudança
estrutural na mesa que justifique — e, quando for, uma tela por vez, com a
impressão digital antes e depois.

## O que ficou de bom

1. **A rede de proteção** (`tools/layout-fingerprint/`). É exatamente o que
   faltava quando um bloco inteiro de regras foi apagado por engano e a suíte
   continuou verde: agora dá para provar em segundos que uma mudança visual não
   mexeu no que não devia.
2. **Este registro.** Nenhum dos dois agentes deve tentar "limpar" essas 4
   camadas achando que são lixo. Elas não são.

---

## 🔥 Achado inesperado: o build NÃO é determinístico

Ao validar a ferramenta, apareceu outra coisa. **Dois `npm run build` seguidos,
com o código exatamente igual, geram nomes de arquivo diferentes:**

```
main-CkH2qsa-.js → main--9-jO1yb.js → main-DefY3Ftt.js → main-CAEFiVje.js …
```

**Causa (encontrada em `vite.config.ts`):**

```js
const buildId = new Date().toISOString();
define: { __BUILD_ID__: JSON.stringify(buildId) }
```

O carimbo de data/hora do momento do build entra dentro do código. Ele muda a
cada build → muda o conteúdo do pacote → muda o hash do arquivo → e, como um
pacote cita o nome do outro, **o bundle inteiro é reescrito**.

`__BUILD_ID__` é usado num lugar só: o **rótulo de versão** exibido no Perfil
(`App.tsx`).

### Por que isso importa

1. **Toda publicação troca TODOS os arquivos.** O celular do Allan rebaixa o app
   inteiro mesmo quando só um texto mudou. É a explicação mais provável para a
   atualização ser sempre pesada e exigir fechar/reabrir o app 2×.
2. **O `dist` commitado muda inteiro a cada build**, então o diff nunca diz o que
   de fato mudou.
3. **E tem mais:** o workflow (`.github/workflows/deploy.yml`) roda
   `npm run build` e publica o `dist` **gerado no CI**. Ou seja, o `dist`
   commitado **não é o que vai pro ar** — ele é redundante para o deploy.
   A regra "o app é servido do dist commitado" está desatualizada.

### ✅ Corrigido em 10/09 (autorizado pelo Allan)

Foram **duas** correções, porque a primeira sozinha não bastava:

**1. O carimbo virou a data do ÚLTIMO COMMIT** (`git log -1 --format=%cI`) em vez
do relógio. Dois builds do mesmo código passam a gerar bytes idênticos.
*Medição: 3 builds seguidos → mesmo hash.*

**2. O carimbo saiu de DENTRO do bundle.** Só a correção 1 não resolvia: como o
valor morava numa constante compilada, **cada commit novo ainda trocava 15 dos
24 arquivos** (efeito cascata — um pacote cita o nome do outro). Agora ele vai
como `<meta name="cf-build">` no `index.html`, que não tem hash no nome, e o app
lê de lá em tempo de execução.
*Medição: trocando só o carimbo, **0 de 24** arquivos mudam de nome (antes: 15).*

Resultado prático: a partir da próxima publicação, o celular só rebaixa **o que
realmente mudou** — e não mais o app inteiro. (A publicação desta correção ainda
troca tudo, porque o código de fato mudou.)

### Decisão que continua em aberto

Parar (ou não) de commitar o `dist`. O CI reconstrói de qualquer jeito, então o
`dist` commitado não é o que vai pro ar. Isso mexe numa regra da casa — decisão
do Allan.
