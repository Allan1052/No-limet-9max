# Vida Leve

PWA mobile-first de reeducação de hábitos e emagrecimento sustentável. O usuário
cadastra dados, rotina e saúde, recebe metas diárias (água, proteína, calorias e
"Missões do Dia") e **a cada check-in de peso todo o plano é recalculado** — e,
com o tempo, **ajustado ao ritmo real** de cada pessoa.

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes (fórmulas, recálculo adaptativo, missões, conquistas…)
npm run build      # typecheck + build de produção em dist/
```

Sem variáveis de ambiente o app roda em **modo local**: sem login, dados no
navegador. Ótimo para testar.

## Ligar o Supabase (Postgres + Auth)

1. Crie um projeto em supabase.com.
2. No **SQL Editor**, rode `supabase/migrations/0001_init.sql`.
3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` (Settings → API).
4. Em Authentication → Providers, deixe **Email** ativo.

Com isso aparecem login, sincronização entre aparelhos e o **modo dupla**.
Testes do banco (Postgres puro, sem Supabase): `supabase/tests/README.md`.

## Deploy na Vercel

Importe o repositório (a Vercel detecta Vite) e adicione as variáveis
`VITE_SUPABASE_*` (opcional). `vercel.json` já configura build, saída e SPA.

## Funcionalidades

| Tela | O que tem |
|---|---|
| Cadastro | 4 passos: dados, rotina, saúde (gestação / condição de saúde), prévia do plano |
| Hoje | Anel "seu dia" (água + missões + proteína), sequências 🔥💧, alertas de segurança, IMC, água com copos personalizados, proteína/calorias consumidas, missões do dia com nível |
| Comida | Atalhos de alimentos comuns (TACO), alimento livre, barras de proteína/calorias |
| Progresso | Check-in com antes → depois e **ajuste adaptativo**, ritmo real × previsto, gráfico com tendência, medidas (cintura/altura), fotos locais, conquistas, card para compartilhar |
| Perfil | Dados, rotina, saúde, lembretes, tema claro/escuro, copos, modo dupla, privacidade (LGPD) |

## Regras de negócio

| Item | Regra | Onde |
|---|---|---|
| TMB (Mifflin-St Jeor) | H: `10p + 6,25a − 5i + 5` · M: `10p + 6,25a − 5i − 161` | `lib/calculations.ts` |
| Gasto total | TMB × fator (1,2 / 1,375 / 1,55 / 1,725 / 1,9) | idem |
| Calorias | gasto − 450 (déficit 400–500) + ajuste adaptativo (±300), piso 1200 F / 1500 M | idem |
| Manutenção | gestante/amamentando ou IMC < 18,5 → sem déficit | idem |
| Água / proteína | `peso × 35` ml / `peso × 1,8` g | idem |
| Idade | mínimo 18 anos | idem |
| Ajuste adaptativo | regressão linear das pesagens dos últimos 35 dias (≥ 3 pesagens em ≥ 14 dias); ritmo < 40% do previsto → −100 kcal; perda > 1% do peso/semana → +100 kcal; no máximo 1 ajuste a cada 14 dias | `lib/adaptive.ts` |
| Missões | 5 por dia (transporte, movimento, postura, 2 hábitos), sorteio determinístico por pessoa+dia, evita repetir ontem, sobem de nível a cada 5 conclusões | `lib/habits.ts` |
| Sequências | dias seguidos (hoje não quebra a sequência antes de acabar) | `lib/conquistas.ts` |

### Recálculo no banco

Inserir/apagar um `weight_logs` dispara `sincronizar_peso_atual()`, que põe o
registro mais recente em `profiles.peso_atual`; o trigger BEFORE
`calcular_metas_profile()` (em **qualquer** update do perfil) regrava TMB, água,
proteína e calorias, considerando `ajuste_kcal` e o modo manutenção. O SQL
espelha a lógica TS — os testes dos dois lados usam os mesmos números.

### Lembretes (limite honesto de um app web sem servidor)

- App aberto/em segundo plano: notificações de água e check-in.
- Android com o app instalado: o service worker acorda periodicamente
  (*periodic background sync*) e lembra da água.
- App fechado (sobretudo iPhone): botão que põe o check-in semanal no
  **calendário** (.ics recorrente com alarme).

Push com o app 100% fechado exige um servidor de Web Push (próximo passo
possível com uma Edge Function do Supabase).

## Privacidade

Fotos ficam **só no aparelho** (IndexedDB). O parceiro do modo dupla vê apenas
primeiro nome, placar do dia, sequências e — se a pessoa permitir — os kg
perdidos. "Baixar meus dados" exporta JSON; "Apagar" remove tudo (no Supabase,
a conta inteira, via `apagar_minha_conta()`).

## Estrutura

```
src/
  lib/        cálculos, adaptativo, missões, conquistas, lembretes, alimentos,
              segurança, medidas, card, fotos (IndexedDB), tipos
  data/       Repository (contrato) + LocalRepository + SupabaseRepository
  store/      estado global (Zustand), preferências do aparelho, comemorações
  hooks/      tema, comemorações, resumo do modo dupla
  components/ anel do dia, barras, gráfico SVG, formulário, avisos, confete
  screens/    Login, Cadastro, Hoje, Comida, Progresso (peso, medidas, fotos,
              conquistas), Perfil (lembretes, aparência, dupla, privacidade)
supabase/     migrations/0001_init.sql (tabelas, triggers, RLS, RPCs) + tests/
public/       manifest, ícones, service worker
scripts/      gerar-icones.mjs
```

## Aviso

Estimativas educativas — não substituem nutricionista ou médico.
