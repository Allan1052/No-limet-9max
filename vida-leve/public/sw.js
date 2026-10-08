// Service worker: deixa o app instalável, abre offline o "casco" do app e
// lembra da água em segundo plano (onde o navegador permitir).
// Estratégia de rede: rede primeiro, cache como reserva (atualizações chegam logo).
const CACHE = "vida-leve-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["/", "/index.html", "/manifest.webmanifest", "/icon.svg", "/icon-192.png"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== "vida-leve-config").map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/index.html"))),
  );
});

// ── Lembrete de água em segundo plano (Chrome/Android com o app instalado) ──
const hojeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

self.addEventListener("periodicsync", (event) => {
  if (event.tag !== "lembrete-agua") return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open("vida-leve-config");
      const r = await cache.match("/__lembretes.json");
      if (!r) return;
      const d = await r.json();
      const c = d.config;
      const h = new Date().getHours();
      if (!c || !c.agua || h < c.inicioH || h >= c.fimH) return;
      // Se o espelho é de outro dia, o total de hoje é 0.
      const total = d.data === hojeLocal() ? d.total : 0;
      if (total >= d.meta) return;
      if (d.ultimo && Date.now() - Date.parse(d.ultimo) < c.aguaIntervaloH * 36e5) return;
      const abertos = await self.clients.matchAll({ type: "window" });
      if (abertos.some((w) => w.visibilityState === "visible")) return; // o app aberto cuida disso
      await self.registration.showNotification("💧 Hora de beber água", {
        body: "Um copo agora ajuda a bater a meta de hoje.",
        tag: "agua",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
      const aberto = ws.find((w) => "focus" in w);
      return aberto ? aberto.focus() : self.clients.openWindow("/");
    }),
  );
});
