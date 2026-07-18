/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuração do Vite: React + Web Worker (para o Monte Carlo rodar fora da UI).
export default defineConfig({
  plugins: [react()],
  worker: {
    format: "es",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
