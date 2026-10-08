/**
 * Modo escuro por variáveis CSS: as cores "neutras" (slate) e os tons claros das
 * cores de destaque viram variáveis que o tema escuro redefine em index.css.
 * Assim nenhuma tela precisa de classes `dark:` — tudo troca de uma vez.
 */
const v = (nome) => `rgb(var(--${nome}) / <alpha-value>)`;
const escala = (cor, tons) => Object.fromEntries(tons.map((t) => [t, v(`${cor}-${t}`)]));

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        superficie: v("superficie"),
        slate: escala("slate", [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        marca: { ...escala("marca", [50, 100, 200, 700, 800]), 500: "#10b981", 600: "#059669" },
        sky: { ...escala("sky", [50, 100, 200, 700, 800]), 300: "#7dd3fc", 500: "#0ea5e9", 600: "#0284c7" },
        orange: { ...escala("orange", [50, 100, 800]), 500: "#f97316" },
        rose: { ...escala("rose", [50, 100, 700]), 500: "#f43f5e" },
        violet: { ...escala("violet", [50, 100, 700]), 500: "#8b5cf6" },
        amber: { ...escala("amber", [50, 100, 200, 700, 800, 900]), 500: "#f59e0b", 600: "#d97706" },
        red: { ...escala("red", [50, 100, 200, 700, 800, 900]), 400: "#f87171", 500: "#ef4444", 600: "#dc2626" },
        emerald: escala("emerald", [100, 800]),
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
