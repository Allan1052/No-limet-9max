import { parse } from "meriyah";

const tests = [
  "(function(){return 1})()",
  "(function(){return 1})();",
  "(function(){var o={};return o})()",
];
for (const t of tests) {
  try {
    parse(t, { module: false });
    console.log("OK:", JSON.stringify(t));
  } catch (e: any) {
    console.log("FAIL:", JSON.stringify(t), "->", e.message);
  }
}
