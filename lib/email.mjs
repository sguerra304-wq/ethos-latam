// ETHOS LATAM — email transaccional (Resend).
// Se ACTIVA SOLO si existe la env RESEND_API_KEY; sin ella, no-op silencioso.
// Cuando el dominio esté verificado en Resend, definir EMAIL_FROM (ej. "Ethos LATAM <hola@ethoslatam.com>").
const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "Ethos LATAM <onboarding@resend.dev>";

// Entrevista de admisión (Calendly de Sebastián). El enlace aterriza en el
// calendario UNA SEMANA después de hoy; la regla dura ("mínimo 7 días de
// anticipación, horario laboral, zona America/Lima") se impone en la
// configuración del evento dentro de Calendly.
export const CALENDLY_URL = process.env.CALENDLY_URL || "https://calendly.com/sguerra304";
export function calendlyLink() {
  const iso = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  return `${CALENDLY_URL}?month=${iso.slice(0, 7)}&date=${iso}`;
}

export async function sendEmail(to, subject, html) {
  if (!KEY || !to) return { skipped: true };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html })
    });
    return { ok: r.ok };
  } catch (e) { return { ok: false }; }
}

export const emailWrap = (title, body, cta) =>
  `<!doctype html><body style="margin:0;background:#F2F4EC;padding:32px 16px;font-family:Segoe UI,Arial,sans-serif">
   <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7e0">
     <div style="font-weight:700;font-size:18px;margin-bottom:18px">Ethos <span style="color:#6C3CE0">LATAM</span></div>
     <h2 style="margin:0 0 10px;font-size:20px;color:#12151B">${title}</h2>
     <div style="color:#39414C;font-size:15px;line-height:1.6">${body}</div>
     ${cta ? `<a href="${cta.url}" style="display:inline-block;margin-top:22px;background:#12151B;color:#fff;text-decoration:none;padding:12px 22px;border-radius:100px;font-weight:600;font-size:14px">${cta.label}</a>` : ""}
     <p style="color:#9AA1AC;font-size:12px;margin-top:26px">Ethos LATAM · El club de founders de alto rendimiento · ethoslatam.com</p>
   </div></body>`;
