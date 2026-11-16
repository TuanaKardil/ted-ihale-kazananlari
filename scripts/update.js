// Her pazartesi GitHub Actions tarafından çalıştırılır.
// TED'den son 30 günün sonuç ilanlarını çeker, sadece A/B olanları tutar,
// işin yapıldığı yeri (posta kodu + şehir) haritada göstermek için koordinata çevirir.
const fs = require("fs");
const path = require("path");
const { fetchRows, ymd, PRIORITY_COUNTRIES } = require("../lib/ted");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "data.json");
const GEO = path.join(ROOT, "data", "geocache-v2.json");
const WINDOW_DAYS = 30; // asla bir aydan geriye gitme

const ISO2 = { AUT:"at",BEL:"be",BGR:"bg",HRV:"hr",CYP:"cy",CZE:"cz",DNK:"dk",EST:"ee",FIN:"fi",FRA:"fr",DEU:"de",GRC:"gr",HUN:"hu",IRL:"ie",ITA:"it",LVA:"lv",LTU:"lt",LUX:"lu",MLT:"mt",NLD:"nl",POL:"pl",PRT:"pt",ROU:"ro",SVK:"sk",SVN:"si",ESP:"es",SWE:"se",NOR:"no",CHE:"ch",ISL:"is",LIE:"li",MKD:"mk",SRB:"rs",MNE:"me",ALB:"al",MDA:"md",UKR:"ua",GEO:"ge",TUR:"tr",BIH:"ba",GBR:"gb" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = "ted-ihale-kazananlari/1.0 (+https://github.com/TuanaKardil/ted-ihale-kazananlari)";

async function nominatim(params) {
  const u = "https://nominatim.openstreetmap.org/search?" + new URLSearchParams({ format: "jsonv2", addressdetails: "1", limit: "1", ...params });
  for (let i = 0; i < 3; i++) {
    const r = await fetch(u, { headers: { "User-Agent": UA, "Accept-Language": "en" } });
    await sleep(1100); // Nominatim kuralı: saniyede en fazla 1 istek
    if (r.ok) { const j = await r.json(); return j[0] || null; }
    await sleep(3000);
  }
  return null;
}

function label(hit, fallbackCity) {
  const a = (hit && hit.address) || {};
  const town = a.town || a.city || a.village || a.municipality || fallbackCity || a.suburb || "";
  const region = a.county || a.state_district || a.state || "";
  return [town, region && region !== town ? region : ""].filter(Boolean).join(", ");
}

async function geocode(cache, country, post, city) {
  const key = [country, post, city].join("|");
  if (cache[key] !== undefined) return cache[key];
  const cc = ISO2[country];
  let hit = null;
  if (cc && post) hit = await nominatim({ postalcode: post, countrycodes: cc, ...(city ? { city } : {}) });
  if (!hit && cc && post) hit = await nominatim({ postalcode: post, countrycodes: cc });
  if (!hit && cc && city) hit = await nominatim({ city, countrycodes: cc });
  if (!hit && cc && city) hit = await nominatim({ q: city, countrycodes: cc });
  cache[key] = hit ? { lat: +(+hit.lat).toFixed(4), lon: +(+hit.lon).toFixed(4), place: label(hit, city) } : null;
  return cache[key];
}

(async () => {
  const now = new Date();
  const fromD = new Date(now); fromD.setDate(fromD.getDate() - WINDOW_DAYS);
  const from = ymd(fromD), to = ymd(now);

  const { rows, notices } = await fetchRows(from, to);

  const cache = fs.existsSync(GEO) ? JSON.parse(fs.readFileSync(GEO, "utf8")) : {};
  let geoMiss = 0;
  for (const r of rows) {
    const g = await geocode(cache, r.country, r.post, r.city);
    if (g) { r.lat = g.lat; r.lon = g.lon; r.place = g.place; } else geoMiss++;
  }
  fs.mkdirSync(path.dirname(GEO), { recursive: true });
  fs.writeFileSync(GEO, JSON.stringify(cache));

  rows.sort((a, b) => a.grade.localeCompare(b.grade) || b.score - a.score || b.date.localeCompare(a.date));
  fs.writeFileSync(OUT, JSON.stringify({
    updatedAt: now.toISOString(),
    window: { from, to },
    priorityCountries: Object.keys(PRIORITY_COUNTRIES),
    stats: { tedNotices: notices, kept: rows.length, geoMiss },
    rows,
  }));
  console.log(`TED ${from}-${to}: ${notices} ilan tarandı, ${rows.length} A/B ilan tutuldu, konumu bulunamayan: ${geoMiss}`);
})().catch((e) => { console.error(e); process.exit(1); });
