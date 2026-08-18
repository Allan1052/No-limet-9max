const t = 'return localStorage.getItem("card_dev_unlock")==="true"};function Ds({data:e,label:a="📤 Compartilhar",className:t="btn"}){const o=1}';
const out = t.replace(/function ([\w$]+)\(([^)]*)\)\{/g, (mm, name, params) => `__out__.${name} = function(${params}){`);
console.log(JSON.stringify(out));
