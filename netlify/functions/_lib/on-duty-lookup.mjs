import https from "https";

const USER_AGENT = "CLQ-App-Factory/1.0 (+https://cityloopquest.com)";

function httpsRequest(url, { method = "GET", headers = {}, timeoutMs = 12000 } = {}) {
  return new Promise((resolve) => {
    const req = https.request(
      url,
      { method, headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...headers }, timeout: timeoutMs },
      (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            body,
            contentType: String(res.headers["content-type"] || ""),
          });
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (err) => resolve({ ok: false, status: 0, body: String(err), contentType: "" }));
    req.end();
  });
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeSlug(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("32") && digits.length >= 10) return `+${digits}`;
  if (digits.startsWith("33") && digits.length >= 11) return `+${digits}`;
  if (digits.length === 9) return `0${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return digits;
  return String(raw || "").trim();
}

function formatFrenchPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }
  return normalizePhone(raw);
}

function distanceKm(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng) || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) {
    return Number.POSITIVE_INFINITY;
  }
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sa = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * (2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa)));
}

function facilityFromNormalized(partial) {
  return {
    category: partial.category,
    name: partial.name || "",
    address: partial.address || "",
    phone: partial.phone || "",
    lat: Number.isFinite(Number(partial.lat)) ? Number(partial.lat) : null,
    lng: Number.isFinite(Number(partial.lng)) ? Number(partial.lng) : null,
    onDutyFrom: partial.onDutyFrom || "",
    onDutyUntil: partial.onDutyUntil || "",
    sourceUrl: partial.sourceUrl || "",
    provider: partial.provider || "",
    externalId: partial.externalId || "",
    live: true,
  };
}

function departmentFromPostalCode(postalCode) {
  const zip = String(postalCode || "").trim();
  if (!/^\d{5}$/.test(zip)) return "";
  if (zip.startsWith("97") || zip.startsWith("98")) return zip.slice(0, 3);
  return zip.slice(0, 2);
}

function isBelgiumCountry(country) {
  const slug = normalizeSlug(country);
  return slug === "be" || slug === "belgique" || slug === "belgium" || slug === "belgie";
}

function isFranceCountry(country) {
  const slug = normalizeSlug(country);
  return slug === "fr" || slug === "france";
}

function isGermanyCountry(country) {
  const slug = normalizeSlug(country);
  return slug === "de"
    || slug === "allemagne"
    || slug === "germany"
    || slug === "deutschland"
    || slug.includes("allemagne")
    || slug.includes("germany");
}

function isAustriaCountry(country) {
  const slug = normalizeSlug(country);
  return slug === "at"
    || slug === "autriche"
    || slug === "austria"
    || slug === "oesterreich"
    || slug === "osterreich"
    || slug.includes("autriche")
    || slug.includes("austria")
    || slug.includes("oesterreich")
    || slug.includes("osterreich");
}

const BERLIN_POSTAL_PREFIXES = new Set(["10", "11", "12", "13", "14"]);

function inferGermanyFromContext(ctx) {
  if (isGermanyCountry(ctx.country)) return true;
  const citySlug = normalizeSlug(ctx.city);
  if (citySlug.includes("berlin")) return true;
  const zip = String(ctx.postalCode || "").trim();
  if (/^\d{5}$/.test(zip) && BERLIN_POSTAL_PREFIXES.has(zip.slice(0, 2))) return true;
  const lat = Number(ctx.lat);
  const lng = Number(ctx.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    if (lat >= 52.3 && lat <= 52.7 && lng >= 13.0 && lng <= 13.8) return true;
  }
  return false;
}

function isInAustriaBBox(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= 46.3 && lat <= 49.05
    && lng >= 9.4 && lng <= 17.3;
}

function inferAustriaFromContext(ctx) {
  if (isAustriaCountry(ctx.country)) return true;
  const citySlug = normalizeSlug(ctx.city);
  if (citySlug === "vienna" || citySlug === "wien" || citySlug.includes("vienna") || citySlug.includes("wien")) {
    return true;
  }
  const lat = Number(ctx.lat);
  const lng = Number(ctx.lng);
  if ((citySlug === "vienne" || citySlug.includes("vienne")) && isInAustriaBBox(lat, lng)) return true;
  if (isInAustriaBBox(lat, lng) && lng >= 13.5) return true;
  return false;
}

const VALENCIA_POSTAL_PREFIXES = new Set(["03", "12", "46"]);
const MURCIA_POSTAL_PREFIXES = new Set(["30"]);
const ARAGON_POSTAL_PREFIXES = new Set(["22", "44", "50"]); // Huesca, Teruel, Zaragoza

function isSpainCountry(country) {
  const slug = normalizeSlug(country);
  return slug === "es"
    || slug === "espagne"
    || slug === "spain"
    || slug === "espana"
    || slug.includes("espagne")
    || slug.includes("spain")
    || slug.includes("espana")
    || slug.includes("murcia")
    || slug.includes("valencia")
    || slug.includes("aragon")
    || slug.includes("zaragoza")
    || slug.includes("saragosse");
}

function isInSpainBBox(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= 35.2 && lat <= 43.9
    && lng >= -9.6 && lng <= 4.6;
}

function resolveSpainGuardRegion(ctx) {
  const zip = String(ctx.postalCode || "").trim();
  if (/^\d{5}$/.test(zip)) {
    const prefix = zip.slice(0, 2);
    if (VALENCIA_POSTAL_PREFIXES.has(prefix)) return "valencia";
    if (MURCIA_POSTAL_PREFIXES.has(prefix)) return "murcia";
    if (ARAGON_POSTAL_PREFIXES.has(prefix)) return "aragon";
  }
  const citySlug = normalizeSlug(ctx.city);
  if (citySlug.includes("alicante") || citySlug.includes("valencia") || citySlug.includes("castellon")) {
    return "valencia";
  }
  if (
    citySlug.includes("murcia")
    || citySlug.includes("cartagena")
    || citySlug.includes("carthagene")
    || citySlug.includes("lorca")
    || citySlug.includes("aguilas")
    || citySlug.includes("caravaca")
    || citySlug.includes("cehegin")
    || citySlug.includes("cieza")
    || citySlug.includes("mazarron")
  ) {
    return "murcia";
  }
  if (
    citySlug.includes("saragosse")
    || citySlug.includes("zaragoza")
    || citySlug.includes("aragon")
    || citySlug.includes("huesca")
    || citySlug.includes("teruel")
  ) {
    return "aragon";
  }
  const lat = Number(ctx.lat);
  const lng = Number(ctx.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    if (lat >= 40.5 && lat <= 42.9 && lng >= -1.9 && lng <= 0.8) return "aragon";
    if (lat >= 38.2 && lat <= 40.8 && lng >= -1.0 && lng <= 0.6) return "valencia";
    if (lat >= 37.4 && lat <= 38.8 && lng >= -2.2 && lng <= -0.6) return "murcia";
  }
  return "murcia";
}

function inferSpainFromContext(ctx) {
  if (isSpainCountry(ctx.country)) return true;
  const citySlug = normalizeSlug(ctx.city);
  if (
    citySlug.includes("alicante") || citySlug.includes("valencia") || citySlug.includes("castellon")
    || citySlug.includes("murcia") || citySlug.includes("cartagena") || citySlug.includes("carthagene")
    || citySlug.includes("lorca") || citySlug.includes("aguilas") || citySlug.includes("caravaca")
    || citySlug.includes("saragosse") || citySlug.includes("zaragoza") || citySlug.includes("aragon")
  ) return true;
  const lat = Number(ctx.lat);
  const lng = Number(ctx.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && isInSpainBBox(lat, lng)) return true;
  const zip = String(ctx.postalCode || "").trim();
  if (/^\d{5}$/.test(zip)) {
    const prefix = zip.slice(0, 2);
    if (
      VALENCIA_POSTAL_PREFIXES.has(prefix)
      || MURCIA_POSTAL_PREFIXES.has(prefix)
      || ARAGON_POSTAL_PREFIXES.has(prefix)
    ) return true;
  }
  return false;
}

async function reverseGeocodeFrance(lat, lng) {
  const url = `https://api-adresse.data.gouv.fr/reverse/?lon=${encodeURIComponent(lng)}&lat=${encodeURIComponent(lat)}`;
  const res = await httpsRequest(url);
  if (!res.ok) return null;
  try {
    const data = JSON.parse(res.body);
    const props = data?.features?.[0]?.properties || {};
    return {
      postalCode: String(props.postcode || "").trim(),
      city: String(props.city || props.name || "").trim(),
      department: departmentFromPostalCode(props.postcode),
      country: "France",
    };
  } catch {
    return null;
  }
}

async function reverseGeocodeNominatim(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=fr`;
  const res = await httpsRequest(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  try {
    const data = JSON.parse(res.body);
    const addr = data?.address || {};
    const postalCode = String(addr.postcode || "").trim();
    const country = String(addr.country || "").trim();
    return {
      postalCode,
      city: String(addr.city || addr.town || addr.village || addr.municipality || "").trim(),
      department: departmentFromPostalCode(postalCode),
      country,
    };
  } catch {
    return null;
  }
}

async function resolveLocationContext({ lat, lng, country, postalCode, city }) {
  const out = {
    lat: Number.isFinite(Number(lat)) ? Number(lat) : null,
    lng: Number.isFinite(Number(lng)) ? Number(lng) : null,
    country: String(country || "").trim(),
    postalCode: String(postalCode || "").trim(),
    city: String(city || "").trim(),
    department: departmentFromPostalCode(postalCode),
  };

  if (out.postalCode) out.department = departmentFromPostalCode(out.postalCode);

  if ((!out.postalCode || !out.city) && out.lat != null && out.lng != null) {
    const likelySpain = isInSpainBBox(out.lat, out.lng) || isSpainCountry(out.country);
    if (!likelySpain) {
      const fr = await reverseGeocodeFrance(out.lat, out.lng);
      if (fr?.postalCode && !isSpainCountry(out.country)) {
        out.postalCode ||= fr.postalCode;
        out.city ||= fr.city;
        out.department ||= fr.department;
        if (!out.country) out.country = fr.country;
      }
    }
    if (!out.postalCode || !out.city || likelySpain) {
      const nom = await reverseGeocodeNominatim(out.lat, out.lng);
      if (nom) {
        out.postalCode ||= nom.postalCode;
        out.city ||= nom.city;
        out.department ||= nom.department;
        out.country ||= nom.country;
      }
    }
  }

  if (!out.department && out.postalCode) out.department = departmentFromPostalCode(out.postalCode);
  return out;
}

async function fetchApotheekPharmacies(query, onDutyOnly = true) {
  const q = encodeURIComponent(String(query || "").trim());
  if (!q) return [];
  const url = `https://www.apotheek.be/PharmacySearch?Query=${q}${onDutyOnly ? "&OnDuty=true" : ""}`;
  const res = await httpsRequest(url, { headers: { Accept: "text/html" } });
  if (!res.ok) return [];
  const match = res.body.match(/id="myTomTomPlaces"[^>]*value="([^"]+)"/);
  if (!match) return [];
  try {
    const raw = decodeHtmlEntities(match[1]);
    const data = JSON.parse(raw);
    const items = Array.isArray(data?.PharmacySearchResults) ? data.PharmacySearchResults : [];
    return items.filter((item) => !onDutyOnly || item?.OnDuty);
  } catch {
    return [];
  }
}

function parseApotheekCoords(item) {
  if (Array.isArray(item?.Center) && item.Center.length >= 2) {
    const lng = Number(item.Center[0]);
    const lat = Number(item.Center[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const dest = String(item?.LatLongDest || "").trim();
  if (dest.includes(",")) {
    const [latRaw, lngRaw] = dest.split(",").map((part) => Number(String(part).trim()));
    if (Number.isFinite(latRaw) && Number.isFinite(lngRaw)) return { lat: latRaw, lng: lngRaw };
  }
  const lat = Number(item?.Latitude);
  const lng = Number(item?.Longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return { lat: null, lng: null };
}

function mapApotheekItem(item) {
  const address = String(item?.Address || "").trim()
    || [item?.Address, item?.ZipCode, item?.City].filter(Boolean).join(", ");
  const coords = parseApotheekCoords(item);
  return facilityFromNormalized({
    category: "pharmacy",
    name: item?.Name || "",
    address,
    phone: normalizePhone(item?.Phone),
    lat: coords.lat,
    lng: coords.lng,
    sourceUrl: item?.WebsiteUrl || item?.Url || "https://www.apotheek.be/",
    provider: "belgium-apotheek",
    externalId: String(item?.Identifier || "").trim(),
  });
}

const ON_DUTY_MAX_RADIUS_KM = 15;

function filterItemsNearUser(items, ctx) {
  if (!items.length) return items;
  const origin = ctx.lat != null && ctx.lng != null ? { lat: ctx.lat, lng: ctx.lng } : null;
  if (!origin) return items;
  const nearby = items.filter((item) => {
    if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return false;
    return distanceKm(origin, item) <= ON_DUTY_MAX_RADIUS_KM;
  });
  return nearby.length ? nearby : items.slice(0, 5);
}

async function lookupBelgiumPharmacies(ctx) {
  const query = ctx.postalCode || ctx.city;
  if (!query) {
    return {
      items: [],
      provider: "belgium-apotheek",
      status: "needs_location",
      message: "Code postal ou ville requis pour la pharmacie de garde en Belgique.",
      fallbackUrl: "https://www.apotheek.be/",
    };
  }
  let items = (await fetchApotheekPharmacies(query, true)).map(mapApotheekItem);
  const pos = ctx.lat != null && ctx.lng != null ? { lat: ctx.lat, lng: ctx.lng } : null;
  if (pos) items.sort((a, b) => distanceKm(pos, a) - distanceKm(pos, b));
  items = filterItemsNearUser(items, ctx);
  return {
    items,
    provider: "belgium-apotheek",
    status: items.length ? "ok" : "empty",
    fallbackUrl: `https://www.apotheek.be/PharmacySearch?Query=${encodeURIComponent(query)}&OnDuty=true`,
  };
}

async function servigardesGetJson(path) {
  const url = `https://api.servigardes.fr${path}`;
  const res = await httpsRequest(url);
  if (!res.ok) return null;
  try {
    return JSON.parse(res.body);
  } catch {
    return null;
  }
}

function mapServigardesPharmacy(entry) {
  const details = entry?.details || {};
  const schedule = entry?.schedule || {};
  const zip = String(details.zipcode || "").trim();
  const city = String(details.city || "").trim();
  const street = String(details.address || "").trim();
  const address = [street, zip, city].filter(Boolean).join(", ");
  return facilityFromNormalized({
    category: "pharmacy",
    name: details.name || "",
    address,
    phone: formatFrenchPhone(details.phone || ""),
    lat: details.latitude,
    lng: details.longitude,
    onDutyFrom: schedule.startDt || "",
    onDutyUntil: schedule.endDt || "",
    sourceUrl: "https://www.servigardes.fr/",
    provider: "france-servigardes",
  });
}

async function lookupServigardesPharmacies(ctx) {
  const zip = String(ctx.postalCode || "").trim();
  if (!/^\d{5}$/.test(zip)) {
    return {
      items: [],
      provider: "france-servigardes",
      status: "needs_location",
      message: "Code postal requis pour la pharmacie de garde (Nord / Pas-de-Calais).",
      fallbackUrl: "https://www.servigardes.fr/",
    };
  }

  const cities = await servigardesGetJson(`/api/cities?s=${encodeURIComponent(zip)}`);
  const cityList = Array.isArray(cities) ? cities.filter((c) => String(c.zipcode) === zip) : [];
  if (!cityList.length) {
    return {
      items: [],
      provider: "france-servigardes",
      status: "empty",
      fallbackUrl: "https://www.servigardes.fr/",
    };
  }

  const items = [];
  const seen = new Set();
  for (const city of cityList) {
    const payload = await servigardesGetJson(
      `/api/pharmacies/on-duty?CityId=${encodeURIComponent(city.id)}&NextPeriod=false&Zipcode=${encodeURIComponent(zip)}`
    );
    const interlocutors = Array.isArray(payload?.interlocutors) ? payload.interlocutors : [];
    for (const entry of interlocutors) {
      const mapped = mapServigardesPharmacy(entry);
      const key = `${mapped.name}|${mapped.address}`;
      if (!mapped.name || seen.has(key)) continue;
      seen.add(key);
      items.push(mapped);
    }
  }

  const pos = ctx.lat != null && ctx.lng != null ? { lat: ctx.lat, lng: ctx.lng } : null;
  if (pos) items.sort((a, b) => distanceKm(pos, a) - distanceKm(pos, b));

  return {
    items: pos ? items.slice(0, 3) : items.slice(0, 5),
    provider: "france-servigardes",
    status: items.length ? "ok" : "empty",
    fallbackUrl: "https://www.servigardes.fr/",
    hotline: "0825742030",
  };
}

function lookupFranceFallbackPharmacies(ctx) {
  const zip = String(ctx.postalCode || "").trim();
  const fallbackUrl = zip
    ? `https://www.3237.fr/#/result/list?location=${encodeURIComponent(zip)}&isOnDuty=true`
    : "https://www.3237.fr/";
  return {
    items: [],
    provider: "france-3237",
    status: "fallback",
    message: "Consultez le service officiel 3237 pour la pharmacie de garde la plus proche.",
    fallbackUrl,
    hotline: "3237",
  };
}

function lookupFranceVeterinaryFallback() {
  return {
    items: [],
    provider: "france-3115",
    status: "fallback",
    message: "Pas de source publique fiable pour le veterinaire de garde : appelez le 3115.",
    fallbackUrl: "https://www.veterinaire.fr/je-suis-proprietaire-d-animaux/urgences",
    hotline: "3115",
  };
}

function lookupBelgiumVeterinaryFallback() {
  return {
    items: [],
    provider: "belgium-vet-fallback",
    status: "fallback",
    message: "Service veterinaire de garde : contactez votre veterinaire habituel ou les urgences locales.",
    fallbackUrl: "https://www.veterinaire.be/",
  };
}

function lookupSpainPharmacyFallback(ctx) {
  const region = resolveSpainGuardRegion(ctx);
  if (region === "valencia") {
    return {
      items: [],
      provider: "spain-cofa-alicante",
      status: "fallback",
      message: "Consultez le service officiel des pharmacies de garde de la province d'Alicante (COFA).",
      fallbackUrl: "https://cofalicante.com/farmacias-de-guardia/",
      hotline: "965 123 123",
    };
  }
  if (region === "aragon") {
    return {
      items: [],
      provider: "spain-zaragoza-ayuntamiento",
      status: "fallback",
      message: "Consultez les pharmacies de garde de Zaragoza (Ayuntamiento / COFZ).",
      fallbackUrl: "https://www.zaragoza.es/sede/servicio/farmacia/",
      hotline: "976 48 14 14",
    };
  }
  return {
    items: [],
    provider: "spain-cofrm-murcia",
    status: "fallback",
    message: "Consultez le service officiel des pharmacies de garde de la Region de Murcia.",
    fallbackUrl: "https://guardias.cofrm.com/",
    hotline: "968 27 74 00",
  };
}

function lookupSpainVeterinaryFallback(ctx) {
  const region = resolveSpainGuardRegion(ctx);
  if (region === "valencia") {
    return {
      items: [],
      provider: "spain-colvet-valencia",
      status: "fallback",
      message: "Consultez le Colegio Oficial de Veterinarios de Alicante (ICOVAL) pour localiser une clinique.",
      fallbackUrl: "https://www.icoval.org/",
      hotline: "965 214 111",
    };
  }
  if (region === "aragon") {
    return {
      items: [],
      provider: "spain-hv-unizar",
      status: "fallback",
      message: "Urgences veterinaires 24h — Hospital Veterinario Universidad de Zaragoza.",
      fallbackUrl: "https://hospitalveterinario.unizar.es/",
      hotline: "659 930 301",
    };
  }
  return {
    items: [],
    provider: "spain-colvet-murcia",
    status: "fallback",
    message: "Consultez le service officiel des veterinaires de garde de la Region de Murcia.",
    fallbackUrl: "https://veterinariosmurcia.es/",
    hotline: "968 89 92 80",
  };
}

const BERLIN_DE_PHARMACY_URL =
  "https://www.berlin.de/en/tourism/travel-information/1748526-2862820-emergency-services-pharmacies.en.html";

/** Pharmacies ouvertes quotidiennement (berlin.de) — coords Nominatim 2026-07-24. */
const BERLIN_DAILY_OPEN_PHARMACIES = [
  {
    category: "pharmacy",
    name: "Apotheke am Hauptbahnhof",
    address: "Europaplatz 1, 10557 Berlin",
    phone: "",
    lat: 52.524263,
    lng: 13.370523,
    sourceUrl: BERLIN_DE_PHARMACY_URL,
    provider: "germany-berlin-de",
    note: "Ouverte tous les jours 7h–21h",
  },
  {
    category: "pharmacy",
    name: "Medios Apotheke (Oranienburger Tor)",
    address: "Friedrichstraße 113a, 10117 Berlin",
    phone: "",
    lat: 52.526071,
    lng: 13.387512,
    sourceUrl: BERLIN_DE_PHARMACY_URL,
    provider: "germany-berlin-de",
    note: "Ouverte 365 jours / an 8h–minuit",
  },
  {
    category: "pharmacy",
    name: "Nordkreuz Apotheke (Gesundbrunnen)",
    address: "Hanne-Sobek-Platz, 13357 Berlin",
    phone: "",
    lat: 52.548437,
    lng: 13.388292,
    sourceUrl: BERLIN_DE_PHARMACY_URL,
    provider: "germany-berlin-de",
    note: "Horaires étendus y compris dimanche",
  },
  {
    category: "pharmacy",
    name: "Lichtenberg Apotheke",
    address: "Weitlingstraße 22, 10317 Berlin",
    phone: "",
    lat: 52.509459,
    lng: 13.497303,
    sourceUrl: BERLIN_DE_PHARMACY_URL,
    provider: "germany-berlin-de",
    note: "Ouverte aussi dimanches et jours fériés",
  },
];

function isBerlinContext(ctx) {
  const city = String(ctx?.city || "").toLowerCase();
  const zip = String(ctx?.postalCode || "").trim();
  if (city.includes("berlin")) return true;
  // Codes postaux Berlin : 10xxx–14xxx
  if (/^1[0-4]\d{3}$/.test(zip)) return true;
  return false;
}

function lookupGermanyPharmacyFallback(ctx) {
  const zip = String(ctx.postalCode || "").trim();
  const notdienstUrl = zip
    ? `https://www.aponet.de/service/notdienstapotheke-suche/${encodeURIComponent(zip)}`
    : "https://www.aponet.de/";
  const akBerlinUrl = "https://www.akberlin.de/notdienst/";

  if (isBerlinContext(ctx)) {
    const items = BERLIN_DAILY_OPEN_PHARMACIES.map((entry) => facilityFromNormalized({
      ...entry,
      onDuty: false,
    }));
    const pos = ctx.lat != null && ctx.lng != null ? { lat: ctx.lat, lng: ctx.lng } : null;
    if (pos) items.sort((a, b) => distanceKm(pos, a) - distanceKm(pos, b));
    return {
      items: filterItemsNearUser(items, ctx),
      provider: "germany-apotheken-notdienst",
      status: "ok",
      message:
        "Notdienstapotheke : 0800 00 22 833 (fixe gratuit) ou 22833 (mobile). "
        + "SMS code postal au 22833. Recherche : aponet.de / Notdienstfinder Apothekerkammer Berlin. "
        + "Liste complémentaire de pharmacies ouvertes quotidiennement (berlin.de).",
      fallbackUrl: notdienstUrl,
      hotline: "0800 00 22 833",
      secondaryUrl: akBerlinUrl,
    };
  }

  return {
    items: [],
    provider: "germany-apotheken-notdienst",
    status: "fallback",
    message:
      "Notdienstapotheke : 0800 00 22 833 (fixe) ou 22833 (mobile). "
      + "Consultez aponet.de pour l’officine de garde la plus proche.",
    fallbackUrl: notdienstUrl,
    hotline: "0800 00 22 833",
  };
}

const BERLIN_VETS_SOURCE_URL = "https://tieraerztekammer-berlin.de/notdienst/";

/** Cliniques / urgences véto Berlin (Tierärztekammer Berlin) — coords Nominatim 2026-07-24. */
const BERLIN_PRIORITY_VETS = [
  {
    category: "veterinary",
    name: "Tierärzte im Notdienst (mobile Berlin & Brandenburg)",
    address: "Berlin / Brandebourg — interventions à domicile",
    phone: "0157 859 49 631",
    lat: 52.52,
    lng: 13.405,
    sourceUrl: BERLIN_VETS_SOURCE_URL,
    provider: "germany-berlin-vets",
    onDuty: true,
    note: "Réseau d’urgence mobile 24h/24",
  },
  {
    category: "veterinary",
    name: "Klinik für Klein- und Heimtiere (Alt-Biesdorf)",
    address: "Alt-Biesdorf 22, 12683 Berlin",
    phone: "030 51 43 760",
    lat: 52.5087396,
    lng: 13.5557345,
    sourceUrl: BERLIN_VETS_SOURCE_URL,
    provider: "germany-berlin-vets",
    onDuty: true,
    note: "Clinique 24h/24 — Est de Berlin",
  },
  {
    category: "veterinary",
    name: "Valera – Medizinisches Kleintierzentrum",
    address: "Potsdamer Straße 23/24, 14163 Berlin",
    phone: "030 20 1805 750",
    lat: 52.433851,
    lng: 13.2466715,
    sourceUrl: BERLIN_VETS_SOURCE_URL,
    provider: "germany-berlin-vets",
    onDuty: true,
    note: "Centre médical 24h/24",
  },
  {
    category: "veterinary",
    name: "Tierarztpraxis Bärenwiese",
    address: "Uhlandstraße 151, 10719 Berlin",
    phone: "030 23 36 26 27",
    lat: 52.497396,
    lng: 13.3245464,
    sourceUrl: BERLIN_VETS_SOURCE_URL,
    provider: "germany-berlin-vets",
    onDuty: true,
    note: "Wilmersdorf — 24h/24 (aussi 0174 160 160 6)",
  },
];

function lookupGermanyVeterinaryFallback(ctx = {}) {
  if (isBerlinContext(ctx)) {
    const items = BERLIN_PRIORITY_VETS.map((entry) => facilityFromNormalized({
      ...entry,
    }));
    const pos = ctx.lat != null && ctx.lng != null ? { lat: ctx.lat, lng: ctx.lng } : null;
    if (pos) items.sort((a, b) => distanceKm(pos, a) - distanceKm(pos, b));
    return {
      items,
      provider: "germany-berlin-vets",
      status: "ok",
      message:
        "Urgence mobile : 0157 859 49 631 (Tierärzte im Notdienst). "
        + "Aussi Pfotendoctor 0800 7777 444 et Mobiler Tiernotdienst 030 437 466 334. "
        + "Cliniques 24h : Alt-Biesdorf, Valera, Bärenwiese. "
        + "Calendrier : Tierärztekammer Berlin. Notdienstgebühr 50 € hors horaires de jour.",
      fallbackUrl: BERLIN_VETS_SOURCE_URL,
      hotline: "0157 859 49 631",
    };
  }

  return {
    items: [],
    provider: "germany-tvbl-notdienst",
    status: "fallback",
    message: "Consultez le planning régional des vétérinaires de garde ou un réseau d’urgence local.",
    fallbackUrl: "https://www.tvbl.de/notdienst/",
    hotline: "0157 859 49 631",
  };
}

function lookupAustriaPharmacyFallback(ctx = {}) {
  const citySlug = normalizeSlug(ctx.city);
  const isVienna = citySlug.includes("wien")
    || citySlug.includes("vienna")
    || citySlug.includes("vienne")
    || (Number(ctx.lat) >= 48.1 && Number(ctx.lat) <= 48.35 && Number(ctx.lng) >= 16.1 && Number(ctx.lng) <= 16.6);
  return {
    items: [],
    provider: "austria-nachtapotheke",
    status: "fallback",
    message: isVienna
      ? "Appelez le 1455 (Apotheken-Ruf) ou consultez nachtapotheke.wien pour la pharmacie de garde à Wien."
      : "Appelez le 1455 (Apotheken-Ruf Autriche) ou consultez apothekerkammer.at / nachtapotheken.at.",
    fallbackUrl: isVienna ? "https://www.nachtapotheke.wien/" : "https://www.nachtapotheken.at/",
    hotline: "1455",
  };
}

function lookupAustriaVeterinaryFallback() {
  return {
    items: [facilityFromNormalized({
      category: "veterinary",
      name: "Vetmeduni Tierspital — Notfall Kleintiere",
      address: "Veterinärplatz 1, 1210 Wien",
      phone: "+43 1 25077 5555",
      lat: 48.2547,
      lng: 16.4325,
      sourceUrl: "https://www.vetmeduni.ac.at/tierspital/notfall",
      provider: "austria-vetmeduni",
      onDuty: true,
      note: "Urgences 24h/24 — petits animaux",
    })],
    provider: "austria-vetmeduni",
    status: "ok",
    message:
      "Urgences vétérinaires 24h : Vetmeduni +43 1 25077 5555 (petits animaux). "
      + "Chevaux +43 1 25077 5520.",
    fallbackUrl: "https://www.vetmeduni.ac.at/tierspital/notfall",
    hotline: "+43 1 25077 5555",
  };
}

function lookupUnsupportedOnDuty(category) {
  return {
    items: [],
    provider: "unknown",
    status: "unsupported",
    message: category === "pharmacy"
      ? "Recherche automatique de pharmacie de garde non disponible pour cette zone."
      : "Recherche automatique de veterinaire de garde non disponible pour cette zone.",
  };
}

/** Fallback garde catalogue (miroir Factory) pour pays sans scraper live. */
const CATALOG_GUARD_FALLBACKS = {
  italie: {
    pharmacy: { hotline: "-", fallbackUrl: "https://www.farmaciaditurno.org/", note: "Farmacia di turno" },
    veterinary: { hotline: "-", fallbackUrl: "https://www.fnovi.it/", note: "FNOVI" },
  },
  portugal: {
    pharmacy: { hotline: "808 24 24 24", fallbackUrl: "https://www.farmaciasdeservico.net/", note: "SNS 24 / farmacias de serviço" },
    veterinary: { hotline: "-", fallbackUrl: "https://www.omv.pt/", note: "OMV" },
  },
  pologne: {
    pharmacy: { hotline: "-", fallbackUrl: "https://www.doz.pl/apteka", note: "Apteki dyżurne" },
    veterinary: { hotline: "-", fallbackUrl: "https://www.vetpol.org.pl/", note: "Vetpol" },
  },
  "republique-tcheque": {
    pharmacy: { hotline: "-", fallbackUrl: "https://www.lekarnicky.cz/", note: "Lékárenská pohotovost" },
    veterinary: { hotline: "-", fallbackUrl: "https://www.vetkom.cz/", note: "Vetkom" },
  },
  "royaume-uni": {
    pharmacy: { hotline: "111", fallbackUrl: "https://www.nhs.uk/service-search/find-a-pharmacy/", note: "NHS 111" },
    veterinary: { hotline: "-", fallbackUrl: "https://findavet.rcvs.org.uk/", note: "RCVS" },
  },
  suisse: {
    pharmacy: { hotline: "-", fallbackUrl: "https://www.apo24.ch/", note: "apo24" },
    veterinary: { hotline: "-", fallbackUrl: "https://www.gstsvs.ch/", note: "GST/SVS" },
  },
  suede: {
    pharmacy: { hotline: "1177", fallbackUrl: "https://www.1177.se/", note: "1177" },
    veterinary: { hotline: "-", fallbackUrl: "https://www.svf.se/", note: "SVF" },
  },
  norvege: {
    pharmacy: { hotline: "116 117", fallbackUrl: "https://www.apotek.no/", note: "Legevakt / apotek" },
    veterinary: { hotline: "-", fallbackUrl: "https://www.vetnett.no/", note: "Vetnett" },
  },
  danemark: {
    pharmacy: { hotline: "1813", fallbackUrl: "https://www.apoteket.dk/", note: "1813 / apoteket" },
    veterinary: { hotline: "-", fallbackUrl: "https://www.ddd.dk/", note: "DDD" },
  },
  grece: {
    pharmacy: { hotline: "-", fallbackUrl: "https://www.vrisko.gr/farmakeia-efimerias/", note: "Εφημερίες" },
    veterinary: { hotline: "-", fallbackUrl: "https://www.hva.gr/", note: "HVA" },
  },
  croatie: {
    pharmacy: { hotline: "-", fallbackUrl: "https://www.hljk.hr/", note: "HLJK" },
    veterinary: { hotline: "-", fallbackUrl: "https://www.hvk.hr/", note: "HVK" },
  },
  slovenie: {
    pharmacy: { hotline: "-", fallbackUrl: "https://www.lzs.si/", note: "LZS" },
    veterinary: { hotline: "-", fallbackUrl: "https://www.vzs.si/", note: "VZS" },
  },
  hongrie: {
    pharmacy: { hotline: "-", fallbackUrl: "https://www.patikanet.hu/", note: "Patikanet" },
    veterinary: { hotline: "-", fallbackUrl: "https://maok.hu/", note: "MÁOK" },
  },
  lithuanie: {
    pharmacy: { hotline: "-", fallbackUrl: "https://www.vaistines.lt/", note: "Vaistinės" },
    veterinary: { hotline: "-", fallbackUrl: "https://www.lvga.lt/", note: "LVGA" },
  },
};

const CATALOG_COUNTRY_ALIASES = {
  italy: "italie", italia: "italie", it: "italie",
  portugal: "portugal", pt: "portugal",
  poland: "pologne", polska: "pologne", pl: "pologne",
  czech: "republique-tcheque", czechia: "republique-tcheque", "czech-republic": "republique-tcheque",
  cesko: "republique-tcheque", tcheque: "republique-tcheque", cz: "republique-tcheque",
  "republique-tcheque": "republique-tcheque",
  uk: "royaume-uni", "united-kingdom": "royaume-uni", britain: "royaume-uni", england: "royaume-uni",
  "royaume-uni": "royaume-uni",
  switzerland: "suisse", schweiz: "suisse", ch: "suisse", suisse: "suisse",
  sweden: "suede", sverige: "suede", se: "suede", suede: "suede",
  norway: "norvege", norge: "norvege", no: "norvege", norvege: "norvege",
  denmark: "danemark", danmark: "danemark", dk: "danemark", danemark: "danemark",
  greece: "grece", ellada: "grece", gr: "grece", grece: "grece",
  croatia: "croatie", hrvatska: "croatie", hr: "croatie", croatie: "croatie",
  slovenia: "slovenie", slovenija: "slovenie", si: "slovenie", slovenie: "slovenie",
  hungary: "hongrie", magyarorszag: "hongrie", hu: "hongrie", hongrie: "hongrie",
  lithuania: "lithuanie", lietuva: "lithuanie", lt: "lithuanie", lithuanie: "lithuanie",
  pologne: "pologne", italie: "italie",
};

function resolveCatalogCountrySlug(country) {
  const slug = normalizeSlug(country);
  if (!slug) return "";
  if (CATALOG_GUARD_FALLBACKS[slug]) return slug;
  return CATALOG_COUNTRY_ALIASES[slug] || "";
}

function lookupCatalogGuardFallback(category, ctx) {
  const slug = resolveCatalogCountrySlug(ctx.country);
  const entry = slug ? CATALOG_GUARD_FALLBACKS[slug] : null;
  if (!entry) return lookupUnsupportedOnDuty(category);
  const block = category === "pharmacy" ? entry.pharmacy : entry.veterinary;
  return {
    items: [],
    provider: `catalog-${slug}-${category}`,
    status: "fallback",
    message: block.note || "",
    fallbackUrl: block.fallbackUrl || "",
    hotline: block.hotline || "-",
  };
}

/**
 * @param {{ lat?: number|string, lng?: number|string, country?: string, postalCode?: string, city?: string }} options
 */
export async function lookupOnDuty(options = {}) {
  const ctx = await resolveLocationContext(options);
  const belgium = isBelgiumCountry(ctx.country);
  const spain = inferSpainFromContext(ctx);
  const germany = inferGermanyFromContext(ctx);
  const austria = inferAustriaFromContext(ctx);
  const france = !belgium && !spain && !germany && !austria && (
    isFranceCountry(ctx.country) || ["59", "62"].includes(ctx.department)
  );
  const servigardesDept = !spain && !germany && !austria && ["59", "62"].includes(ctx.department);

  let pharmacy;
  if (belgium) {
    pharmacy = await lookupBelgiumPharmacies(ctx);
  } else if (spain) {
    pharmacy = lookupSpainPharmacyFallback(ctx);
  } else if (germany) {
    pharmacy = lookupGermanyPharmacyFallback(ctx);
  } else if (austria) {
    pharmacy = lookupAustriaPharmacyFallback(ctx);
  } else if (france && servigardesDept) {
    pharmacy = await lookupServigardesPharmacies(ctx);
    if (!pharmacy.items.length && pharmacy.status !== "needs_location") {
      pharmacy = lookupFranceFallbackPharmacies(ctx);
    }
  } else if (france) {
    pharmacy = lookupFranceFallbackPharmacies(ctx);
  } else if (ctx.department && servigardesDept) {
    pharmacy = await lookupServigardesPharmacies(ctx);
  } else if (resolveCatalogCountrySlug(ctx.country)) {
    pharmacy = lookupCatalogGuardFallback("pharmacy", ctx);
  } else {
    pharmacy = lookupUnsupportedOnDuty("pharmacy");
  }

  let veterinary;
  if (belgium) {
    veterinary = lookupBelgiumVeterinaryFallback();
  } else if (spain) {
    veterinary = lookupSpainVeterinaryFallback(ctx);
  } else if (germany) {
    veterinary = lookupGermanyVeterinaryFallback(ctx);
  } else if (austria) {
    veterinary = lookupAustriaVeterinaryFallback();
  } else if (france) {
    veterinary = lookupFranceVeterinaryFallback();
  } else if (resolveCatalogCountrySlug(ctx.country)) {
    veterinary = lookupCatalogGuardFallback("veterinary", ctx);
  } else {
    veterinary = lookupUnsupportedOnDuty("veterinary");
  }

  return {
    ok: true,
    resolvedAt: new Date().toISOString(),
    location: {
      lat: ctx.lat,
      lng: ctx.lng,
      country: ctx.country,
      postalCode: ctx.postalCode,
      city: ctx.city,
      department: ctx.department,
    },
    pharmacy,
    veterinary,
  };
}
