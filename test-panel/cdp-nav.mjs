const BASE = "http://localhost:9222";
const tabs = await fetch(`${BASE}/json`).then((r) => r.json());
const tab = tabs.find((t) => t.type === "page");
console.log("tab:", tab.id.slice(0, 8));

const ws = new (await import("ws")).WebSocket(tab.webSocketDebuggerUrl);
ws.binaryType = "arraybuffer";
await new Promise((r2) => (ws.onopen = r2));

let id = 1;
function send(method, params = {}) {
  return new Promise((res, rej) => {
    const i = id++;
    const h = (m) => {
      const raw =
        typeof m.data === "string"
          ? m.data
          : Buffer.from(new Uint8Array(m.data)).toString("utf-8");
      let d;
      try {
        d = JSON.parse(raw);
      } catch {
        return;
      }
      if (d.id === i) {
        ws.off("message", h);
        d.error ? rej(new Error(JSON.stringify(d.error))) : res(d);
      }
    };
    ws.on("message", h);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
}

await send("Page.enable");
await send("Page.navigate", { url: "http://localhost:5175/" });
await new Promise((r) => setTimeout(r, 7000));

await send("Runtime.evaluate", {
  expression:
    "window.dispatchEvent(new CustomEvent('nav-to', {detail: 'ranking'}));",
  awaitPromise: false,
});
await new Promise((r) => setTimeout(r, 4000));

const page = await send("Page.captureScreenshot", { format: "png" });
const fs = await import("fs");
fs.writeFileSync("/tmp/ranking-gto.png", Buffer.from(page.data, "base64"));
console.log("ok /tmp/ranking-gto.png");
ws.close();
process.exit(0);
