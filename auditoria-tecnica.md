# Auditoria Técnica — Call ou Fold PWA

## Problema 1: O SW espera pelo SKIP_WAITING mas nunca recebe

**Arquivo:** `dist/sw.js` (Workbox gerado)
**Arquivo:** `src/main.tsx` (registro do SW)

O Workbox gera um SW que só ativa a nova versão quando recebe a mensagem `{ type: "SKIP_WAITING" }`.
Porém, o `main.tsx` não envia essa mensagem. Ele apenas dispara um evento customizado `sw-update`.

O `pwaUpdate.ts` tem a função `announceUpdate(apply)` que deveria ser chamada, mas o `main.tsx` nunca a chama.

**Resultado:** O SW novo fica em estado "waiting" eternamente. O usuário vê a versão antiga até desinstalar/reinstalar.

**Solução:** O `main.tsx` precisa enviar `SKIP_WAITING` quando o SW novo está instalado.

## Problema 2: O `index.html` tem paths absolutos que quebram no GitHub Pages

**Arquivo:** `index.html`

O fallback screen tem botões com `location.reload()` que não usam o base path.
Mas o problema principal: o `script src="/src/main.tsx"` usa path absoluto.
Na build, o Vite reescreve isso para o path relativo correto, então isso NÃO é problema em produção.

Porém, o fallback screen aparece após 5 segundos se o React não renderizar — isso é um sintoma, não a causa.

## Problema 3: GitHub Pages + Service Worker = risco de "app fora do ar"

Quando o GitHub Actions faz um novo deploy, ele substitui TODOS os arquivos na branch `gh-pages`.
Se um usuário já tem o app instalado, o SW antigo aponta para arquivos JS/CSS com hash antigo.
Se esses arquivos foram deletados do servidor, o SW não consegue buscá-los e o app quebra.

**Solução:** O `forceUpdate` já existe, mas precisa ser ativado automaticamente.
Quando o SW detecta que um arquivo precached não existe mais, deve fazer hard reset automático.

## Problema 4: Precache agressivo sem estratégia de fallback

O SW precacheia `index.html` com revision hash. Quando o `index.html` muda (novo build),
o SW antigo continua servindo o `index.html` antigo até o SKIP_WAITING.

## Problema 5: Sem auto-update no `main.tsx`

O `registerType: "autoUpdate"` está no vite.config, mas `injectRegister: false` desabilita
o registro automático do plugin. O registro manual em `main.tsx` não implementa o autoUpdate.
