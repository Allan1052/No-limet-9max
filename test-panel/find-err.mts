import * as fs from "node:fs";
import * as acorn from "acorn";

const stubs = fs.readFileSync("/tmp/stubs.js", "utf8");
const code = fs.readFileSync("/tmp/live-share-mod.js", "utf8");

const names = [...code.matchAll(/(?:async )?function (\w+)\(/g)].map((m) => m[1]);
const paramMap: Record<string, string> = {};
for (const m of code.matchAll(/(?:async )?function (\w+)\(([^)]*)\)\{/g)) {
  paramMap[m[1]] = m[2] || "";
}

let patched = code
  .replace(/(?<=[^;\s\w])(?=(?:async )?function [\w$]+\()/g, ";")
  .replace(/(?<=[^;\s\w(])(?=const )/g, ";");
const wrapped =
  stubs +
  "(function(){" +
  "var __out__={};" +
  patched.replace(/async function ([\w$]+)\(([^)]*)\)\{/g, (mm, name, params) => `__out__.${name} = async function(${params}){`).replace(/function ([\w$]+)\(([^)]*)\)\{/g, (mm, name, params) => `__out__.${name} = function(${params}){`) +
  ";return __out__;})()";

try {
  acorn.parse(wrapped, { ecmaVersion: 2024 });
  console.log("acorn OK");
} catch (e: any) {
  const p = e.pos ?? 0;
  console.log("pos:", p, "msg:", e.message);
  console.log(JSON.stringify(wrapped.slice(Math.max(0, p - 200), p + 120)));
}
fs.writeFileSync("/tmp/wrapped2.js", wrapped);
