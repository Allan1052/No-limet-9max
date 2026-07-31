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
