# Vida Leve — MVP

PWA mobile-first de reeducação de hábitos e emagrecimento sustentável. O usuário
cadastra dados e rotina, recebe metas diárias (água, proteína, calorias e
"Missões do Dia") e **a cada check-in de peso todo o plano é recalculado**.

> Projeto independente dentro desta pasta — não faz parte do app Call ou Fold.

## Rodar localmente

```bash
cd vida-leve
npm install
npm run dev        # http://localhost:5173
npm test           # testes das fórmulas e do recálculo
npm run build      # typecheck + build de produção em dist/
```

Sem variáveis de ambiente o app roda em **modo local**: sem login, dados no
`localStorage` do navegador. Ótimo para testar.

## Ligar o Supabase (Postgres + Auth)

1. Crie um projeto em supabase.com.
2. No **SQL Editor**, rode `supabase/migrations/0001_init.sql`
   (ou `supabase db push` com a CLI).
3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` (Settings → API).
4. Em Authentication → Providers, deixe **Email** ativo.

Com isso aparece a tela de login (e-mail + senha) e os dados ficam na nuvem,
protegidos por RLS (cada usuário só enxerga as próprias linhas).

## Deploy na Vercel

Importe o repositório, defina **Root Directory = `vida-leve`**, e adicione as
duas variáveis `VITE_SUPABASE_*` (opcional). `vercel.json` já configura build,
saída `dist/` e fallback de SPA.

## Regras de negócio

| Item | Fórmula | Onde |
|---|---|---|
| TMB (Mifflin-St Jeor) | H: `10p + 6,25a − 5i + 5` · M: `10p + 6,25a − 5i − 161` | `calcularTMB` |
| Gasto total | TMB × fator (1,2 / 1,375 / 1,55 / 1,725 / 1,9) | `calcularGastoTotal` |
| Calorias-meta | gasto − 450 kcal (déficit limitado a 400–500), piso 1200 F / 1500 M | `calcularCaloriasMeta` |
| Água | `peso × 35` ml | `calcularMetaAgua` |
| Proteína | `peso × 1,8` g | `calcularMetaProteina` |
| IMC | `peso / altura²`, faixas OMS | `calcularIMC` / `classificarIMC` |

Tudo em `src/lib/calculations.ts` (funções puras, tipagem estrita, testadas).

### Recálculo adaptativo

- **Supabase:** o recálculo acontece **no banco**. Inserir/apagar um
  `weight_logs` dispara `sincronizar_peso_atual()`, que coloca o registro mais
  recente em `profiles.peso_atual`; isso dispara o trigger BEFORE
  `calcular_metas_profile()`, que regrava `tmb`, `meta_agua_ml`,
  `meta_proteina_g` e `calorias_meta`. Mesmo um cliente que grave direto na
  tabela recebe o plano certo. O SQL espelha a lógica TS (validado: mesmos
  números nos dois lados).
- **Modo local:** `LocalRepository` faz o mesmo papel do trigger com
  `recalcularPlano()`.
- A tela de check-in mostra **antes → depois** de cada meta.

## Estrutura

```
src/
  lib/          cálculos, missões, tipos, datas, cliente Supabase
  data/         Repository (contrato) + LocalRepository + SupabaseRepository
  store/        estado global (Zustand)
  components/   barra de progresso, navegação, gráfico SVG, formulário
  screens/      Login, Onboarding (3 passos), Hoje, Check-in, Perfil
supabase/migrations/0001_init.sql   tabelas, triggers e RLS
public/         manifest + service worker (instalável/offline)
```

### Schema

- `profiles`: id, nome, idade, sexo, altura_cm, peso_inicial, peso_atual,
  nivel_atividade, rotina (transporte, horas_sentado, sobe_escadas,
  pratica_atividade), tmb, meta_agua_ml, meta_proteina_g, calorias_meta
- `weight_logs`: id, user_id, peso_kg, data_registro
- `water_logs`: id, user_id, quantidade_ml, data
- `routine_habits`: id, user_id, descricao_habito, tipo, concluido_hoje,
  data_conclusao (a missão "zera" sozinha no dia seguinte)

## Aviso

Estimativas educativas — não substituem nutricionista ou médico.
