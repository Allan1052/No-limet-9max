// ---------------------------------------------------------------------------
// Sinaliza para a interface quando há uma NOVA versão do app pronta (um novo
// service worker instalado), sem recarregar cegamente no meio de uma mão.
//
// O registro do SW (main.tsx) chama `announceUpdate` quando a versão nova está
// pronta; a interface (App) escuta com `onUpdateAvailable`, mostra o aviso/botão
// e decide QUANDO recarregar — na hora certa (entre mãos) ou quando o usuário
// tocar em "Atualizar".
//
// MELHORIA: o applyUpdate agora envia SKIP_WAITING + limpa caches antigos
// para evitar que o app fique preso em bundles que não existem mais no servidor.
// ---------------------------------------------------------------------------

type Listener = () => void;

let available = false;
let applyFn: (() => void) | null = null;
const listeners = new Set<Listener>();

/** Chamado pelo registro do SW quando uma nova versão terminou de instalar. */
export function announceUpdate(apply: () => void): void {
  applyFn = apply;
  available = true;
  listeners.forEach((l) => l());
}

export function updateAvailable(): boolean {
  return available;
}

/**
 * Aplica a atualização de forma segura:
 * 1. Envia SKIP_WAITING para o SW novo ativar
 * 2. Espera o SW novo assumir controle
 * 3. Recarrega a página
 *
 * Isso elimina a necessidade de desinstalar/reinstalar o app.
 */
export async function applyUpdate(): Promise<void> {
  try {
    // Envia SKIP_WAITING para forçar ativação do SW novo
    if (applyFn) {
      applyFn();
    }

    // Aguarda um tick para o SW processar o SKIP_WAITING
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Recarrega forçando rede (cache-buster)
    const url = new URL(location.href);
    url.searchParams.delete("u");
    url.searchParams.set("u", Date.now().toString());
    location.replace(url.toString());
  } catch {
    // Fallback: recarrega normalmente
    location.reload();
  }
}

/** Assina mudanças de disponibilidade; devolve função para cancelar. */
export function onUpdateAvailable(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ---------------------------------------------------------------------------
// Detecção manual de nova versão: compara o hash do bundle index servido pelo
// servidor com o hash do bundle em execução. Se o servidor já estiver servindo
// a versão nova (deploy feito enquanto o usuário usa o app), marca o update
// disponível — assim o botão "Atualizar" fica visível SEMPRE que houver
// versão nova, mesmo sem o SW avisar (registerType autoUpdate baixa os assets
// em segundo plano mas não força o reload).
// ---------------------------------------------------------------------------

let checkInFlight = false;

export function currentBundleHash(): string {
  // O hash do bundle em execução é o script type="module" carregado na página
  const script = document.querySelector('script[type="module"]');
  if (!script) return "";
  const m = (script.getAttribute("src") || "").match(/index-([A-Za-z0-9_-]+)\.js/);
  return m ? m[1] : "";
}

export function extractBundleHash(html: string): string {
  const m = html.match(/index-([A-Za-z0-9_-]+)\.js/);
  return m ? m[1] : "";
}

/**
 * Verifica (silencioso) se há uma versão nova no servidor e, se houver, deixa o
 * botão "Atualizar" disponível.
 *
 * ANTES o app buscava o /index.html e comparava o hash — mas o próprio service
 * worker devolvia o index.html DO CACHE (versão velha), então nunca detectava e
 * o botão não aparecia. Agora o caminho principal pede ao SW para revalidar o
 * sw.js na REDE (registration.update()): se houver worker novo (installing/
 * waiting), avisamos a UI. O antigo comparador de hash fica só como reserva.
 */
export async function checkForUpdate(): Promise<boolean> {
  try {
    if (available) return true;
    if (checkInFlight) return false;
    checkInFlight = true;

    // 1) CAMINHO CONFIÁVEL: perguntar ao service worker (bate na rede sempre).
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        try {
          await reg.update(); // revalida o sw.js no servidor
        } catch {
          // sem rede — tenta o fallback abaixo
        }
        const pending = reg.waiting || reg.installing;
        if (pending && navigator.serviceWorker.controller) {
          announceUpdate(() => {
            (reg.waiting || pending).postMessage({ type: "SKIP_WAITING" });
          });
          return true;
        }
        if (available) return true;
      }
    }

    // 2) RESERVA: compara o hash do bundle servido pela rede com o em execução.
    const current = currentBundleHash();
    if (!current) return false;
    const res = await fetch(`/index.html?cb=${Date.now()}`, {
      cache: "no-store",
      credentials: "omit",
    });
    if (!res.ok) return false;
    const remote = extractBundleHash(await res.text());
    if (!remote || remote === current) return false;

    announceUpdate(() => {
      const url = new URL(location.href);
      url.searchParams.delete("u");
      url.searchParams.set("u", Date.now().toString());
      location.replace(url.toString());
    });
    return true;
  } catch {
    return false;
  } finally {
    checkInFlight = false;
  }
}
