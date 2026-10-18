// /api/asistente — chat del sitio: Google Gemini, con Claude Haiku de respaldo.
import { json, sameOrigin, clientIp, rateLimit, keys, fetchJson, geminiModels, genConfig, geminiText } from "../../server/util.js";
import KNOWLEDGE from "../../server/knowledge.js";

const reply = (text) => json({ reply: text });
const FALLBACK = "Ahora mismo no puedo responder. Usa «Diseña tu evento» en la web o escribe a Eleazar por WhatsApp al 33 5122 1400.";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "origin" }, 403);

  let input = {};
  try { input = await request.json(); } catch { /* cuerpo inválido */ }
  const message = String(input.message || "").trim();
  const history = Array.isArray(input.history) ? input.history.slice(-8) : [];
  if (!message || message.length > 500) return json({ error: "input" }, 400);

  const rl = rateLimit("chat:" + clientIp(request), 8, 100);
  if (rl === "min") return reply("Vas muy rápido 🙂 Espera unos segundos y vuelve a preguntarme.");
  if (rl === "day") return reply("Has hecho ya muchas consultas hoy. Para seguir, usa «Diseña tu evento» en la web o escribe a Eleazar por WhatsApp.");

  const k = keys(env);
  if (!k.gemini && !k.anthropic) return reply("El asistente todavía se está configurando. Vuelve a intentarlo en un ratito 🙂");

  const turns = history
    .map((h) => ({ role: h && h.role === "model" ? "model" : "user", text: String((h && h.text) || "").slice(0, 1000) }))
    .filter((h) => h.text);
  turns.push({ role: "user", text: message });

  let text = "";

  if (k.gemini) {
    for (const model of geminiModels(env)) {
      const r = await fetchJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(k.gemini)}`,
        {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: KNOWLEDGE }] },
            contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
            generationConfig: genConfig(model, { temperature: 0.4, topP: 0.9, maxOutputTokens: 700 }),
            safetySettings: ["HARASSMENT", "HATE_SPEECH", "SEXUALLY_EXPLICIT", "DANGEROUS_CONTENT"]
              .map((c) => ({ category: "HARM_CATEGORY_" + c, threshold: "BLOCK_ONLY_HIGH" }))
          })
        });
      text = r.ok ? geminiText(r.data) : "";
      if (text) break;
      console.warn("[asistente] gemini", model, r.status, r.text.slice(0, 300));
    }
  }

  if (!text && k.anthropic) {
    const r = await fetchJson("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": k.anthropic, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5", max_tokens: 700, system: KNOWLEDGE,
        messages: turns.map((t) => ({ role: t.role === "model" ? "assistant" : "user", content: t.text }))
      })
    });
    text = r.ok ? (r.data?.content?.[0]?.text || "") : "";
    if (!text) console.warn("[asistente] anthropic", r.status, r.text.slice(0, 300));
  }

  return reply(text || FALLBACK);
}

