/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Caminho base no GitHub Pages (site de projeto): https://allan1052.github.io/No-limet-9max/
// Precisa bater EXATAMENTE com o nome do repositório (o Pages diferencia
// maiúsculas). Em desenvolvimento (npm run dev) o Vite usa "/".
const base = process.env.NODE_ENV === "production" ? "/No-limet-9max/" : "/";

// Configuração do Vite: React + Web Worker (Monte Carlo fora da UI) + PWA
// (torna o app instalável no celular, com ícone e funcionamento offline).
// Carimbo de versão (data/hora do build) — exibido no topo para o usuário
// confirmar, no celular, que a versão nova realmente carregou. Guardamos o ISO
// completo (UTC); a interface formata no FUSO LOCAL de cada jogador.
const buildId = new Date().toISOString();

export default defineConfig({
  base,
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    VitePWA({
      // "prompt": o novo service worker fica em espera até a interface aplicar a
      // atualização (via updateSW(true)) — assim avisamos com o banner/botão e
      // recarregamos no momento seguro, sem interromper uma mão.
      registerType: "prompt",
      injectRegister: false, // registramos manualmente em main.tsx (checagem periódica)
      includeAssets: ["apple-touch-icon.png", "icon-192.png", "icon-512.png"],
      // A página pública do site (/site) é servida direto do servidor — o service
      // worker do app não deve interceptá-la com o fallback do SPA.
      workbox: {
        navigateFallbackDenylist: [/\/site(\/|$)/],
      },
      manifest: {
        name: "Call ou Fold — Poker para Recreativos",
        short_name: "Call ou Fold",
        description:
          "Poker para recreativos. Comece grátis, sem arriscar dinheiro — aprenda a tomar as decisões certas. O sonho do recreativo.",
        lang: "pt-BR",
        id: base,
        start_url: base,
        scope: base,
        theme_color: "#14170f",
        background_color: "#0d0f0d",
        display: "standalone",
        orientation: "any",
        // Instala como PWA (WebAPK), não sugere um app nativo relacionado.
        prefer_related_applications: false,
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  worker: {
    format: "es",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
