// Utilidades compartidas por las funciones de Netlify.
// Las claves viven en variables de entorno de Netlify (GEMINI_API_KEY, ANTHROPIC_API_KEY)
// y nunca llegan al navegador.

export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", "cache-control": "no-store" }
  });
}

// Mismo origen: si llega Origin/Referer, su host debe ser el del sitio.
export function sameOrigin(req) {
  const host = (req.headers.get("host") || "").toLowerCase().replace(/:\d+$/, "");
  const src = req.headers.get("origin") || req.headers.get("referer") || "";
  if (!src) return true;
  try { return new URL(src).hostname.toLowerCase() === host; } catch { return false; }
}

export function clientIp(req, context) {
  return (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "0.0.0.0";
}

// Límite de peticiones en memoria (por instancia). Es una protección básica;
// las cuotas de Gemini/Anthropic son el tope real.
const buckets = new Map();
export function rateLimit(key, perMin, perDay) {
  const now = Date.now();
  const list = (buckets.get(key) || []).filter((t) => t > now - 86400000);
  const lastMin = list.filter((t) => t > now - 60000).length;
  if (lastMin >= perMin) return "min";
  if (list.length >= perDay) return "day";
  list.push(now);
  buckets.set(key, list.slice(-300));
  if (buckets.size > 5000) buckets.clear();
  return "";
}

export function keys() {
  const clean = (v) => { v = (v || "").trim(); return v && v !== "TU_CLAVE_AQUI" ? v : ""; };
  return { gemini: clean(process.env.GEMINI_API_KEY), anthropic: clean(process.env.ANTHROPIC_API_KEY) };
}

export async function fetchJson(url, opts = {}, ms = 9000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* respuesta no JSON */ }
    return { ok: r.ok, status: r.status, data, text };
  } catch (e) {
    return { ok: false, status: 0, data: null, text: String(e && e.message || e) };
  } finally {
    clearTimeout(timer);
  }
}
