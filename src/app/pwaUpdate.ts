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

/**
 * Resultado de uma verificação de versão contra a rede.
 *
 * - "current"   -> conferido AGORA na internet: o app está na versão publicada.
 * - "outdated"  -> existe versão nova no servidor.
 * - "unknown"   -> não deu para conferir (sem internet, servidor fora, ou o app
 *                  está rodando em modo de desenvolvimento, sem hash no bundle).
 *
 * O "unknown" existe de propósito: dizer "você está atualizado" sem ter
 * conseguido perguntar ao servidor seria uma afirmação inventada.
 */
export type VersionStatus = "current" | "outdated" | "unknown";

/**
 * A regra de decisão, isolada para poder ser testada sem navegador.
 * Compara a identidade do pacote que ESTÁ rodando com a do pacote que o
 * servidor está entregando. Sem uma das duas, não há conclusão possível.
 */
export function compareBundles(current: string, remote: string): VersionStatus {
  if (!current || !remote) return "unknown";
  return current === remote ? "current" : "outdated";
}

let probeInFlight: Promise<VersionStatus> | null = null;

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

/**
 * Pergunta ao servidor qual versão ele está entregando e compara com a que está
 * rodando. Duas chamadas ao mesmo tempo compartilham a MESMA ida à rede (a tela
 * do Perfil e a checagem automática de 10 em 10 minutos podem coincidir).
 */
export function probeVersion(): Promise<VersionStatus> {
  if (available) return Promise.resolve("outdated");
  if (!probeInFlight) {
    probeInFlight = runProbe().finally(() => {
      probeInFlight = null;
    });
  }
  return probeInFlight;
}

async function runProbe(): Promise<VersionStatus> {
  try {
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
          return "outdated";
        }
        if (available) return "outdated";
      }
    }

    const current = currentBundleHash();
    if (!current) return "unknown";
    const res = await fetch(`/index.html?cb=${Date.now()}`, {
      cache: "no-store",
      credentials: "omit",
    });
    if (!res.ok) return "unknown";
    const status = compareBundles(current, extractBundleHash(await res.text()));
    if (status === "outdated") {
      announceUpdate(() => {
        const url = new URL(location.href);
        url.searchParams.delete("u");
        url.searchParams.set("u", Date.now().toString());
        location.replace(url.toString());
      });
    }
    return status;
  } catch {
    return "unknown";
  }
}

/**
 * Mantido para quem só precisa saber "tem versão nova?" (o banner da mesa e a
 * checagem periódica). É a mesma verificação do probeVersion.
 */
export async function checkForUpdate(): Promise<boolean> {
  return (await probeVersion()) === "outdated";
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
