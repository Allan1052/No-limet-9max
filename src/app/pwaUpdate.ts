type Listener = () => void;

let available = false;
let applyFn: (() => void) | null = null;
const listeners = new Set<Listener>();

export function announceUpdate(apply: () => void): void {
  applyFn = apply;
  available = true;
  listeners.forEach((l) => l());
}

export function updateAvailable(): boolean {
  return available;
}

export async function applyUpdate(): Promise<void> {
  try {
    if (applyFn) applyFn();
    await new Promise((resolve) => setTimeout(resolve, 500));
    const url = new URL(location.href);
    url.searchParams.delete("u");
    url.searchParams.set("u", Date.now().toString());
    location.replace(url.toString());
  } catch {
    location.reload();
  }
}

export function onUpdateAvailable(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

let checkInFlight = false;

export function currentBundleHash(): string {
  const script = document.querySelector('script[type="module"]');
  if (!script) return "";
  const m = (script.getAttribute("src") || "").match(/(?:index|main)-([A-Za-z0-9_-]+)\.js/);
  return m ? m[1] : "";
}

export function extractBundleHash(html: string): string {
  const m = html.match(/(?:index|main)-([A-Za-z0-9_-]+)\.js/);
  return m ? m[1] : "";
}

export async function checkForUpdate(): Promise<boolean> {
  try {
    if (available) return true;
    if (checkInFlight) return false;
    checkInFlight = true;

    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        try {
          await reg.update();
        } catch {
          // offline: segue para o fallback de rede
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

/**
 * Rodada 4: atualização manual do Perfil precisa funcionar mesmo quando o SW
 * atual está preso em cache. Primeiro força a revalidação do worker, depois
 * remove registros/caches antigos e navega para um index com cache-buster.
 */
export async function forceNetworkUpdate(): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        try {
          await registration.update();
        } catch {
          // continua: o passo seguinte remove o worker antigo mesmo se update falhar
        }
        const pending = registration.waiting || registration.installing;
        if (pending) {
          try { pending.postMessage({ type: "SKIP_WAITING" }); } catch { /* segue */ }
        }
      }
      await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
    }

    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } finally {
    const url = new URL(location.href);
    url.searchParams.delete("u");
    url.searchParams.set("u", Date.now().toString());
    location.replace(url.toString());
  }
}
