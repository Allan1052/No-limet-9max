# WhatsApp → Controle Financeiro (Google Sheets)

Integração que permite lançar gastos, entradas e horas extras **digitando no WhatsApp**,
com atualização automática da planilha de controle financeiro.

## Arquivos

| Arquivo | O que é |
|---|---|
| **`GUIA-PASSO-A-PASSO.md`** | 👉 **Comece por aqui.** Passo a passo completo (planilha no Google, robô, WhatsApp, webhook). |
| `Codigo.gs` | O robô (Google Apps Script) que recebe as mensagens e escreve na planilha. |

## Como funciona (resumo)

```
Você no WhatsApp        Meta (WhatsApp Cloud API)        Google Apps Script         Google Sheets
   "saída 50 mercado"  ───────────────────────────►  interpreta e lança  ─────►  aba LANÇAMENTO
        ◄────────────  "✅ Lançado: SAÍDA R$ 50,00 — MERCADO. Saldo de JUL: R$ ..."
```

- **Sem servidor e sem custo mensal** — roda no Google Apps Script.
- Os dados ficam **na sua conta Google**.
- Só o **seu número** pode lançar (configurável em `NUMERO_AUTORIZADO`).

## Comandos aceitos

- **Gastos/entradas:** `saída 50 mercado` · `gastei 120,90 farmácia` · `entrada 3000 salário` · `-50 uber` · `+200 freela`
- **Hora extra:** `hora extra 2h 60%` · `he 1,5h 100`
- **Consulta:** `saldo` · `ajuda`

## Observação sobre privacidade

A planilha real (`CONTROLE_FINANCEIRO_ALLAN_*.xlsx`) **não** faz parte deste repositório,
por conter dados financeiros pessoais. Ela é entregue diretamente ao dono.
