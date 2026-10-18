// Utilidades compartidas por las funciones de Cloudflare Pages.
// Las claves viven en Cloudflare (Settings → Variables and Secrets): GEMINI_API_KEY y,
// opcional, ANTHROPIC_API_KEY. Nunca llegan al navegador.

export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", "cache-control": "no-store" }
  });
}

// Mismo origen: si llega Origin/Referer, su host debe ser el del sitio.
export function sameOrigin(req) {
  const host = new URL(req.url).hostname.toLowerCase();
  const src = req.headers.get("origin") || req.headers.get("referer") || "";
  if (!src) return true;
  try { return new URL(src).hostname.toLowerCase() === host; } catch { return false; }
}

export function clientIp(req) {
  return req.headers.get("cf-connecting-ip") || "0.0.0.0";
}

// Límite de peticiones en memoria (por instancia): protección básica.
const buckets = new Map();
export function rateLimit(key, perMin, perDay) {
  const now = Date.now();
  const list = (buckets.get(key) || []).filter((t) => t > now - 86400000);
  if (list.filter((t) => t > now - 60000).length >= perMin) return "min";
  if (list.length >= perDay) return "day";
  list.push(now);
  buckets.set(key, list.slice(-300));
  if (buckets.size > 5000) buckets.clear();
  return "";
}

export function keys(env) {
  const clean = (v) => { v = String(v || "").trim(); return v && v !== "TU_CLAVE_AQUI" ? v : ""; };
  return { gemini: clean(env.GEMINI_API_KEY), anthropic: clean(env.ANTHROPIC_API_KEY) };
}

// Modelos de Gemini a probar, en orden. Google retira modelos con el tiempo:
// cámbialos sin tocar el código con la variable GEMINI_MODELS (separados por comas).
export const GEMINI_DEFAULTS = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-flash-latest"];
export function geminiModels(env) {
  const list = String(env.GEMINI_MODELS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.length ? list : GEMINI_DEFAULTS;
}
// Apagar el "razonamiento" con este formato solo aplica a la familia 2.5.
export function genConfig(model, base) {
  return /^gemini-2\.5/.test(model) ? { ...base, thinkingConfig: { thinkingBudget: 0 } } : base;
}
// Texto de la respuesta de Gemini (sin las partes de razonamiento)
export function geminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.filter((p) => p.text && !p.thought).map((p) => p.text).join("").trim();
}

export async function fetchJson(url, opts = {}, ms = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* no JSON */ }
    return { ok: r.ok, status: r.status, data, text };
  } catch (e) {
    return { ok: false, status: 0, data: null, text: String((e && e.message) || e) };
  } finally {
    clearTimeout(timer);
  }
}

export function toBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
