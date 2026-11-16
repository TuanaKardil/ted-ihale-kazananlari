// TED sözleşme sonuç ilanlarını çeker, havlupan/radyatör ilgisine göre puanlar.
const TED = "https://api.ted.europa.eu/v3/notices/search";

const CPV_QUERY = "44621000 39715000 45331000 45330000 44411000 45211000 45214000 45215000 45212000 45453000";

const FIELDS = [
  "publication-number", "notice-title", "buyer-name", "buyer-country", "buyer-city",
  "winner-name", "winner-country", "organisation-email-tenderer",
  "organisation-internet-address-tenderer", "total-value", "total-value-cur",
  "classification-cpv", "publication-date", "notice-type",
];

const PRIORITY_COUNTRIES = { ROU: 15 };

const CPV_RULES = [
  ["44621", 50, "Radyatör / kazan"],
  ["39715", 45, "Isıtma ekipmanı"],
  ["45331100", 45, "Merkezi ısıtma tesisatı"],
  ["45331200", 10, "Havalandırma"],
  ["45331210", 10, "Havalandırma"],
  ["45331220", 10, "Klima"],
  ["45331", 35, "Isıtma-iklimlendirme tesisatı"],
  ["44411", 35, "Banyo armatürleri"],
  ["45332", 30, "Sıhhi tesisat"],
  ["45330", 30, "Sıhhi tesisat"],
  ["45211", 15, "Konut inşaatı"],
  ["45214", 15, "Okul / eğitim binası"],
  ["45215", 15, "Sağlık / sosyal bina"],
  ["45212", 15, "Otel / sosyal tesis"],
  ["45453", 15, "Renovasyon"],
];

const KW = {
  towel: /(radiator|radiateur|heizk(ö|oe)rper|grzejnik|radi(á|a)tor|radiatori|radiadores|radiatorius|radijator|radiaator|calorifer|r(a|ă)diatoare|sèche[- ]serviettes|seche[- ]serviettes|handtuch|towel|drabinkow|port[- ]?prosop|sušák|susak|радиатор|καλοριφέρ)/i,
  heating: /(heating|heizung|chauffage|ogrzew|(î|i)nc(ă|a)lzir|central(ă|a) termic|topen(í|i)|vyt(á|a)p(ě|e)n|šildym|sildym|apkur|grijanj|grejanj|ogrevanj|calefacci|riscaldament|verwarming|uppv(ä|a)rmning|v(ä|a)rme|l(ä|a)mmity|f(ű|u)t(é|e)s|отоплени|θέρμανσ|k(ü|u)tte|\bHLS\b|\bHKLS\b|\bHLSE\b|\bc\.o\.|kotłown|kotelna|instalacj[ai] c\.?o|wärme|warmte|\bcvc\b|thermique)/i,
  sanitary: /(sanit(a|ä|ai)r|sanitarn|bathroom|salle[s]? de bain|łazien|lazien|\bbaie\b|koupeln|kúpeľ|kopaln|plumbing|plomberie|wod[- ]?kan|sanitaire|badezimmer|vannas|vonios|\bbad\b|bäder)/i,
  building: /(wohn|logement|mieszkal|locuin|bytov|apartment|residential|schul|école|ecole|szkoł|szkol|școal|scoal|škol|skol|hospital|krankenhaus|hôpital|hopital|szpital|spital|nemocnic|hotel|internat|c(ă|a)min|akademik|dormitor|pflegeheim|ehpad|dom pomocy|kindergarten|kita|crèche|przedszkol|gr(ă|a)dini)/i,
  negative: /(l(ü|ue)ftung|ventilat|wentylac|klimat|air[- ]condition|\bRLT\b|cooling|chłodz|k(ä|a)lte|aufzug|\blift\b|elevator|winda|sprinkler|brandschutz|elektro|electrical|elektryczn|photovolta|fotowolta)/i,
};
// Bu kelimeler geçiyorsa (havlupan geçmedikçe) iş bizimle ilgili değil: kanalizasyon, atık su,
// şantiye kış ısıtması, ısı geri kazanım, bölgesel ısıtma şebekesi.
const HARD_EXCLUDE = /(kanalizac|sewer|abwasser|wastewater|épuration|epuration|\bSTEP\b|winterbau|bauheizung|v(ä|a)rme(å|a)tervinning|heat recovery|fernw(ä|a)rme|fjernvarm|district heating|nahw(ä|a)rme|ciepłownic|cieplownic|kaukolämp|termoficare)/i;
// Bakım / işletme / çerçeve hizmet sözleşmeleri: firma ilgili olabilir ama yeni montaj değil, B'ye düşer.
const MAINTENANCE = /(wartung|maintenance|entretien|exploitation|konserwac|serwis|\bservices?\b|instandhaltung|(î|i)ntre(ț|t)inere|repara|naprawa|framework|rahmenvertrag|accord-cadru|acord-cadru|umowa ramowa)/i;
// Doğrudan ilgili CPV: radyatör, merkezi ısıtma montajı/ekipmanı, banyo armatürü montajı ve ürünleri.
const CPV_STRONG = /^(44621100|4462111|45331100|39715210|45332400|44411)/;
// Dolaylı ilgili CPV: genel ısıtma-iklimlendirme, kazan, ısıtma ekipmanı, sıhhi tesisat.
const CPV_MID = /^(45331000$|45331110|446212|39715200|45330000$|45332200|45332000$)/;

const GENERIC_MAIL = /(gmail|googlemail|yahoo|hotmail|outlook|wp\.pl|o2\.pl|interia|seznam|web\.de|gmx|t-online|orange\.fr|free\.fr|icloud|live\.|aol\.|yandex|mail\.ru|abv\.bg|onet|libero|wanadoo|sfr\.fr|laposte|centrum\.cz|email\.cz|tiscali|alice\.it|virgilio|freemail|inbox\.lv|zoho|proton)/i;
const PORTAL = /(e-licitatie|ted\.europa|evergabe|vergabe|marches-publics|achatpublic|platformazakupowa|ezamowienia|nen\.cz|tenders|e-avrop|hanki|eprocurement|cvp\.|subasta|contratacion)/i;

const first = (v) => (Array.isArray(v) ? v[0] : v);
const langVal = (obj) => {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (typeof obj === "string") return [obj];
  const pref = obj.eng || obj.mul || Object.values(obj)[0];
  return Array.isArray(pref) ? pref : [pref];
};

function originalTitle(n) {
  const t = (n["notice-title"] && (n["notice-title"].eng || Object.values(n["notice-title"])[0])) || "";
  const parts = t.split(" – ");
  return parts.length >= 3 ? parts.slice(2).join(" – ") : t;
}

function score(n) {
  const cpvs = n["classification-cpv"] || [];
  let cpvPts = 0, cpvLabel = "";
  for (const c of cpvs) {
    for (const [p, pts, label] of CPV_RULES) {
      if (c.startsWith(p)) { if (pts > cpvPts) { cpvPts = pts; cpvLabel = label; } break; }
    }
  }
  const title = originalTitle(n);
  const hit = Object.fromEntries(Object.entries(KW).map(([k, re]) => [k, re.test(title)]));
  const strong = cpvs.some((c) => CPV_STRONG.test(c));
  const mid = cpvs.some((c) => CPV_MID.test(c));
  const onlyOther = hit.negative && !hit.towel && !hit.heating && !hit.sanitary;
  const excluded = !hit.towel && HARD_EXCLUDE.test(title);
  const maint = !hit.towel && MAINTENANCE.test(title);

  // Sıralama için puan
  let kw = 0;
  if (hit.towel) kw += 30; else if (hit.heating) kw += 20;
  if (hit.sanitary) kw += 15;
  kw = Math.min(kw, 35);
  if (hit.building) kw += 10;
  if (onlyOther) kw -= 15;
  const country = first(n["buyer-country"]) || "";
  const cPts = PRIORITY_COUNTRIES[country] || 0;
  let s = Math.max(0, Math.min(100, cpvPts + kw + cPts));

  // Not: kurala dayalı
  // A = başlıkta radyatör/havlupan geçiyor, ya da başlıkta açıkça ısıtma/sıhhi tesisat geçiyor VE CPV kodu da ısıtma/tesisat.
  // B = CPV kodu ısıtma/tesisat içeriyor ama başlık genel (tam paket inşaat) ya da bakım/çerçeve sözleşme.
  let grade = "C";
  if (!excluded) {
    if (hit.towel || ((hit.heating || hit.sanitary) && (strong || mid) && !onlyOther)) grade = "A";
    else if ((strong || mid) && !onlyOther) grade = "B";
    if (grade === "A" && maint) grade = "B";
  }
  if (grade === "C") s = Math.min(s, 39);
  const reasons = [cpvLabel,
    hit.towel && "başlıkta radyatör/havlupan",
    !hit.towel && hit.heating && "başlıkta ısıtma",
    hit.sanitary && "başlıkta sıhhi tesisat/banyo",
    hit.building && "konut/okul/hastane/otel",
    grade === "B" && !maint && "tam paket inşaat, ısıtma kapsamda",
    maint && "bakım/çerçeve sözleşme",
    excluded && "kanalizasyon/şebeke/şantiye ısıtması: elendi",
    onlyOther && "sadece havalandırma/elektrik vb.",
    cPts && "öncelikli ülke"].filter(Boolean);
  return { score: s, grade, reasons, title };
}

function domainOf(urlOrMail) {
  const s = String(urlOrMail).toLowerCase().trim();
  const d = s.includes("@") ? s.split("@")[1] : s.replace(/^https?:\/\//, "").split(/[\/:?#]/)[0];
  return d.replace(/^www\./, "");
}
const tokens = (name) => name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !/^(gmbh|sarl|ltd|limited|spolka|sp|s\.a|srl|societe|company|group|holding|bauunternehmen|ooo|eood|sabiedriba|atbildibu|ierobezotu)$/.test(w));

function websitesFor(winners, n) {
  const cands = [];
  for (const u of n["organisation-internet-address-tenderer"] || []) {
    if (!PORTAL.test(u)) cands.push({ d: domainOf(u), src: "TED" });
  }
  for (const m of n["organisation-email-tenderer"] || []) {
    if (!GENERIC_MAIL.test(m)) cands.push({ d: domainOf(m), src: "e-posta" });
  }
  const uniq = [...new Map(cands.filter((c) => c.d && c.d.includes(".")).map((c) => [c.d, c])).values()];
  return winners.map((w) => {
    const tk = tokens(w);
    const match = uniq.find((c) => tk.some((t) => c.d.replace(/[^a-z0-9]/g, "").includes(t.slice(0, 6))));
    if (match) return { site: "https://" + match.d, src: match.src };
    if (winners.length === 1 && uniq.length === 1) return { site: "https://" + uniq[0].d, src: uniq[0].src };
    return { site: null, src: null };
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function tedPage(query, page) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(TED, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, fields: FIELDS, limit: 250, page }) });
    if (r.status === 429 || r.status >= 500) { await sleep(1500 * (i + 1)); continue; }
    if (!r.ok) throw new Error("TED " + r.status + " " + (await r.text()).slice(0, 200));
    return r.json();
  }
  throw new Error("TED yoğun, biraz sonra tekrar deneyin");
}

const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");


async function fetchRows(from, to) {
  const query = `form-type=result AND notice-type!=can-modif AND classification-cpv IN (${CPV_QUERY}) AND publication-date>=${from} AND publication-date<=${to}`;
  const notices = [];
  let page = 1, total = 0;
  while (page <= 20) {
    const j = await tedPage(query, page);
    total = j.totalNoticeCount || 0;
    notices.push(...(j.notices || []));
    if (notices.length >= total || !(j.notices || []).length) break;
    page++; await sleep(800);
  }
  const rows = [];
  for (const n of notices) {
    const winners = [...new Set(langVal(n["winner-name"]))].filter(Boolean);
    if (!winners.length) continue;
    const sc = score(n);
    const sites = websitesFor(winners, n);
    const pub = n["publication-number"];
    winners.forEach((w, i) => rows.push({
      id: pub + "#" + i, pub,
      date: String(first(n["publication-date"]) || "").slice(0, 10),
      country: first(n["buyer-country"]) || "",
      city: langVal(n["buyer-city"])[0] || "",
      buyer: langVal(n["buyer-name"])[0] || "",
      winner: w,
      winnerCountry: (n["winner-country"] || [])[i] || first(n["winner-country"]) || "",
      website: sites[i].site, websiteSrc: sites[i].src,
      title: sc.title,
      value: n["total-value"] || null,
      cur: first(n["total-value-cur"]) || "",
      score: sc.score, grade: sc.grade, reasons: sc.reasons,
      multi: winners.length > 1,
      url: `https://ted.europa.eu/en/notice/-/detail/${pub}`,
    }));
  }
  return { rows, notices: notices.length };
}

module.exports = { fetchRows, score, ymd, PRIORITY_COUNTRIES };
