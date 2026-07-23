# 📲 Guia passo a passo — WhatsApp que atualiza sua planilha

Este guia te leva do zero até "digitar no WhatsApp e a planilha atualizar sozinha".
Tempo estimado: **30 a 40 minutos**. Não precisa saber programar — é copiar, colar e clicar.

> **Como funciona no fim:** você manda `saída 50 mercado` no WhatsApp → o Google recebe →
> cria a linha na aba LANÇAMENTO → te responde `✅ Lançado...`. Tudo sem servidor e **sem custo mensal**.

---

## Visão geral das 4 etapas

1. **Colocar a planilha no Google Sheets** (5 min)
2. **Colar o robô (Google Apps Script) e publicar** (10 min)
3. **Criar o WhatsApp na plataforma do Meta** (15 min)
4. **Ligar os dois (webhook) e testar** (5 min)

---

## ETAPA 1 — Planilha no Google Sheets

1. Acesse **https://drive.google.com** (com sua conta Google).
2. Clique em **Novo → Upload de arquivo** e envie o
   `CONTROLE_FINANCEIRO_ALLAN_profissional.xlsx` (o que eu te mandei).
3. Quando aparecer no Drive, **clique com o botão direito → Abrir com → Planilhas Google**.
4. No menu **Arquivo → Salvar como Planilhas Google** (isso cria a versão nativa do Google).
5. Confira rapidinho: abas, gráficos e números vieram certos? (pequenas diferenças de
   visual são normais na conversão; os números e fórmulas continuam iguais).

> ✅ Ao final desta etapa, você tem a planilha aberta no Google Sheets. Deixe essa aba aberta.

---

## ETAPA 2 — O robô (Apps Script)

1. Com a planilha aberta no Google Sheets, vá em **Extensões → Apps Script**.
2. Vai abrir o editor. Apague qualquer código de exemplo que estiver lá.
3. Abra o arquivo **`Codigo.gs`** (deste projeto), **copie tudo** e **cole** no editor.
4. Clique no ícone de **salvar** (disquete) 💾.
5. **Prepare a planilha:** no topo do editor, no seletor de função, escolha
   **`configurarPlanilha`** e clique em **▶ Executar**.
   - O Google vai pedir permissão → **Revisar permissões → sua conta → Avançado →
     Acessar (nome do projeto) → Permitir**. (É normal, é o seu próprio script.)
   - Isso cria a aba **HORA EXTRA (WHATSAPP)** e liga o total ao seu salário
     (`SALÁRIO!C7`), **sem quebrar** a grade diária que já existia.
6. **Publique como aplicativo web:**
   - Clique em **Implantar → Nova implantação**.
   - Em "Tipo", escolha **App da Web**.
   - Em "Executar como" → **Eu (sua conta)**.
   - Em "Quem pode acessar" → **Qualquer pessoa**.
   - Clique **Implantar** e **copie a URL** que aparece
     (algo como `https://script.google.com/macros/s/AKfy.../exec`).
   - 📌 **Guarde essa URL** — é o endereço do seu robô.

> ⚠️ Toda vez que você mudar o código, precisa **Implantar → Gerenciar implantações →
> editar → Nova versão**, senão a mudança não entra no ar.

---

## ETAPA 3 — WhatsApp na plataforma do Meta (grátis)

Você vai usar a **API oficial do WhatsApp (Cloud API)** da Meta. É gratuita para uso pessoal.

1. Acesse **https://developers.facebook.com** e faça login com sua conta do Facebook.
2. **Criar aplicativo:** botão **Meus apps → Criar app → Outro → Empresa (Business)**.
   Dê um nome (ex: "Planilha Allan") e crie.
3. No painel do app, procure **WhatsApp** e clique em **Configurar**.
4. A Meta te dá um **número de teste** e um **Token temporário**. Você vai ver:
   - **Token de acesso temporário** (dura 24h — depois a gente gera um permanente)
   - **Identificação do número de telefone** (Phone number ID)
   - Um campo pra **adicionar o SEU número** como destinatário de teste → adicione o seu
     e confirme o código que chega no seu WhatsApp.
5. Anote esses dois valores: **Token** e **Phone number ID**.

### Guardar as credenciais no robô (com segurança)

1. Volte no editor do Apps Script (Etapa 2).
2. Abra a função **`configurarCredenciais`** e preencha:
   ```js
   VERIFY_TOKEN:      'invente_uma_senha',      // você inventa (guarde, usa na Etapa 4)
   WHATSAPP_TOKEN:    'cole_o_token_do_meta',
   PHONE_NUMBER_ID:   'cole_o_phone_number_id',
   NUMERO_AUTORIZADO: '55XXYYYYYYYYY',          // seu número: 55 + DDD + número
   ```
3. Selecione a função **`configurarCredenciais`** e clique **▶ Executar**.
4. **Apague os valores** da função depois (eles já ficaram salvos com segurança).

---

## ETAPA 4 — Ligar os dois (webhook) e testar

1. No painel do WhatsApp no Meta, vá em **Configuração → Webhook → Editar**.
2. Em **URL de retorno de chamada (Callback URL)**: cole a **URL do seu robô** (Etapa 2).
3. Em **Verificar token (Verify token)**: digite o mesmo **VERIFY_TOKEN** que você inventou.
4. Clique **Verificar e salvar**. Deve dar certo (o robô responde o "desafio" do Meta).
5. Ainda na tela de Webhook, clique em **Gerenciar** e **assine (Subscribe)** o campo
   **`messages`**.
6. **Teste!** Mande no seu WhatsApp, para o número de teste do Meta:
   ```
   saída 50 mercado
   ```
   Em segundos deve chegar `✅ Lançado: SAÍDA R$ 50,00 — MERCADO ...` e a linha aparece
   na aba LANÇAMENTO. 🎉

---

## 🧾 Formatos que o robô entende

| Você digita | Resultado |
|---|---|
| `saída 50 mercado` | SAÍDA · R$ 50,00 · MERCADO · hoje |
| `gastei 120,90 farmácia` | SAÍDA · R$ 120,90 · FARMÁCIA · hoje |
| `entrada 3000 salário` | ENTRADA · R$ 3.000,00 · SALÁRIO · hoje |
| `-50 uber` | SAÍDA · R$ 50,00 · UBER (atalho) |
| `+200 freela` | ENTRADA · R$ 200,00 · FREELA (atalho) |
| `hora extra 2h 60%` | 2h a 60% = R$ 115,52 · soma no salário |
| `he 1,5h 100` | 1,5h a 100% · soma no salário |
| `saldo` | mostra o saldo do mês |
| `ajuda` | mostra a lista de formatos |

---

## ⏳ Depois do teste: token permanente

O token da Etapa 3 é temporário (24h). Para o robô funcionar sempre:

1. No Meta: **Configurações do app → Usuários do sistema** (Business Settings) →
   crie um **usuário do sistema**, dê acesso ao app do WhatsApp e **gere um token
   permanente** com as permissões `whatsapp_business_messaging` e
   `whatsapp_business_management`.
2. Rode `configurarCredenciais` de novo só com o novo `WHATSAPP_TOKEN`.

> Quando você quiser, eu te guio nesse passo do token permanente e em conectar
> **seu número real** de WhatsApp (em vez do número de teste) — isso exige um
> cadastro simples da conta comercial (WhatsApp Business Platform), também gratuito.

---

## 🆘 Problemas comuns

- **"Verificar e salvar" falhou (Etapa 4):** confira se o `VERIFY_TOKEN` do Meta é
  **idêntico** ao que você salvou em `configurarCredenciais`, e se a URL do robô termina
  em `/exec`.
- **Não chega resposta no WhatsApp:** o `WHATSAPP_TOKEN` pode ter expirado (24h) — gere
  outro. Confira também se você assinou o campo **`messages`** no webhook.
- **"Número não autorizado":** o `NUMERO_AUTORIZADO` precisa ser no formato
  `55` + DDD + número, sem espaços nem sinais.
- **Mudei o código e não surtiu efeito:** você precisa **Implantar → Nova versão**.

---

## 🔒 Sobre segurança

- Seus dados financeiros ficam **na sua conta Google**, não em servidor de terceiros.
- O robô só aceita mensagens do **seu número** (`NUMERO_AUTORIZADO`).
- **Nunca** cole o `WHATSAPP_TOKEN` em lugares públicos (GitHub, prints, etc.).
