// Bir yama dosyasını docs/enrich.json'a ekler.
// Yama biçimi: { "notices": { "<pub>": { titleTr, short, detail } }, "companies": { "<ad|ULKE>": { website, about, note } } }
// Kullanım: node scripts/enrich-merge.js yama.json
const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "..", "docs", "enrich.json");
const E = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : { notices: {}, companies: {} };
let n = 0, c = 0;
for (const f of process.argv.slice(2)) {
  const p = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const [k, v] of Object.entries(p.notices || {})) { E.notices[k] = { ...(E.notices[k] || {}), ...v }; n++; }
  for (const [k, v] of Object.entries(p.companies || {})) { E.companies[k] = { ...(E.companies[k] || {}), ...v }; c++; }
}
E.updatedAt = new Date().toISOString();
fs.writeFileSync(FILE, JSON.stringify(E, null, 0));
console.log(`eklendi: ${n} ilan, ${c} firma. Toplam: ${Object.keys(E.notices).length} ilan, ${Object.keys(E.companies).length} firma`);
