// ---------------------------------------------------------------------------
// DEV LOCK — feature-flag com senha (isolado, não toca no motor).
//
// Allan aprovou: features ainda em teste ficam ESCONDIDAS atrás de uma senha
// digitada pelo próprio Allan. Ex.: senha "rua2026" destrava o Modo Estudo.
// No Perfil há um botão discreto que abre o teclado de senha; o mesmo botão
// bloqueia de novo o que estiver destravado (toggle).
//
// Armazenamento: localStorage, chave `cof-devlock-<lockName>`.
// ---------------------------------------------------------------------------

const PREFIX = "cof-devlock-";

/** As travas existentes. Cada lock pode ter uma senha dedicada; a senha
 *  global "rua2026" destrava TODAS por praticidade do Allan. */
export const DEV_LOCKS = ["rua2026"] as const;
export type DevLockName = (typeof DEV_LOCKS)[number];

export function devLockKey(name: DevLockName): string {
  return PREFIX + name;
}

/** Um lock está destravado se a senha global foi digitada para ele. */
export function isDevUnlocked(name: DevLockName): boolean {
  return localStorage.getItem(devLockKey(name)) === "true";
}

/** Destrava (ou bloqueia, se `unlock === false`). */
export function setDevLock(name: DevLockName, unlock: boolean): void {
  if (unlock) localStorage.setItem(devLockKey(name), "true");
  else localStorage.removeItem(devLockKey(name));
}

/** Destrava TODAS as travas conhecidas (senhas globais). */
export function unlockAllDevLocks(): void {
  for (const name of DEV_LOCKS) setDevLock(name, true);
}

/** Bloqueia TODAS as travas conhecidas. */
export function lockAllDevLocks(): void {
  for (const name of DEV_LOCKS) setDevLock(name, false);
}
