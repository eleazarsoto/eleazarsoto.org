// Búsqueda de direcciones para el mapa. Respeta la política de uso de Nominatim
// (User-Agent identificable, pocas peticiones). Respaldo: Photon (Komoot).
import { json, sameOrigin, clientIp, rateLimit, fetchJson } from "../lib/util.mjs";

export const config = { path: "/geocode.php" };

const UA = "EleazarSotoWeb/1.0 (https://eleazarsoto.org; rezzonante@gmail.com)";
const pick = (o, ks) => { for (const k of ks) if (o && typeof o[k] === "string" && o[k].trim()) return o[k].trim(); return ""; };

export default async (req, context) => {
  if (!sameOrigin(req)) return json({ results: [] }, 403);
  let q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 3) return json({ results: [] });
  q = q.slice(0, 120);
  if (rateLimit("geo:" + clientIp(req, context), 40, 2000)) return json({ results: [] });

  const headers = { "user-agent": UA, accept: "application/json", "accept-language": "es" };
  let results = [];

  const n = await fetchJson("https://nominatim.openstreetmap.org/search?" + new URLSearchParams({
    q, format: "jsonv2", addressdetails: "1", limit: "6", countrycodes: "mx", "accept-language": "es"
  }), { headers }, 6000);
  if (n.ok && Array.isArray(n.data)) {
    results = n.data
      .filter((it) => it.lat && it.lon && it.display_name)
      .map((it) => ({ label: it.display_name, lat: +it.lat, lon: +it.lon, city: pick(it.address, ["city", "town", "village", "municipality", "county"]) }));
  }

  if (!results.length) {
    const p = await fetchJson("https://photon.komoot.io/api?" + new URLSearchParams({ q, lang: "es", limit: "6" }), { headers }, 6000);
    const feats = (p.ok && p.data && p.data.features) || [];
    results = feats.map((ft) => {
      const c = ft.geometry && ft.geometry.coordinates, pr = ft.properties || {};
      if (!c || c.length < 2) return null;
      const label = [...new Set([pr.name, pr.street, pr.housenumber, pr.postcode, pr.city || pr.county, pr.state].filter(Boolean))].join(", ");
      return label ? { label, lat: +c[1], lon: +c[0], city: pick(pr, ["city", "name", "county"]) } : null;
    }).filter(Boolean);
  }

  return json({ results: results.slice(0, 6) });
};
