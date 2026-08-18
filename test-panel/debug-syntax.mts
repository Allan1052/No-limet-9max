import * as fs from "node:fs";

const stubs = `
var RANKS=["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
var SUITS=["♣","♦","♥","♠"];
var HAND_NAMES=["Carta alta","Par","Dois pares","Trinca","Sequência","Flush","Full house","Quadra","Straight flush","Royal flush"];
var xe=function(c){return RANKS[(c-2)%13];};
var G=function(c){return Math.floor((c-2)/13)+2;};
var re=function(c){return (c-2)%4;};
var De=function(cards){return cards.map(c=>({r:G(c),s:re(c)}));};
var Wn=function(hand){return 0;};
var Vn=HAND_NAMES;
var Is="#1a2e1a";
var $s="#0c140c";
var p=function(txt,maxW,ctx){return txt;};
var A=function(txt,maxW,ctx){return [txt];};
`;

const code = fs.readFileSync("/tmp/live-share-mod.js", "utf8");
const wrapped =
  stubs +
  "(function(){" +
  "var __out__={};" +
  code.replace(/async function (Ed|zd|Id)\(e\)\{/g, "__out__.$1 = async function(e){") +
  ";return __out__;})()";

fs.writeFileSync("/tmp/wrapped.js", wrapped);
try {
  new Function(wrapped);
  console.log("syntax OK");
} catch (e) {
  console.log("SYNTAX ERROR:", e instanceof Error ? e.message : e);
  if (e instanceof Error && e.message.includes("Unexpected")) {
    // achar posição
    const msg = e.message;
    console.log("full:", msg.slice(0, 200));
  }
}
