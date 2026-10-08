import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const raiz = document.getElementById("root");
if (!raiz) throw new Error("Elemento #root não encontrado");

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* sem SW o app funciona normalmente, só não fica offline */
    });
  });
}
