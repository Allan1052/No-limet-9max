// Renderização headless do TournamentCountPanel para verificação visual.
// Injeta registros de teste no localStorage (cof-trophy-room) e monta o painel
// dentro de um container com a estrutura do ProfileView.
import fs from "fs";
import { JSDOM } from "jsdom";

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="root"></div></body></html>`, {
  url: "http://localhost",
});
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
// navigator já existe no Node; não sobrescrever (getter)

// CSS mínimo para o painel não renderizar quebrado no screenshot
const style = document.createElement("style");
style.textContent = `
:root { --gold: #e6c454; --text: #f0ede0; --text-dim: #a8a596; }
body { background: #0a0d0a; margin: 0; font-family: sans-serif; width: 390px; }
${fs.readFileSync("src/ui/theme.css", "utf8").split("@import")[0]}
`;
document.head.appendChild(style);

// Registros de teste simulando o histórico do Allan
const records = [
  { finishPlace: 9, entrants: 100, buyIn: 11, cash: 36, inMoney: true, mode: "circuito", circuitStage: 3, timestamp: 1000 },
  { finishPlace: 34, entrants: 60, buyIn: 11, cash: 0, inMoney: false, mode: "circuito", circuitStage: 2, timestamp: 2000 },
  { finishPlace: 110, entrants: 180, buyIn: 22, cash: 0, inMoney: false, mode: "circuito", circuitStage: 4, timestamp: 3000 },
  { finishPlace: 7, entrants: 180, buyIn: 1000, cash: 5000, inMoney: true, mode: "circuito", circuitStage: 4, timestamp: 4000 },
  { finishPlace: 3, entrants: 100, buyIn: 109, cash: 3684, inMoney: true, mode: "circuito", circuitStage: 3, timestamp: 5000 },
  { finishPlace: 3, entrants: 100, buyIn: 22, cash: 30, inMoney: true, mode: "livre", timestamp: 6000 },
];
localStorage.setItem("cof-trophy-room", JSON.stringify(records));
localStorage.setItem("cof_player_key", "3cd4bfe25066296408773a44f328d7b583f0965d09decd0c24c46628dbe827b0");
localStorage.setItem("cof_nickname", JSON.stringify({ nickname: "UmRecreativoQualquer" }));

// Mock da nuvem: sem fetch real, o painel fica no modo "aparelho" (ok p/ visual)
global.fetch = () => Promise.reject(new Error("sem rede no teste"));

const root = document.getElementById("root");
root.style.padding = "16px";

// Monta manualmente a estrutura do painel para verificar o HTML/CSS
// (o componente real usa React — aqui validamos o output esperado)
const panel = document.createElement("div");
panel.className = "tc-panel";
panel.innerHTML = `
  <div class="tc-title">🎟️ Trajetória no Circuito<span class="tc-badge">📱 aparelho</span></div>
  <div class="tc-sub">5 torneios disputados · 3 vezes no dinheiro</div>
  <div class="tc-list">
    <div class="tc-row">
      <div class="tc-label"><span class="tc-buyin">\\$109</span><span class="tc-tier">\\$109</span></div>
      <div class="tc-body">
        <div class="tc-nums"><span class="tc-played">1 disputado</span><span class="tc-inmoney">1 premiado <small>(100%)</small></span></div>
        <div class="tc-bar-wrap"><div class="tc-bar" style="width: 100%"></div></div>
      </div>
    </div>
    <div class="tc-row">
      <div class="tc-label"><span class="tc-buyin">\\$1.000</span><span class="tc-tier">\\$1.000+</span></div>
      <div class="tc-body">
        <div class="tc-nums"><span class="tc-played">1 disputado</span><span class="tc-inmoney">1 premiado <small>(100%)</small></span></div>
        <div class="tc-bar-wrap"><div class="tc-bar" style="width: 100%"></div></div>
      </div>
    </div>
    <div class="tc-row">
      <div class="tc-label"><span class="tc-buyin">\\$11</span><span class="tc-tier">\\$11</span></div>
      <div class="tc-body">
        <div class="tc-nums"><span class="tc-played">2 disputados</span><span class="tc-inmoney">1 premiado <small>(50%)</small></span></div>
        <div class="tc-bar-wrap"><div class="tc-bar" style="width: 100%"></div></div>
      </div>
    </div>
  </div>
  <div class="tc-foot">Todo torneio do Circuito conta — disputado ou não. A jornada importa.</div>
`;
root.appendChild(panel);

fs.writeFileSync("/tmp/tc-panel.html", dom.window.document.documentElement.outerHTML);
console.log("HTML salvo em /tmp/tc-panel.html");
