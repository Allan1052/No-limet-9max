# Reestruturação da navegação — 3 abas (plano registrado)

> Decisão do Allan. Registrado no Git para ficar pronto e reversível. Este
> documento é o MAPA; a implementação em `BottomNav`/`App.tsx` é coordenada
> (arquivos compartilhados). **Nada é apagado** — o que sai do menu continua no
> código, com um comentário marcando a decisão.

Mockup visual da proposta:
https://claude.ai/code/artifact/876ef049-ea75-40e2-be77-547236c2f630

## Princípio
A home é **uma decisão** (a Mão do dia), não um cardápio. As 5 abas atuais
(`jogar · treinar · sua mão · estudar · mais`) viram **3 + Perfil**, e tudo desce
organizado. Fim do "empurra aba, aba, aba".

## As 3 abas + Perfil

### 🏠 Hoje — "uma mão por vez" (porta de entrada)
- **Mão do dia** em destaque (`DailyHand`)
- **Streak** visível
- Atalho **"Analisar minha mão"** (HandLab / Sua Mão)

### 🎯 Treinar — "pratica"
- **Circuito** (`CampaignView`) — **MANTER**: o Allan gosta de jogar pra treinar.
- Torneio 1×1 (`play`/`torneio`)
- Drills / Ultra (`drill`, `ultra`)
- Mesa final (`ft`)

### 📚 Estudar — "entende"
- Sua Mão / análise (`HandLab` / `suamao`)
- Ranges de referência (`ranges`)
- ICM (`icm`)
- Anatomia / Aprenda (`anatomia`, `aprenda`)

### ☰ Perfil (canto — não é aba principal)
- Ranking (`ranking`)
- Missões (`missoes`)
- Importar mãos (`importar`)
- Ajustes / perfil (`perfil`)

## Sai do MENU principal — NÃO é apagado
Estes só saem da barra principal e descem pra dentro das 3 abas / Perfil. O
componente continua inteiro no projeto. Padrão já usado no projeto (ver o
comentário do "Rua por Rua" / `street` em `BottomNav.tsx`): remover da nav +
deixar comentário datado; re-adicionar é uma linha.

| Item | Novo lar |
|------|----------|
| Ranking | Perfil |
| Missões | Perfil |
| Importar | Perfil |
| Ranges | Estudar |
| ICM | Estudar |
| Anatomia | Estudar |
| Ultra / Drill | Treinar (dentro de Treinar, não solto no menu) |

## Duas camadas de segurança (pedido do Allan)
1. **Código fica no projeto.** Sai só do menu, com comentário datado. Voltar =
   descomentar/reapontar uma rota.
2. **Git guarda todo o histórico.** Nenhuma versão se perde.

## O que NÃO muda
Circuito, torneio, drills, mesa final, ranges, ICM, anatomia, aprenda, Sua Mão,
ranking, missões, importar — **tudo continua no app**. Muda só ONDE cada um mora
e qual é a porta de entrada.

## O que some
Nada. (A **áurea**, que o Allan mandou tirar, já foi removida — commit separado.)

## Status
- [x] Plano desenhado e aprovado pelo Allan
- [x] Registrado no Git (este arquivo)
- [ ] Implementação da barra (`BottomNav`/`App.tsx`) — coordenar (arquivos compartilhados)
- [ ] Home "Hoje" com a Mão do dia em destaque
