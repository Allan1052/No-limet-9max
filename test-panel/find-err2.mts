import * as fs from "node:fs";

const stubs = fs.readFileSync("/tmp/stubs.js", "utf8");
const lines = stubs.split("\n");
console.log("line 15:", JSON.stringify(lines[14]));
console.log("col 71-78:", JSON.stringify(lines[14]?.slice(70, 78)));
