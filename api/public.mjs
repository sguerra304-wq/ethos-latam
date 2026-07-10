// ETHOS LATAM — endpoint público (sin auth): capta solicitudes y suscripciones
// desde la web de marketing y las guarda en el store → visibles en el panel admin.
import { readDB, writeDB, send, readJson, OWNER_EMAIL, rateLimit, clientIp } from "../lib/server.mjs";
import { sendEmail, emailWrap, calendlyLink } from "../lib/email.mjs";

const clean = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  const action = new URL(req.url, "http://localhost").searchParams.get("action");
  try {
    const body = await readJson(req);
    const db = await readDB();
    db.leads = db.leads || [];
    db.subscribers = db.subscribers || [];

    if (action === "apply") {
      // Honeypot: campo oculto que los humanos no ven; si viene lleno es un bot.
      // Se responde "ok" para no darle pistas, pero no se guarda ni se envía nada.
      if (clean(body.hp, 50) || clean(body._honey, 50)) return send(res, 200, { ok: true, id: "ld_0" });
      if (!rateLimit("apply:" + clientIp(req), 5, 3600e3))
        return send(res, 429, { error: "Demasiadas solicitudes desde esta conexión. Intenta más tarde." });
      const email = clean(body.email, 160).toLowerCase();
      const name = clean(body.name, 120);
      if (!name || !validEmail(email)) return send(res, 400, { error: "Nombre y email válido requeridos." });
      const leadId = "ld_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      db.leads.unshift({
        id: leadId,
        name, email, company: clean(body.company, 120), role: clean(body.role, 80),
        plan: clean(body.plan, 60), link: clean(body.link, 200), msg: clean(body.msg, 1200),
        traccion: clean(body.traccion, 80),
        ts: Date.now(), status: "new"
      });
      if (db.leads.length > 500) db.leads.length = 500;
      await writeDB(db);
      await sendEmail(email, "Recibimos tu solicitud — Ethos LATAM",
        emailWrap("¡Gracias por aplicar, " + (name.split(" ")[0]) + "!",
          "Recibimos tu solicitud para entrar a <b>Ethos LATAM</b>. Revisamos cada perfil con atención y te escribiremos en 48–72h." +
          "<br><br><b>Adelanta el siguiente paso:</b> agenda tu <b>entrevista de admisión</b> (15 minutos, por video). Los horarios se abren <b>desde la próxima semana</b>, en horario laboral de Perú (GMT-5).",
          { url: calendlyLink(), label: "📅 Agendar mi entrevista" }));
      if (OWNER_EMAIL) await sendEmail(OWNER_EMAIL, "Nueva solicitud web: " + name,
        emailWrap("Nueva solicitud desde la web",
          `<b>${name}</b> (${email})${body.traccion ? `<br>Tracción: <b>${clean(body.traccion, 80)}</b>` : ""}${body.link ? `<br>Perfil: ${clean(body.link, 200)}` : ""}`,
          { url: "https://ethoslatam.com/miembros/admin", label: "Ver en el panel" }));
      return send(res, 200, { ok: true, id: leadId });
    }

    if (action === "subscribe") {
      if (clean(body.hp, 50) || clean(body._honey, 50)) return send(res, 200, { ok: true });
      if (!rateLimit("subs:" + clientIp(req), 10, 3600e3))
        return send(res, 429, { error: "Demasiadas suscripciones desde esta conexión. Intenta más tarde." });
      const email = clean(body.email, 160).toLowerCase();
      if (!validEmail(email)) return send(res, 400, { error: "Email no válido." });
      if (!db.subscribers.some((s) => s.email === email)) {
        db.subscribers.unshift({ email, ts: Date.now() });
        if (db.subscribers.length > 5000) db.subscribers.length = 5000;
        await writeDB(db);
        await sendEmail(email, "Estás dentro — Newsletter Ethos LATAM",
          emailWrap("¡Bienvenido!", "Gracias por suscribirte a la newsletter de <b>Ethos LATAM</b>. Cada semana recibirás ideas de negocio, salud y alto rendimiento para founders.", { url: "https://ethoslatam.com", label: "Visitar Ethos LATAM" }));
      }
      return send(res, 200, { ok: true });
    }

    return send(res, 400, { error: "Acción no válida." });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
