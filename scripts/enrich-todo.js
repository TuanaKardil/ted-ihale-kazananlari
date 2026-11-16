// Türkçe açıklaması ya da web sitesi eksik kayıtları listeler (Claude'un haftalık görevi kullanır).
// Kullanım: node scripts/enrich-todo.js [notices|sites] [A|B|all] [limit]
const fs = require("fs");
const path = require("path");
const D = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "data.json"), "utf8"));
const E = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "enrich.json"), "utf8"));
const [mode = "notices", grade = "all", limit = "40"] = process.argv.slice(2);
const keyOf = (w) => (w.name || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim() + "|" + (w.country || "");
const clip = (t, n) => String(t || "").slice(0, n);
const rows = D.rows.filter((r) => grade === "all" || r.grade === grade);
let out = [];
if (mode === "notices") {
  out = rows.filter((r) => !E.notices[r.pub]).map((r) =>
    `#${r.pub} [${r.grade}] ${r.lang} ${r.country} ${r.place || r.city} | ${r.value || ""} ${r.cur} | alıcı: ${clip(r.buyer, 60)}\nT: ${clip(r.title, 220)}\nD: ${clip(r.desc, 380)}${r.lotDesc && r.lotDesc !== r.desc ? "\nL: " + clip(r.lotDesc, 260) : ""}\nW: ${r.winners.slice(0, 6).map((w) => `${w.name} (${w.city}, ${w.size || "?"})`).join("; ")}${r.winners.length > 6 ? ` +${r.winners.length - 6}` : ""}\n`);
} else {
  const seen = new Set();
  for (const r of rows) {
    if (r.winners.length > 6) continue; // büyük çerçeve anlaşmalar atlanır
    for (const w of r.winners) {
      const k = keyOf(w);
      if (w.website || seen.has(k) || (E.companies[k] && "website" in E.companies[k])) continue;
      seen.add(k);
      out.push(`${k}\t${w.name} | ${w.city} ${w.post} | ${w.country}${w.email ? " | " + w.email : ""} | [${r.grade}]`);
    }
  }
}
console.log(`${out.length} kayıt eksik (gösterilen: ${Math.min(out.length, +limit)})\n`);
console.log(out.slice(0, +limit).join("\n"));
