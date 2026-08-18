// Renderiza os cards corrigidos via CDP — chromium headless em :9222
// Sem dependências externas: websocket feito à mão (tcp/net + crypto sha1) e JSON/HTTP via node built-ins.
import net from "net";
import crypto from "crypto";
import fs from "fs";

const DEV_URL = "http://localhost:5177";
const OUT_DIR = "/tmp/cards-corrigidos";
let id = 0;

function cdpConnect() {
  return fetch("http://localhost:9222/json/new?about:blank", { method: "PUT" })
    .then((r) => r.json())
    .then((target) => new Cdp(target.webSocketDebuggerUrl, target.id));
}

class Cdp {
  constructor(wsUrl, targetId) {
    this.targetId = targetId;
    this.wsUrl = wsUrl;
    this.queue = [];
    this.pending = new Map();
  }

  async open() {
    await new Promise((resolve, reject) => {
      const key = crypto.randomBytes(16).toString("base64");
      const url = new URL(this.wsUrl);
      const sock = net.createConnection({ port: Number(url.port || 80), host: url.hostname });
      this.sock = sock;
      sock.setNoDelay(true);
      let buf = Buffer.from("");
      let handshakeDone = false;
      sock.on("data", (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        if (!handshakeDone) {
          const i = buf.indexOf("\r\n\r\n");
          if (i === -1) return;
          const head = buf.slice(0, i).toString();
          buf = buf.slice(i + 4);
          const accept = crypto
            .createHash("sha1")
            .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
            .digest("base64");
          if (!head.includes(accept)) {
            reject(new Error("bad handshake: " + head));
            return;
          }
          handshakeDone = true;
          resolve();
        }
        // frames
        while (buf.length >= 2) {
          const first = buf[0];
          const payloadLen7 = buf[1] & 0x7f;
          let hdr = 2, len = payloadLen7;
          if (payloadLen7 === 126) {
            if (buf.length < 4) return;
            len = buf.readUInt16BE(2);
            hdr = 4;
          } else if (payloadLen7 === 127) {
            if (buf.length < 10) return;
            len = Number(buf.readBigUInt64BE(2));
            hdr = 10;
          }
          if (buf.length < hdr + len) return;
          const payload = buf.slice(hdr, hdr + len);
          buf = buf.slice(hdr + len);
          // server frames are not masked
          if ((first & 0x0f) === 1 || (first & 0x0f) === 2) {
            const msg = JSON.parse(payload.toString());
            const p = this.pending.get(msg.id);
            if (p) {
              this.pending.delete(msg.id);
              clearTimeout(p.timer);
              msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
            }
          }
        }
      });
      sock.on("error", reject);
      const req =
        "GET / HTTP/1.1\r\n" +
        "Host: localhost:" + url.port + "\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        "Sec-WebSocket-Key: " + key + "\r\n" +
        "Sec-WebSocket-Version: 13\r\n\r\n";
      sock.write(req);
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const myId = ++id;
      const msg = JSON.stringify({ id: myId, method, params });
      const payload = Buffer.from(msg);
      const len = payload.length;
      const mask = crypto.randomBytes(4);
      const frame = Buffer.alloc(len + (len < 126 ? 6 : len < 65536 ? 8 : 14));
      frame[0] = 0x81;
      if (len < 126) {
        frame[1] = 0x80 | len;
        frame.writeUInt16BE(2, 0); // placeholder overwrite below
        frame[1] = 0x80 | len;
        let off = 2;
        for (let i = 0; i < len; i++) frame[off + i] = payload[i] ^ mask[i % 4];
        mask.copy(frame, 2);
        frame.writeUInt16BE = undefined; // noop
        frame[2] = mask[0]; frame[3] = mask[1]; frame[4] = mask[2]; frame[5] = mask[3];
      } else if (len < 65536) {
        frame[1] = 0xfe;
        frame.writeUInt16BE(len, 2);
        frame[4] = mask[0]; frame[5] = mask[1]; frame[6] = mask[2]; frame[7] = mask[3];
        for (let i = 0; i < len; i++) frame[8 + i] = payload[i] ^ mask[i % 4];
      } else {
        frame[1] = 0xff;
        frame.writeBigUInt64BE(BigInt(len), 2);
        for (let i = 0; i < 8; i++) frame[10 + i] = mask[i];
        for (let i = 0; i < len; i++) frame[18 + i] = payload[i] ^ mask[i % 8];
      }
      this.sock.write(frame);
      const timer = setTimeout(() => {
        this.pending.delete(myId);
        reject(new Error("cdp timeout: " + method));
      }, 40000);
      this.pending.set(myId, { resolve, reject, timer });
    });
  }

  async evaluate(expr) {
    const r = await this.send("Runtime.evaluate", {
      expression: expr,
      returnByValue: false,
      awaitPromise: true,
    });
    if (r.exceptionDetails)
      throw new Error(
        (r.exceptionDetails.exception?.description || r.exceptionDetails.text || "").slice(0, 1200)
      );
    return r.result;
  }
}

const HERO_CARDS = [52, 30];
const VILLAIN_CARDS = [47, 13];
const BOARD = [13, 47, 46, 21, 10];
const ACTIONS = [
  { street: "preflop", player: "BTN (você)", action: "raise", amount: 240, chipsBefore: 1000, chipsAfter: 760 },
  { street: "preflop", player: "BB vilão", action: "call", amount: 200, chipsBefore: 1000, chipsAfter: 800 },
  { street: "flop", player: "BB vilão", action: "check", amount: 0, chipsBefore: 800, chipsAfter: 800 },
  { street: "flop", player: "BTN (você)", action: "bet", amount: 300, chipsBefore: 760, chipsAfter: 460 },
  { street: "flop", player: "BB vilão", action: "call", amount: 300, chipsBefore: 800, chipsAfter: 500 },
  { street: "turn", player: "BB vilão", action: "check", amount: 0, chipsBefore: 500, chipsAfter: 500 },
  { street: "turn", player: "BTN (você)", action: "bet", amount: 200, chipsBefore: 460, chipsAfter: 260 },
  { street: "turn", player: "BB vilão", action: "raise", amount: 400, chipsBefore: 500, chipsAfter: 100 },
  { street: "turn", player: "BTN (você)", action: "call", amount: 200, chipsBefore: 260, chipsAfter: 60 },
  { street: "river", player: "BB vilão", action: "check", amount: 0, chipsBefore: 100, chipsAfter: 100 },
  { street: "river", player: "BTN (você)", action: "bet", amount: 60, chipsBefore: 60, chipsAfter: 0 },
  { street: "river", player: "BB vilão", action: "call", amount: 60, chipsBefore: 100, chipsAfter: 40 },
];
const MOCK = {
  heroCards: HERO_CARDS,
  villainCards: VILLAIN_CARDS,
  board: BOARD,
  decision: { street: "turn", recommendation: "call", confidence: 68, options: ["fold", "call", "raise"] },
  pot: 1240,
  heroStack: 1000,
  villainStack: 1000,
  bigBlind: 40,
  heroPosition: "BTN",
  villainPosition: "BB",
  tournament: { name: "Circuito · Etapa 4", buyIn: 1000 },
  result: { heroChips: 0, villainChips: 1100, pot: 1240 },
  actions: ACTIONS,
  showdown: true,
  heroFinalHand: "Um par de ases",
  villainFinalHand: "Dois pares: reis e damas",
  timestamp: "2026-08-18T00:30:00",
  equity: { hero: 52, villain: 48 },
  street: "turn",
  recommendation: "call",
};

async function main() {
  const c = await cdpConnect();
  await c.open();
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await c.send("Page.navigate", { url: DEV_URL });
  await c.evaluate(
    "await new Promise((ok)=>{ if(document.readyState==='complete') ok(); else window.addEventListener('load', ok); }); document.documentElement.innerHTML=''; document.body.style.margin='0';"
  ).catch((e) => console.warn("cleanup note:", e.message.slice(0, 300)));

  const expr =
    "const mod = await import('" +
    DEV_URL +
    "/src/app/handShareCard.ts');" +
    "const fn = mod.drawHandShareCard;" +
    "const out = {};" +
    "for (const t of ['decisao','historico']) {" +
    "  const blob = await fn(" +
    JSON.stringify(MOCK) +
    ", t, '1080x1080');" +
    "  out[t] = await new Promise(r=>{const x=new FileReader();x.onloadend=()=>r(x.result);x.readAsDataURL(blob);});" +
    "}" +
    "return out;";
  const res = await c.evaluate(expr);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [type, dataUrl] of Object.entries(res.value || {})) {
    const buf = Buffer.from(String(dataUrl).split(",")[1], "base64");
    const file = `${OUT_DIR}/card_${type}.png`;
    fs.writeFileSync(file, buf);
    console.log("saved", file, buf.length);
  }
  c.sock.destroy();
}

main().catch((e) => {
  console.error("FATAL:", e?.message || e);
  process.exit(1);
});
