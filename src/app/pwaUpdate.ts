// ---------------------------------------------------------------------------
// Sinaliza para a interface quando há uma NOVA versão do app pronta (um novo
// service worker instalado), sem recarregar cegamente no meio de uma mão.
//
// O registro do SW (main.tsx) chama `announceUpdate` quando a versão nova está
// pronta; a interface (App) escuta com `onUpdateAvailable`, mostra o aviso/botão
// e decide QUANDO recarregar — na hora certa (entre mãos) ou quando o usuário
// tocar em "Atualizar".
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

/** Aplica a atualização: ativa o novo service worker e recarrega a página. */
export function applyUpdate(): void {
  if (applyFn) applyFn();
  else location.reload();
}

/** Assina mudanças de disponibilidade; devolve função para cancelar. */
export function onUpdateAvailable(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
