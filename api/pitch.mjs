// ETHOS LATAM — Pitch Doctor (herramienta de miembros, IA con Gemini).
// El miembro pega su pitch y recibe feedback estructurado de nivel inversionista.
// Solo miembros aprobados; máximo 5 análisis al día por miembro (cuida la cuota
// de la API). Sin GEMINI_API_KEY responde con un mensaje claro, nunca rompe.
import { readDB, getSessionEmail, readJson, send, rateLimit, isOwner } from "../lib/server.mjs";

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

const PROMPT = (pitch, ctx) => `Eres un inversionista de venture capital en Latinoamérica con 15 años de experiencia evaluando startups (seed a Serie A). Un founder del club Ethos LATAM te pide feedback duro pero constructivo sobre su pitch.

${ctx ? "Contexto del founder: " + ctx + "\n" : ""}Su pitch:
"""
${pitch}
"""

Responde en español, en este formato EXACTO (usa estos títulos con emoji, sin markdown de encabezados):

⭐ VEREDICTO (1-10): [nota] — [una frase honesta]

💪 LO MÁS FUERTE
- [2 o 3 puntos concretos citando sus propias palabras]

🚨 LO QUE UN INVERSIONISTA ATACARÍA
- [3 o 4 debilidades reales: claridad, mercado, diferenciación, modelo, tracción — las que apliquen]

✍️ REESCRITURA SUGERIDA
[El mismo pitch reescrito en máximo 3 frases, más claro y con gancho]

🎯 SIGUIENTE PASO
[Una sola acción concreta para esta semana]

Sé específico con SU pitch (nada genérico). Si el texto no parece un pitch, dilo con humor y pide uno real.`;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
    const email = getSessionEmail(req);
    if (!email) return send(res, 401, { error: "No autenticado." });
    const db = await readDB();
    const me = db.users[email];
    if (!me || ((me.status || "approved") !== "approved" && !isOwner(email)))
      return send(res, 403, { error: "Solo para miembros del club." });
    if (!rateLimit("pitch:" + email, 5, 86400e3))
      return send(res, 429, { error: "Alcanzaste los 5 análisis de hoy. Vuelve mañana con el pitch mejorado 💪" });

    const body = await readJson(req);
    const pitch = String(body.pitch || "").trim().slice(0, 2500);
    const ctx = String(body.contexto || "").trim().slice(0, 300);
    if (pitch.length < 30) return send(res, 400, { error: "Pega un pitch de al menos un par de frases." });

    const key = process.env.GEMINI_API_KEY;
    if (!key) return send(res, 200, { feedback: "⚙️ El Pitch Doctor aún no está configurado (falta la clave de IA). Escríbenos a hola@ethoslatam.com." });

    let text = "";
    for (const model of MODELS) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: PROMPT(pitch, ctx) }] }],
            generationConfig: { temperature: 0.6, maxOutputTokens: 1200 }
          })
        }
      );
      const j = await r.json();
      text = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text).filter(Boolean).join("\n").trim();
      if (text) break;
    }
    if (!text) return send(res, 502, { error: "La IA no respondió. Intenta de nuevo en un minuto." });
    return send(res, 200, { feedback: text });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
