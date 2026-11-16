// Her hafta GitHub Actions tarafından çalıştırılır: TED'den yeni sonuç ilanlarını çeker,
// docs/data.json dosyasına ekler (son 365 gün saklanır).
const fs = require("fs");
const path = require("path");
const { fetchRows, ymd, PRIORITY_COUNTRIES } = require("../lib/ted");

const FILE = path.join(__dirname, "..", "docs", "data.json");
const KEEP_DAYS = 365;

(async () => {
  let old = { rows: [] };
  if (fs.existsSync(FILE)) old = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const days = Number(process.env.DAYS || (old.rows.length ? 21 : 14));
  const now = new Date();
  const fromD = new Date(now); fromD.setDate(fromD.getDate() - days);
  const from = ymd(fromD), to = ymd(now);

  const { rows, notices } = await fetchRows(from, to);
  const map = new Map(old.rows.map((r) => [r.id, r]));
  for (const r of rows) map.set(r.id, r);

  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
  const cut = cutoff.toISOString().slice(0, 10);
  const all = [...map.values()].filter((r) => r.date >= cut)
    .sort((a, b) => b.date.localeCompare(a.date) || b.score - a.score);

  fs.writeFileSync(FILE, JSON.stringify({
    updatedAt: now.toISOString(),
    lastRun: { from, to, notices, rows: rows.length },
    priorityCountries: Object.keys(PRIORITY_COUNTRIES),
    rows: all,
  }));
  console.log(`TED ${from}-${to}: ${notices} ilan, ${rows.length} satır. Toplam kayıt: ${all.length}`);
})().catch((e) => { console.error(e); process.exit(1); });
