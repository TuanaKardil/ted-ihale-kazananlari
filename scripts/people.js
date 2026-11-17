// İlgili kişi verisini docs/people.json dosyasında saklar ve panelde gösterir.
// Kullanım:
//   node scripts/people.js add yama.json                      -> kişileri ekler, durumu "done" yapar
//   node scripts/people.js status "<firma anahtarı>" working ["not"]   -> durum: queued | working | error
// yama.json biçimi:
// { "<firma anahtarı, ör. heizungsbau gerle gmbh|DEU>": {
//     "companyLinkedin": "https://www.linkedin.com/company/..." | null,
//     "phone": "+49 ...", "email": "info@...",
//     "people": [ { "name": "...", "title": "...", "linkedin": "https://www.linkedin.com/in/..." | null,
//                   "source": "LinkedIn" | "Firma sitesi (Impressum)", "note": "kısa not" } ],
//     "why": "Neden bu kişiler (Türkçe, 2-3 cümle)" } }
const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "..", "docs", "people.json");
const STATUS = path.join(__dirname, "..", "docs", "people-status.json");
const read = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {});
const write = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1));
const [cmd, a, b, c] = process.argv.slice(2);
if (cmd === "add") {
  const all = read(FILE), st = read(STATUS), patch = JSON.parse(fs.readFileSync(a, "utf8"));
  const now = new Date().toISOString();
  for (const [k, v] of Object.entries(patch)) {
    all[k] = { ...(all[k] || {}), ...v, at: now };
    st[k] = { status: "done", at: now, count: (all[k].people || []).length };
  }
  write(FILE, all); write(STATUS, st);
  console.log(`kaydedildi: ${Object.keys(patch).length} firma. Toplam: ${Object.keys(all).length}`);
} else if (cmd === "status") {
  const st = read(STATUS);
  st[a] = { ...(st[a] || {}), status: b, at: new Date().toISOString(), ...(c ? { note: c } : {}) };
  write(STATUS, st); console.log(a, "->", b);
} else {
  console.log("komutlar: add <yama.json> | status <anahtar> <queued|working|error> [not]");
}
