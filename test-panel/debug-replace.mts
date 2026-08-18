const t = "})}async function Zd(e){return 1}async function Id(e){return 2}";
const re = /(\}?)(async function (Ed|zd|Zt|Hd|Id|qo|Vs|kn)\(e\)\{)/g;
let m;
const re2 = new RegExp(re.source, re.flags);
while ((m = re2.exec(t)) !== null) {
  console.log("match at", m.index, JSON.stringify(m[0]), "prev:", JSON.stringify(m[1]));
}
let patched = t.replace(re, (m, prev, fn) => {
  if (prev === ";" || prev === "\n") return fn;
  return ";" + fn;
});
console.log("result:", JSON.stringify(patched));
