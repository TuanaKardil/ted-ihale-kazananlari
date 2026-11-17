// İlgili kişi verisini ŞİFRELİ saklar (kişi isimleri herkese açık sitede düz metin olarak durmaz).
// Şifre PEOPLE_PASS ortam değişkeninden okunur. Panel aynı şifreyle tarayıcıda çözer.
//
// Kullanım:
//   PEOPLE_PASS=... node scripts/people.js add yama.json      -> kişileri ekler, durumu "done" yapar
//   node scripts/people.js status "<firma anahtarı>" working ["not"]   -> durum: queued | working | error
//   PEOPLE_PASS=... node scripts/people.js show                -> çözülmüş veriyi yazdırır
//
// yama.json biçimi:
// { "<firma anahtarı, ör. heizungsbau gerle gmbh|DEU>": {
//     "companyLinkedin": "https://www.linkedin.com/company/...",   (herkese açık alana da yazılır)
//     "people": [ { "name": "...", "title": "...", "linkedin": "https://www.linkedin.com/in/..." | null,
//                   "source": "LinkedIn" | "Firma sitesi (Impressum)" | ..., "note": "kısa not" } ],
//     "why": "Neden bu kişiler seçildi (Türkçe, 1-3 cümle)" } }
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ENC = path.join(__dirname, "..", "docs", "people.enc.json");
const STATUS = path.join(__dirname, "..", "docs", "people-status.json");
const ITER = 200000;

function decrypt(pass) {
  if (!fs.existsSync(ENC)) return {};
  const e = JSON.parse(fs.readFileSync(ENC, "utf8"));
  const key = crypto.pbkdf2Sync(pass, Buffer.from(e.salt, "base64"), e.iter, 32, "sha256");
  const buf = Buffer.from(e.data, "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(e.iv, "base64"));
  d.setAuthTag(buf.subarray(buf.length - 16));
  return JSON.parse(Buffer.concat([d.update(buf.subarray(0, buf.length - 16)), d.final()]).toString("utf8"));
}
function encrypt(pass, obj) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(pass, salt, ITER, 32, "sha256");
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final(), c.getAuthTag()]);
  fs.writeFileSync(ENC, JSON.stringify({ v: 1, iter: ITER, salt: salt.toString("base64"), iv: iv.toString("base64"), data: ct.toString("base64") }));
}
const readStatus = () => (fs.existsSync(STATUS) ? JSON.parse(fs.readFileSync(STATUS, "utf8")) : {});
const writeStatus = (s) => fs.writeFileSync(STATUS, JSON.stringify(s, null, 1));
const needPass = () => { const p = process.env.PEOPLE_PASS; if (!p) { console.error("PEOPLE_PASS gerekli"); process.exit(1); } return p; };

const [cmd, a, b, c] = process.argv.slice(2);
if (cmd === "add") {
  const pass = needPass();
  const all = decrypt(pass), st = readStatus(), patch = JSON.parse(fs.readFileSync(a, "utf8"));
  const now = new Date().toISOString();
  for (const [k, v] of Object.entries(patch)) {
    all[k] = { ...(all[k] || {}), ...v, at: now };
    st[k] = { status: "done", at: now, count: (v.people || []).length, companyLinkedin: v.companyLinkedin || (st[k] && st[k].companyLinkedin) || null };
  }
  encrypt(pass, all); writeStatus(st);
  console.log(`kaydedildi: ${Object.keys(patch).length} firma. Toplam: ${Object.keys(all).length}`);
} else if (cmd === "status") {
  const st = readStatus();
  st[a] = { ...(st[a] || {}), status: b, at: new Date().toISOString(), ...(c ? { note: c } : {}) };
  writeStatus(st); console.log(a, "->", b);
} else if (cmd === "show") {
  console.log(JSON.stringify(decrypt(needPass()), null, 1));
} else {
  console.log("komutlar: add <yama.json> | status <anahtar> <queued|working|error> [not] | show");
}
