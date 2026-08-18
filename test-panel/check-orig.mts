import * as fs from "node:fs";

const s = fs.readFileSync("/tmp/live-share-mod.js", "utf8");
const i = s.indexOf("return zd(e)");
console.log("ctx:", JSON.stringify(s.slice(Math.max(0, i - 400), i + 200)));
