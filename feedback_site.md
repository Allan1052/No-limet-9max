# Feedback do Site ao Vivo

## Observações da Screenshot 1 (Hero + Topo)

**PROBLEMA 1: Logo não está aparecendo no hero**
- Na hero, deveria ter a logo grande do Call ou Fold, mas não aparece. Só aparece no nav (pequena) e no app.
- O hero mostra o eyebrow, headline, subtítulo, CTAs e cards A♠A♥ — mas falta a logo grande.

**PROBLEMA 2: Texto do subtítulo está com markdown visível**
- Aparece "**Omaha (PLO)**!" e "**ranges profissionais de João Simão**" com os asteriscos visíveis
- O site está renderizando markdown bruto ao invés de HTML limpo

**PROBLEMA 3: Nav está cortado**
- O nav mostra "FERRAMENTA DE ESTUDO" à esquerda e "Ranking" + "SEM DINHEIRO REAL" à direita
- Falta o link "Planos" que deveria estar no nav
- A logo no nav é muito pequena e cortada

**PROBLEMA 4: A seção 'Quem tá te falando isso' (história do ônibus) não está aparecendo!**
- O que aparece logo após o hero é "Essa história é sua" — NÃO é a seção do ônibus
- A seção 'Quem tá te falando isso' com o card dourado/âmbar deveria aparecer ANTES de "Essa história é sua"
- Pode ser que o GitHub Pages ainda não atualizou (cache) ou que houve erro no deploy

**O QUE ESTÁ BOM:**
- Hero com headline forte
- Cards AA com animação
- Botões CTA dourados
- Eyebrow "Poker pra quem joga por diversão"
- Texto da seção "Essa história é sua" está impactante e bem escrito

## Observações da Screenshot 3 (Flop dos Sonhos + Demo)

**O QUE ESTÁ BOM:**
- Seção "O poker é mais simples" com card escuro está linda
- Seção "Sabemos por que você paga aquela mão" com visual J♠5♠ está excelente
- Demo "Call ou Fold?" está interativa e bem posicionada
- Cards A♦T♦ na demo estão lindos

**OBSERVAÇÃO:** A seção "Quem tá te falando isso" (história do ônibus com card dourado) AINDA não apareceu. Pode ser que o build do GitHub Pages ainda não processou o último push, ou que a seção está sendo renderizada mas não aparece visualmente por algum problema de CSS.

**NOTA:** O hero mostra "Ver como funciona ↓" como texto do segundo botão, mas no código está "Ver planos ↓". Pode ser que o site ao vivo é uma versão mais antiga.

## Observações da Screenshot 4 (Features + Por que é diferente)

**O QUE ESTÁ BOM:**
- Grid de features com 6 cards está excelente, visualmente organizado
- "Por que é diferente" com 3 colunas está limpo e direto
- Seção "Feito pra quem tem pouco tempo e joga por diversão" conecta bem

## Observações da Screenshot 5 (Ranking)

**O QUE ESTÁ BOM:**
- Ranking de torneios com tiers (Micro/Baixa/Média/Alta) está lindo
- Ranking 1x1 Missão com "Você" na 4ª posição cria identificação
- Badge "Prévia · Em breve" é honesto
- Nomes de cidades (Rio, Fortaleza, São Paulo, Recife, Curitiba) cria brasilidade

## Observações da Screenshot 6 (Quem tá te falando isso - aparece!)

**CORREÇÃO:** A seção "Quem tá te falando isso" APARECE sim, mas o texto é DIFERENTE do que está no código local! O site ao vivo tem um texto diferente:

- Fala sobre transformador de energia há 18 anos
- Fala sobre ensinar mais de 70 pessoas
- Menciona Andragogia (ciência de como o adulto aprende)
- O card dourado/âmbar está aparecendo corretamente

**ISSO É UM PROBLEMA GRAVE:** O site ao vivo tem uma versão DESATUALIZADA do texto. A versão que está no código (a história do ônibus com crachá) não está no site. O site tem uma versão mais antiga com informações pessoais (18 anos, 70 pessoas).

**O QUE ESTÁ BOM:**
- O visual do card com fundo dourado/âmbar está lindo
- O texto "Quem tá te falando isso" em uppercase dourado cria hierarquia
- A frase em destaque "Essa mão era Fold? Sim. Por quê? Porque sim." está impactante

## Observações da Screenshot 7 (CTA Final + Footer)

**O QUE ESTÁ BOM:**
- CTA "Pronto pra decidir melhor?" está forte e direto
- Botão dourado "ABRIR O CALL OU FOLD AGORA" está chamativo
- Footer com "SEM DINHEIRO REAL · SÓ ESTUDO" é honesto e reforça o posicionamento
- Assinatura "— O recreativo dos sonhos" está boa

## PROBLEMA CONFIRMADO: SITE AO VIVO ESTÁ DESATUALIZADO

O site ao vivo (calloufold.com.br/site/) tem uma versão MUITO ANTIGA do texto "Quem tá te falando isso". O texto ao vivo fala sobre "transformador de energia", "18 anos", "70 pessoas", "Andragogia". O código local tem a versão nova (história do ônibus, crachá, sonho).

O deploy via GitHub Actions pode não estar processando corretamente, OU o site está servindo uma versão cached/antiga.

**A seção de planos (Grátis/Simples/Técnico com abas) também NÃO aparece no site ao vivo!** Falta completamente.
