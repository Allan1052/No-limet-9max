const t = 'setTimeout(()=>URL.revokeObjectURL(t),4e3)}const Wd="#poker";__out__.Dd = function(e){return 1}';
const re = /(?<=[^;\s\w])(?=(?:(?:async )?function [\w$]+\()|(?:const |var |let )(?![^{]))/g;
console.log(JSON.stringify(t.replace(re, ";")));
// também testar apenas o const lookahead
console.log(JSON.stringify(t.replace(/(?<=[^;\s\w])(?=const )/g, ";")));
