// ETHOS LATAM — Investigación automática del aplicante (Gemini + Google Search).
// Se dispara (fire-and-forget) desde la web tras cada solicitud: investiga a la
// persona en internet, guarda el informe en el registro (visible en el panel)
// y se lo envía por email al owner con recomendación y preguntas de entrevista.
// Sin GEMINI_API_KEY definida en Vercel, es un no-op silencioso.
import { readDB, writeDB, send, readJson, OWNER_EMAIL } from "../lib/server.mjs";
import { sendEmail, emailWrap } from "../lib/email.mjs";

export const config = { maxDuration: 60 };

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function runGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  for (const model of MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }], // búsqueda real de Google (grounding)
            generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
          }),
        }
      );
      const j = await r.json();
      const text = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text).filter(Boolean).join("\n").trim();
      if (r.ok && text) return text;
    } catch {}
  }
  return null;
}

function buildPrompt(d) {
  return `Eres el analista de admisiones de Ethos LATAM, un club privado de founders de alto rendimiento en Latinoamérica (acceso por aplicación). Buscamos founders, CEOs e inversionistas con proyecto REAL y tracción, mentalidad de dar, y que valoren su salud y alto rendimiento tanto como su negocio.

Investiga A FONDO EN INTERNET (usa la búsqueda de Google) a este aplicante y a su empresa/marca:
- Nombre: ${d.name || "—"}
- Email: ${d.email || "—"}
- Empresa/proyecto: ${d.company || "—"}
- Rol: ${d.role || "—"}
- Tracción declarada: ${d.traccion || "—"}
- Web/LinkedIn declarado: ${d.link || "—"}
- LinkedIn: ${d.linkedin || "—"} · Instagram: ${d.instagram || "—"}
- Ciudad/País: ${[d.city, d.country].filter(Boolean).join(", ") || "—"}
- Sector: ${d.sector || "—"}
- Su mensaje: "${d.msg || "—"}"

Busca: su perfil de LinkedIn, su Instagram, la web y redes de su empresa, noticias o menciones, señales de tracción real (equipo, clientes, inversión levantada, reseñas) y si lo declarado es coherente con lo que existe en internet.

Devuelve EXACTAMENTE este formato, en texto plano y en español:
RESUMEN: (3-4 líneas: quién es, qué hace, qué encontraste)
HALLAZGOS: (viñetas "- " con lo verificado en internet, citando la fuente entre paréntesis)
SEÑALES POSITIVAS: (viñetas "- ")
SEÑALES DE ALERTA: (viñetas "- "; si no hay, escribe "- Ninguna evidente")
ENCAJE CON ETHOS: n/10 — una línea con el porqué (tracción, mentalidad, perfil)
RECOMENDACIÓN: (Entrevistar con prioridad | Entrevistar | Pedir más información | Descartar) — una línea de justificación
PREGUNTAS DE ENTREVISTA:
1. ... (5 preguntas personalizadas según lo que encontraste; incisivas pero cordiales)

Si NO encuentras rastro de la persona o su empresa en internet, dilo claramente (esa ausencia ya es una señal) y evalúa solo con lo declarado. No inventes datos.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    const body = await readJson(req);
    const db = await readDB();
    let rec = null, datos = null, tipo = null;

    if (body.type === "lead" && body.id) {
      rec = (db.leads || []).find((x) => x.id === String(body.id));
      if (rec) { datos = rec; tipo = "Solicitud web"; }
    } else if (body.type === "signup" && body.email) {
      const u = db.users?.[String(body.email).toLowerCase()];
      if (u && u.status === "pending") { rec = u; datos = u; tipo = "Registro de miembro"; }
    }
    if (!rec) return send(res, 404, { error: "Solicitud no encontrada." });
    if (rec.investigacion) return send(res, 200, { ok: true, cached: true });
    if (!process.env.GEMINI_API_KEY) return send(res, 200, { skipped: true, nota: "Falta GEMINI_API_KEY en Vercel." });

    // Marca provisional para evitar dobles ejecuciones concurrentes.
    rec.investigacion = { text: "(investigando…)", ts: Date.now() };
    await writeDB(db);

    const text = await runGemini(buildPrompt(datos));
    // Releer la DB (otra escritura pudo pasar en medio) y guardar el resultado final.
    const db2 = await readDB();
    const rec2 = body.type === "lead"
      ? (db2.leads || []).find((x) => x.id === String(body.id))
      : db2.users?.[String(body.email).toLowerCase()];
    if (rec2) {
      rec2.investigacion = text ? { text, ts: Date.now() } : null;
      await writeDB(db2);
    }
    if (!text) return send(res, 200, { ok: false, nota: "La investigación no devolvió resultado." });

    if (OWNER_EMAIL) {
      await sendEmail(
        OWNER_EMAIL,
        "🔎 Investigación IA: " + (datos.name || datos.email),
        emailWrap(
          "Investigación del aplicante — " + esc(datos.name || datos.email),
          `<p style="margin:0 0 10px;color:#6B7280;font-size:13px">${esc(tipo)} · ${esc(datos.email || "")}${datos.traccion ? " · Tracción: <b>" + esc(datos.traccion) + "</b>" : ""}</p>` +
          `<div style="white-space:pre-wrap;font-size:14px;line-height:1.55">${esc(text)}</div>`,
          { url: "https://ethoslatam.com/miembros/admin", label: "Ver en el panel" }
        )
      );
    }
    return send(res, 200, { ok: true });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
