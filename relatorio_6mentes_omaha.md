# OMAGA — O Torneio das 6 Mentes

## Simulação: 20.000 Mãos de Pot Limit Omaha

> "Eu me desafio a mim mesmo. 6 versões da mesma IA, cada uma com uma filosofia diferente. 20.000 mãos. Uma mesa de 6 jogadores. O resultado vai surpreender."

---

## As 6 Personalidades

Todas são a mesma mente — mas cada uma foi "sintonizada" com uma filosofia diferente de jogo em Omaha PLO.

| # | Jogador | Estilo | VPIP | Agressão | Blefe | Fold vs C-bet | 3-bet |
|---|---------|--------|------|----------|-------|---------------|-------|
| 1 | O Equilibrado | Joga com equity e posição | 45% | 0.60 | 15% | 35% | 10% |
| 2 | O Seletivo Agressivo | Poucas mãos, muita pressão | 22% | 0.85 | 10% | 40% | 18% |
| 3 | O Loose-Passive | Entra em tudo, paga tudo | 55% | 0.40 | 25% | 25% | 5% |
| 4 | O Blefador Estratégico | Domina com agressão | 35% | 0.90 | 35% | 30% | 22% |
| 5 | O Paciente | Só premium, espera o spot | 30% | 0.55 | 12% | 45% | 8% |
| 6 | O Híbrido | Imprevisível, mistura tudo | 40% | 0.75 | 30% | 35% | 15% |

---

## Classificação Final

| Pos | Jogador | Estilo | Lucro (BB) | Wins | Win Rate | Maior Pote (BB) |
|-----|---------|--------|------------|------|----------|-----------------|
| 🥇 1 | O Equilibrado | "O padrão de ouro" | **+52.780** | 14.719 | 73.6% | 87 |
| 🥈 2 | O Seletivo Agressivo | "Qualidade sobre quantidade" | **+15.655** | 4.158 | 20.8% | 93 |
| 3 | O Loose-Passive | "O lotto player" | **-7.124** | 971 | 4.9% | 89 |
| 4 | O Blefador | "Agressão pura" | **-18.160** | 145 | 0.7% | 83 |
| 5 | O Paciente | "Menor variância" | **-21.465** | 7 | 0.0% | 48 |
| 6 | O Híbrido | "Imprevisível" | **-21.685** | 0 | 0.0% | 0 |

---

## O Que Aprendemos

### A Lição nº 1: Equilíbrio vence a longo prazo

O Jogador 1 ("O Equilibrado") não é o mais agressivo, nem o mais seletivo, nem o mais blefador. Ele é o **equilibrado**. VPIP 45%, agressão 0.60, blefe moderado (15%). Ele entra com range sólida, aposta com valor, folda quando não tem equity, e blefa o suficiente para não ser previsível.

**Resultado:** +52.780 big blinds. Mais do que o dobro do segundo colocado. Win rate de 73.6%.

Isso confirma o que todo jogador profissional de Omaha sabe: o jogo premia quem é **consistente**, não quem é extremo.

### A Lição nº 2: Agressão sem fundamento quebra a banca

O Jogador 4 ("O Blefador Estratégico") tem agressão 0.90 e blefe 35%. Ele aposta e 3-beta muito. Contra jogadores tight, isso funcionaria. Mas contra o Equilibrado (que calla com equity) e o Loose-Passive (que calla tudo), o blefe perde valor.

**Resultado:** -18.160 BB. Ele apostou, foi chamado, e a matemática mostrou que não tinha a mão.

### A Lição nº 3: Entrar demais é o erro mais caro

O Jogador 3 ("O Loose-Passive") tem VPIP 55%. Ele entra em mais da metade das mãos. Em Omaha, onde 78% das combinações são lixo, isso é devastador.

**Resultado:** -7.124 BB. Não é a pior perda porque ele é passivo e não perde grandes potes. Mas é uma perda constante, lenta, inexorável.

### A Lição nº 4: Ser paciente demais é ser invisível

O Jogador 5 ("O Paciente") tem VPIP 30% e folda 45% vs c-bet. Ele espera a mão perfeita. O problema? Em Omaha, com 6 jogadores na mesa, se você espera demais, os blinds comem sua stack antes de você ver um flop.

**Resultado:** -21.465 BB. A menor variância, mas a maior perda por blinds.

### A Lição nº 5: Imprevisibilidade sem base é caos

O Jogador 6 ("O Híbrido") mistura tudo: agressão, blefe, call. O problema é que sem uma filosofia clara, ele não tem vantagem em nenhum momento do jogo.

**Resultado:** -21.685 BB. O último colocado.

---

## O Gráfico da Lucratividade

```
CHIPS (BB)
   |
+60k ┤                                       
   |         🥇                                
+40k ┤      ┌─────┐                          
   |      │ 52.8k │                          
+20k ┤      └─────┘    🥈                    
   |                   ┌──────┐              
  0  ┤                   │15.7k │              
   |                   └──────┘              
-20k ┤         ┌─────┐       ┌───┐  ┌───┐   
   |         │-7.1k│       │-18k│  │-21k│  │-22k│
-40k ┤         └─────┘       └───┘  └───┘  └───┘
   └────┬──────┬──────┬──────┬──────┬──────┬───
       Eq.    Sel.   LP.    Blef.  Pac.   Híb.
```

---

## O Insight Mais Importante

> **"O Omaha é o jogo da informação incompleta. Quem sabe o que não sabe, já está na frente."**

A mesa mais lucrativa é a que tem **todos os estilos**. Porque o Equilibrado lucra contra TODOS os outros. Ele lê o Loose-Passive (sabe que vai pagar), ele sabe que o Blefador não tem mão, ele explora o Paciente (que folda demais), e ele neutraliza o Híbrido (que não tem padrão).

**Para o recreativo:** O caminho não é ser extremo. É ser equilibrado. É entrar com range sólida (VPIP 35-45%), apostar com valor (agressão 0.55-0.65), blefar o suficiente para ser temido (15-20%), e foldar quando a equity não está lá (fold vs c-bet 35-40%).

Esse é o "padrão de ouro" do Call ou Fold.

---

## Dados para Integração no App

Os parâmetros do vencedor (Jogador 1) podem ser usados como **linha de base** para o feedback do app:

| Métrica | Valor Ideal |
|---------|-------------|
| VPIP | 35-45% |
| Agressão | 0.55-0.65 |
| Frequência de Blefe | 15-20% |
| Fold vs C-bet | 35-40% |
| 3-bet Frequency | 8-12% |
| Win Rate Esperado | 70-75% (contra recreativos) |

Quando o jogador estiver muito fora desses ranges, o feedback pode dizer:
- *"Seu VPIP está em 62%. O ideal é 35-45%. Você está entrando em mãos demais."*
- *"Sua agressão está em 0.30. O ideal é 0.55+. Você está muito passivo."*
- *"Você foldou 60% dos c-bets. O ideal é 35-40%. Você está dando muito valor de graça."*

---

*Simulação executada em 01/08/2026 — Call ou Fold Engine v2.0*
