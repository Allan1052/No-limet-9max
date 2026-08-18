import * as fs from "node:fs";
import { parse } from "meriyah";

const stubs = fs.readFileSync("/tmp/stubs.js", "utf8");
const code = fs.readFileSync("/tmp/live-share-mod.js", "utf8");
let patched = code.replace(/(\}?)(async function (Ed|zd|Id)\(e\)\{)/g, (m, prev, fn) => {
  if (prev === "}" || prev === ";" || prev === "\n") return fn;
  return ";" + fn;
});
const wrapped =
  stubs +
  "(function(){" +
  "var __out__={};" +
  patched.replace(/async function (Ed|zd|Id)\(e\)\{/g, "__out__.$1 = async function(e){") +
  ";return __out__;})()";

const lines = wrapped.split("\n");
console.log("line15:", JSON.stringify(lines[14]?.slice(0, 140)));
console.log("line15 col70:", JSON.stringify(lines[14]?.slice(60, 110)));
fs.writeFileSync("/tmp/wrapped2.js", wrapped);
