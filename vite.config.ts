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
// Carimbo de versão (data/hora do build) — exibido no rodapé para o usuário
// confirmar, no celular, que a versão nova realmente carregou.
const buildId = new Date().toISOString().slice(0, 16).replace("T", " ");

export default defineConfig({
  base,
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // registramos manualmente em main.tsx (checagem periódica)
      includeAssets: ["apple-touch-icon.png", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Poker Sim — Estudo NLHE 9-max",
        short_name: "Poker Sim",
        description: "Simulador de estudo de poker NLHE 9-max com bots, feedback e ICM.",
        lang: "pt-BR",
        theme_color: "#14170f",
        background_color: "#0d0f0d",
        display: "standalone",
        orientation: "any",
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
