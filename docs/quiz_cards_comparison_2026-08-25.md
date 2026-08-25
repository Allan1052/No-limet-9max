# Comparação: padrão A♠7♠ versus lote de 10 cards

## Conclusão

O usuário está correto: o lote não é uma variação fiel do card A♠7♠. Ele reaproveita parte da paleta preta/verde/dourada e a ideia geral de HUD, mas foi desenhado em outro sistema visual.

## Diferenças observadas

| Elemento | Card A♠7♠ aprovado | Lote de 10 cards |
|---|---|---|
| Formato | Vertical 9:16, 1440×2560 | 4:5, 1080×1350 |
| Cabeçalho | Faixa HUD alta, logo lockup grande à esquerda e assinatura à direita | Cabeçalho muito mais baixo, logo reduzida e tratamento diferente |
| Título | Escala grande, headline protagonista e linhas técnicas laterais | Título menor e mais comprimido |
| Painéis | Dois painéis altos, integrados à composição vertical e com mais profundidade | Dois painéis horizontais/baixos, com outra proporção e muito espaço vazio interno |
| Área central | Grande campo de feltro com círculos/linhas técnicas e cartas protagonistas mais abaixo | Campo central mais plano, com composição diferente |
| Cartas | Grandes, com forte destaque e acabamento visual do padrão A♠7♠ | Menores, com um desenho de cartas simplificado e menos parecido com o padrão |
| Fichas | Blocos de fichas nos cantos inferiores | Pequenos chips circulares com monograma, em posição diferente |
| CTA | Caixa larga e forte, com ícone de comentário e frase do padrão | Caixa mais estreita e sem o mesmo tratamento |
| Rodapé | Faixa HUD grande, com mensagem e domínio | Rodapé mais baixo e com texto diferente |

## Regra para a reconstrução

Os dez cards devem nascer do mesmo template estrutural do A♠7♠ aprovado. A única coisa que pode mudar é o conteúdo: número do quiz, mão, posição, stack, cenário, pergunta e CTA. Não se deve criar um novo layout apenas porque o spot é diferente.

O padrão obrigatório para a próxima versão é 9:16, com a mesma faixa de cabeçalho, mesma posição e escala da logo oficial, mesma moldura externa, mesmo campo central, mesmos painéis laterais, mesma escala das cartas, mesmos chips e mesmo rodapé. Para spots com frases mais longas, o texto deve ser reduzido ou ajustado dentro dos mesmos módulos, nunca deslocando a arquitetura.

As faces das cartas devem continuar determinísticas e sem IA inventando ranks ou naipes. Cada card deve ser conferido contra o título, a pergunta e o spot correspondente.

Na segunda conferência, ficou claro que a primeira tentativa de reaproveitar o padrão criou duas falhas adicionais: os retângulos de preenchimento cobriam áreas maiores que o conteúdo variável e geravam blocos de cor visíveis; além disso, a composição cobria elementos fixos que deveriam permanecer iguais, como `QUIZ DE 10 SEGUNDOS` e `MÃO PARA ANALISAR`.

A reconstrução correta deve preservar o card A♠7♠ como imagem-base e mascarar somente os caracteres, textos e faces de cartas variáveis. O cabeçalho, o número de segundos, os títulos dos painéis, o label da mão, as molduras, as linhas HUD, os chips e o rodapé devem permanecer do base sempre que o texto for o mesmo.

A nova versão foi conferida em tamanho maior. O Card 1 preserva a faixa superior, a logo, a assinatura, a moldura, o campo de feltro, os painéis altos, a etiqueta central, as fichas, o CTA e o rodapé do A♠7♠. O texto variável foi limpo sem letras fantasmas; as cartas 9♠ e 7♠ aparecem grandes e separadas.

O Card 10 também foi conferido. O título longo cabe, `CALL / 4-BET / FOLD?` permanece visível no painel e no CTA, e K♣/Q♦ aparecem com cores e naipes corretos. A arquitetura agora é uma cópia estrutural do padrão A♠7♠, não apenas uma variação de paleta.
