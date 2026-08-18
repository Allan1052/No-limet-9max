import * as fs from "node:fs";
import { parse } from "meriyah";

const l = fs.readFileSync("/tmp/line19.js", "utf8");
console.log("len", l.length);
try {
  parse(l, { module: false });
  console.log("line19 OK");
} catch (e: any) {
  console.log("pos:", e.index ?? 0, "msg:", e.message);
  const p = e.index ?? 0;
  console.log(JSON.stringify(l.slice(Math.max(0, p - 100), p + 60)));
}
