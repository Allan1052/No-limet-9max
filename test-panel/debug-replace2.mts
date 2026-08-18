const t = 'new Promise(u=>{t.toBlob(m=>u(m),"image/png")})}async function Zt(e,a="simples",t="decisao"){return t==="historico"?Id(e):t==="narrativa"?$d(e):Hd(e)}async function Id(e){return 1}';
const re = /(\}?)(async function (Ed|Zd|zd|Zt|Hd|Id|qo|Vs|kn)\(e\)\{)/g;
const re2 = new RegExp(re.source, re.flags);
let m;
while ((m = re2.exec(t)) !== null) {
  console.log("match at", m.index, JSON.stringify(m[0]), "prev:", JSON.stringify(m[1]));
}
let out = t.replace(re, (mm, prev, fn) => {
  if (prev === ";" || prev === "\n") return fn;
  return ";" + fn;
});
console.log("result:", JSON.stringify(out));
