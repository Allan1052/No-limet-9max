# 🔎 AUDITORIA ATUALIZADA — Call ou Fold (10/09/2026)

> **O que é este documento.** O ChatGPT entregou uma "Auditoria Premium de Produto
> e UI" (PDF, 7 páginas). O Claude revisou cada afirmação **contra o código de
> hoje** e mediu o que dava para medir. Este arquivo é a versão **atualizada e
> corrigida** dessa auditoria: mantém o que estava certo, conserta o que estava
> desatualizado e preenche o que faltou.
>
> **Vale mais que o PDF.** O PDF foi escrito sobre uma versão anterior do app.
> Se as duas fontes divergirem, **vale este arquivo**.
>
> **Para os dois agentes (Claude e ChatGPT):** leia isto antes de propor qualquer
> frente visual. Trabalhar com versões diferentes na cabeça foi o que gerou
> retrabalho nas últimas rodadas.

---

## 0. O veredito, em uma frase

O diagnóstico central do PDF está **certo**: o app tem mais profundidade de
produto do que a interface consegue comunicar, e o próximo salto não vem de
adicionar função — vem de **organizar o que já existe**. O que muda aqui é
*o quê* organizar primeiro, e três recomendações que precisam ser descartadas.

---

## 1. ⚠️ O que já mudou desde o PDF (não regredir)

Estas decisões são **do Allan**, já estão no ar e foram verificadas por print.
Qualquer proposta que as desfaça deve ser recusada.

| Decisão | Estado |
|---|---|
| **O atalho 2BB foi REMOVIDO** dos presets ("já tem ele no raise") | no ar |
| Presets atuais: **Pote / 4BB / 3BB**, fixos na coluna do RAISE | no ar |
| **A mão do herói é o MAIOR elemento da mesa** (48×67; as comunitárias são menores) | no ar |
| A setinha abre a **barra de aumento vertical**, à esquerda da mão | no ar |
| Mesa de jogo e mesa de **Review** em tela cheia, controles flutuando | no ar |
| Review: nomes **"Você" / "Vilão 1..8"**, número no avatar | no ar |
| Review: **suas cartas aparecem mesmo nas mãos que você foldou** | no ar |
| Review: veredito do coach **por decisão** no pré-flop | no ar |
| Motor: **o BB nunca folda em pote não aberto** (bug do "foldar AK") | no ar |
| Motor: BB **defende pelo preço** contra min-raise | no ar |

> ❗ O PDF pede "preservar o conjunto aprovado, incluindo 2BB" e "herói apenas
> discretamente maior". **As duas coisas contrariam decisões do Allan.** Ignore-as.

---

## 2. ✅ Achados confirmados — com número

O que segue foi **medido no repositório**, não estimado.

### 2.1 Não existe camada oficial de estilo (P0 — o mais valioso)

| Evidência | Número |
|---|---|
| Arquivos CSS da interface | **12** (um deles com **241 KB**) |
| Linhas de CSS somadas | **9.783** |
| `!important` | **455** |
| Estilos inline `style={{ }}` | **327**, em **51** arquivos |
| Tokens de **cor** | ~30 ✅ |
| Tokens de **espaçamento / tipografia / raio** | **0** ❌ |
| Tamanhos de fonte distintos entre 8px e 17px | **14** |

Distribuição das fontes: 12px (144×), 13px (106×), 11px (81×), 14px (76×),
10px (54×), 15px (50×), 12,5px (29×), 16px (28×), 9px (20×), 8px (15×),
11,5px (14×)…

**Por que isso importa (e não é preciosismo):** esta é a causa-raiz documentada
das falhas das últimas semanas — mesa cortada, botão por cima de carta, bloco
inteiro de regras apagado por engano num recorte de arquivo. Sem camada oficial,
**toda correção vira uma camada nova**, e a camada nova brigará com as antigas.

### 2.2 Alvos de toque abaixo do mínimo (P0 — barato de corrigir)

Mínimo recomendado: **44px**. Medido hoje:

| Controle | Altura | Status |
|---|---|---|
| Fold / Call / Raise | 48px | ✅ |
| Setinha da barra de aumento | **24px** | ❌ |
| Presets Pote / 4BB / 3BB | **26px** | ❌ |
| "Ver dicas" | **26px** | ❌ |
| Chips de rua no Review | ~29px | ❌ |
| Setas ◀ ▶ do Review | 40px | ⚠️ quase |

> Isto é dívida **do Claude**: fui eu que apertei esses alvos para caber na tela.
> O PDF acertou em levantar o critério.

### 2.3 Tipografia decisiva pequena demais

Já corrigido **na mesa** (nome do vilão saiu de ~7px para ~10,5px; stack para
~11px). Mas ainda restam **20 usos de 9px e 15 de 8px** no resto do app —
precisa varrer tela por tela e checar se algum deles carrega decisão.

### 2.4 Outros pontos do PDF que continuam válidos

- **Pós-mão**: 1º veredito, 2º porquê curto, 3º CTA dominante "Nova mão". Hoje há
  ações demais competindo no mesmo momento.
- **Perfil como Player Hub**: a tela acumula identidade, progresso, prêmios,
  histórico, configurações, versão, suporte e ferramentas privadas.
- **Sua Mão**: hoje é um formulário técnico; vira fluxo guiado (cartas → posição →
  o que aconteceu antes → stack → analisar), com o avançado escondido.
- **Ícones próprios no lugar de emoji** na navegação: emoji muda de desenho
  conforme o celular e a versão do sistema — a marca não controla.
- **Progressão unificada**: XP, streak, conquistas, missões, campanha e ranking
  contando uma história só.
- **Critérios de aceite** do PDF batem com as regras da casa (build verde, `dist`
  reconstruído, `MUDANCAS.md`, versão publicada verificada). Mantidos.

---

## 3. ❌ Correções ao PDF

1. **"Presets: Pote / 4BB / 3BB / 2BB"** → o 2BB foi removido a pedido do Allan.
2. **"Herói apenas discretamente maior"** → contraria a correção aprovada. A mão
   do herói media 24×47 contra 46×72 das comunitárias (quase o dobro a favor
   delas). Hoje ela é a maior da mesa **de propósito**. Não reverter.
3. **"Não alterar motor, ranges, GTO ou lógica estratégica"** → excelente como
   guardrail de uma *frente visual*; **inválido como regra do app**. Se valesse,
   o bug do BB (recomendando foldar AK) ainda estaria no ar. Idem para "não
   adicionar novas funcionalidades": bloquearia o veredito por decisão no
   pós-flop, que o Allan já pediu.

---

## 4. 🕳️ O que faltou no PDF

1. **A tela de Review / Importar não foi auditada.** É o principal diferencial do
   produto (rever o próprio torneio com veredito do coach) e onde mais se
   trabalhou nos últimos dias. Não aparece no escopo.
2. **Honestidade de claims não tem capítulo.** SELO GTO 61/61, o selo
   "estimativa (pós-flop)", "sem dinheiro real", o custo em bb só onde é
   calculável. É o ativo mais valioso do app e o mais fácil de estragar — uma
   frente visual pode apagar um selo sem perceber.
3. **Ciclo de atualização do PWA.** O Allan fecha e reabre o app 2× toda vez.
   Merece uma frente própria.
4. **Contraste não foi medido.** Auditoria só de olho não pega o que a medição
   pegou: a plaquinha de posição estava em **1,36:1** (mínimo 4,5:1).

---

## 5. 🎯 Plano recomendado (ordem, risco e retorno)

| # | Frente | Risco | Retorno | Observação |
|---|---|---|---|---|
| 1 | **Tokens** (espaço, tipografia, raio) — só **adicionar**, sem trocar nada | baixo | alto | código novo passa a usar; nada quebra |
| 2 | **Alvos de toque + fontes decisivas** | baixo | alto | o Allan sente na mão no mesmo dia |
| 3 | **Consolidar as camadas de CSS mortas** no arquivo autoritário | **alto** | **o maior** | uma tela por vez, print antes/depois |
| 4 | **Pós-mão** com CTA único + **Perfil como Player Hub** | médio | alto | |
| 5 | **Sua Mão** em fluxo guiado | médio | médio | |
| — | **Motor: veredito por decisão no pós-flop** | médio | alto | pedido do Allan, roda em paralelo |

**Sobre o passo 3, com franqueza:** é exatamente ali que mais se quebrou coisa.
A regra é: **uma tela por vez, com print antes e depois**, e só segue quando
estiver igual ou melhor. Nada de "consolidar tudo num commit".

---

## 6. 🚧 Regras que nenhuma frente pode quebrar

- **SELO GTO 61/61** (`src/ranges/_calibration/gtoBenchmark.test.ts`).
- Suíte inteira verde antes de publicar (`npx vitest run`) — hoje **4010** testes.
- `npm run build` (que roda `tsc`) antes do push. Rodar só o `vitest` **não basta**
  — já barrou um deploy.
- `dist` reconstruído e commitado; entrada nova no `MUDANCAS.md`, em português.
- Fluxo: `git fetch origin main && git rebase origin/main && git push origin HEAD:main`.
  **Nunca force-push.**
- Layout da mesa: só em **`src/ui/tableFinalLayout.css`** (ver
  `2026-09-08-REGRA-layout-mesa.md`). Não criar camada nova.
- **Nada de número inventado.** Se não dá para medir, não vai pra tela — vai o
  selo de estimativa, ou não vai nada.

---

## 7. ✅ Critérios de aceite (mantidos do PDF, com acréscimos)

Uma atualização só está pronta quando:

1. as telas-chave mantêm a mesma linguagem visual;
2. nenhum controle importante está cortado ou sobreposto;
3. **todo alvo de toque tem ≥ 44px**;
4. **nenhuma informação decisiva está abaixo de 11px na tela** (já contando
   qualquer redução aplicada ao contêiner);
5. **todo texto sobre fundo tem contraste ≥ 4,5:1** (medir, não olhar);
6. navegação e pós-mão têm CTA principal inequívoco;
7. build e testes verdes, `dist` reconstruído, `MUDANCAS.md` atualizado;
8. nenhum selo ou ressalva de honestidade foi removido;
9. **a versão publicada foi verificada por print**, não apenas o commit.
