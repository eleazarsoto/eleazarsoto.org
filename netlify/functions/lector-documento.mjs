// Lee con IA la invitación, flyer, brief o contrato de un evento (foto o PDF)
// y devuelve los datos en JSON. El documento no se guarda: se lee y se descarta.
//   Motor principal: Google Gemini · Respaldo: Claude Haiku
//   Si no hay clave o ambos fallan -> {ok:false}: el frontend pide los datos a mano.
import { json, sameOrigin, clientIp, rateLimit, keys, fetchJson, geminiModels, GEMINI_DEFAULTS, genConfig } from "../lib/util.mjs";

export const config = { path: "/lector-documento.php" };

const MAX_BYTES = 4.5 * 1024 * 1024; // las funciones de Netlify aceptan hasta ~6 MB por petición
const fail = (reason) => json({ ok: false, reason });

const INSTR = `Eres un extractor de datos de documentos de eventos (invitaciones, flyers, correos impresos, briefs o contratos de un lugar) en español o inglés, en México. Devuelve EXCLUSIVAMENTE un objeto JSON válido (sin texto adicional, sin \`\`\`), con EXACTAMENTE estas claves:
{
  "es_documento_evento": true/false,
  "tipo_evento": "privado" | "boda" | "concierto" | "corporativo" | "festival" | "clinica" | null,
  "fecha": "AAAA-MM-DD" o null,
  "hora_inicio": "HH:MM" o null,
  "duracion_horas": number o null,
  "invitados": number o null,
  "espacio": "interior" | "exterior" | null,
  "lugar": string o null,
  "direccion": string o null
}
Reglas:
- "es_documento_evento" es true solo si el documento describe un evento (fiesta, boda, cena, concierto, reunión, taller...).
- "tipo_evento": cumpleaños, aniversario, cena o fiesta en casa = "privado"; taller o clase = "clinica"; evento de empresa = "corporativo".
- "duracion_horas": solo si el documento da hora de inicio y fin, o una duración explícita.
- "invitados": número de personas si aparece (aforo, invitados, asistentes). No lo estimes.
- "espacio": "exterior" si menciona jardín, terraza, playa, al aire libre; "interior" si salón, auditorio, restaurante cerrado.
- "direccion": la dirección o el nombre del lugar con ciudad, tal como aparece.
- Si un dato no aparece o no lo puedes leer con seguridad, pon null. No inventes nada.`;

// Tipo real por los primeros bytes (no confiamos en lo que diga el navegador)
function sniff(b) {
  const hex = (i, n) => Buffer.from(b.subarray(i, i + n)).toString("hex");
  const ascii = (i, n) => Buffer.from(b.subarray(i, i + n)).toString("latin1");
  if (ascii(0, 4) === "%PDF") return "application/pdf";
  if (hex(0, 3) === "ffd8ff") return "image/jpeg";
  if (hex(0, 8) === "89504e470d0a1a0a") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (ascii(4, 4) === "ftyp" && /hei|mif|msf/.test(ascii(8, 4))) return "image/heic";
  return "";
}

function extractJson(s) {
  s = String(s || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{"), z = s.lastIndexOf("}");
  if (a < 0 || z < a) return null;
  try { const d = JSON.parse(s.slice(a, z + 1)); return d && typeof d === "object" ? d : null; } catch { return null; }
}

export default async (req, context) => {
  if (req.method !== "POST") return json({ ok: false, reason: "method" }, 405);
  if (!sameOrigin(req)) return json({ ok: false, reason: "origin" }, 403);

  const rl = rateLimit("doc:" + clientIp(req, context), 6, 40);
  if (rl) return fail("rate_" + rl);

  const k = keys();
  if (!k.gemini && !k.anthropic) return fail("sin_clave");

  let file;
  try { file = (await req.formData()).get("documento"); } catch { return fail("subida"); }
  if (!file || typeof file.arrayBuffer !== "function") return fail("sin_archivo");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) return fail("tamano");
  const mime = sniff(bytes);
  if (!mime) return fail("tipo");
  const isPdf = mime === "application/pdf";
  const b64 = Buffer.from(bytes).toString("base64");

  let parsed = null;

  if (k.gemini) {
    const t0 = Date.now();
    for (const model of geminiModels(GEMINI_DEFAULTS)) {
      if (Date.now() - t0 > 7500) break;
      const r = await fetchJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(k.gemini)}`,
        {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data: b64 } }, { text: INSTR }] }],
            generationConfig: genConfig(model, { temperature: 0.1, maxOutputTokens: 900, responseMimeType: "application/json" })
          })
        }, 8000);
      const parts = r.ok ? (r.data?.candidates?.[0]?.content?.parts || []) : [];
      parsed = extractJson(parts.filter((p) => p.text && !p.thought).map((p) => p.text).join(""));
      if (parsed) break;
      console.warn("[documento] gemini", model, r.status, r.text.slice(0, 200));
    }
  }

  if (!parsed && k.anthropic && mime !== "image/heic") {
    const block = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
      : { type: "image", source: { type: "base64", media_type: mime, data: b64 } };
    const r = await fetchJson("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": k.anthropic, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 900, messages: [{ role: "user", content: [block, { type: "text", text: INSTR }] }] })
    }, 8500);
    parsed = r.ok ? extractJson(r.data?.content?.[0]?.text) : null;
    if (!parsed) console.warn("[documento] anthropic", r.status, r.text.slice(0, 200));
  }

  if (!parsed) return fail("ia");
  if (parsed.es_documento_evento === false) return fail("no_evento");

  const num = (v) => { if (v === null || v === undefined || v === "") return null; const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) ? n : null; };
  const str = (v, max = 160) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const tipos = ["privado", "boda", "concierto", "corporativo", "festival", "clinica"];
  const fecha = str(parsed.fecha, 10);
  const inv = num(parsed.invitados), hrs = num(parsed.duracion_horas);

  return json({
    ok: true,
    data: {
      tipo_evento: tipos.includes(parsed.tipo_evento) ? parsed.tipo_evento : null,
      fecha: fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null,
      hora_inicio: str(parsed.hora_inicio, 5),
      duracion_horas: hrs && hrs > 0 && hrs <= 12 ? Math.round(hrs * 2) / 2 : null,
      invitados: inv && inv > 0 && inv < 100000 ? Math.round(inv) : null,
      espacio: ["interior", "exterior"].includes(parsed.espacio) ? parsed.espacio : null,
      lugar: str(parsed.lugar),
      direccion: str(parsed.direccion) || str(parsed.lugar)
    }
  });
};
