// ETHOS LATAM — Recordatorio automático a aplicantes (Cron diario de Vercel).
// Si una solicitud lleva 3+ días sin avanzar (lead "new" o registro "pending"),
// le envía UN recordatorio con el enlace de la entrevista (Calendly) y marca
// followup para no insistir nunca más. Idempotente y con tope por corrida.
import { readDB, writeDB, send } from "../lib/server.mjs";
import { sendEmail, emailWrap, calendlyLink } from "../lib/email.mjs";

const ESPERA = 3 * 864e5;   // 3 días
const TOPE = 20;            // máx. correos por corrida (seguridad)

export default async function handler(req, res) {
  // Protección del cron (recomendada por Vercel): si CRON_SECRET está definida,
  // solo acepta llamadas con ese Bearer. Sin la env, el endpoint sigue siendo
  // inofensivo: idempotente (1 recordatorio por solicitud, para siempre).
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== "Bearer " + secret)
    return send(res, 401, { error: "Unauthorized" });
  try {
    const db = await readDB();
    const ahora = Date.now();
    const pendientes = [];

    for (const l of db.leads || []) {
      if ((l.status || "new") === "new" && !l.followup && l.email && ahora - (l.ts || 0) > ESPERA)
        pendientes.push({ rec: l, name: l.name });
    }
    for (const u of Object.values(db.users || {})) {
      if (u.status === "pending" && !u.followup && u.email && ahora - (u.createdAt || 0) > ESPERA)
        pendientes.push({ rec: u, name: u.name });
    }

    let enviados = 0;
    for (const { rec, name } of pendientes.slice(0, TOPE)) {
      await sendEmail(rec.email, "Tu entrevista con Ethos LATAM te espera",
        emailWrap("¿Seguimos, " + ((String(name || "").split(" ")[0]) || "founder") + "?",
          "Recibimos tu solicitud para entrar a <b>Ethos LATAM</b> hace unos días y aún no agendaste tu <b>entrevista de admisión</b> (15 minutos, por video). Es el siguiente paso para entrar al club." +
          "<br><br>Los horarios se abren desde la próxima semana, en horario laboral de Perú (GMT-5). Y si ya no te interesa, simplemente ignora este correo — sin dramas.",
          { url: calendlyLink(), label: "📅 Agendar mi entrevista" }));
      rec.followup = ahora;
      enviados++;
    }
    if (enviados) await writeDB(db);
    return send(res, 200, { ok: true, revisados: pendientes.length, enviados });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
