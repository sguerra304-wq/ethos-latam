// ETHOS LATAM — Auth API (email + contraseña, sesión por cookie JWT)
import { readDB, writeDB, safeUser, hashPw, checkPw, signToken, sessionCookie, clearCookie, getSessionEmail, readJson, send, isOwner, OWNER_EMAIL, uidFor, rateLimit, clientIp } from "../lib/server.mjs";
import { put } from "@vercel/blob";
import { sendEmail, emailWrap, calendlyLink } from "../lib/email.mjs";

export default async function handler(req, res) {
  const q = new URL(req.url, "http://localhost").searchParams;
  const action = q.get("action");
  try {
    if (action === "me") {
      const email = getSessionEmail(req);
      if (!email) return send(res, 200, { user: null });
      const db = await readDB();
      const raw = db.users[email];
      if (!raw || (raw.status && raw.status !== "approved" && !isOwner(email))) return send(res, 200, { user: null });
      const u = safeUser(raw);
      u.isAdmin = u.isAdmin || isOwner(email);
      return send(res, 200, { user: u });
    }

    if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
    const body = await readJson(req);
    const email = (body.email || "").trim().toLowerCase();

    if (action === "logout") {
      res.setHeader("Set-Cookie", clearCookie());
      return send(res, 200, { ok: true });
    }

    if (action === "signup") {
      if (!rateLimit("signup:" + clientIp(req), 5, 3600e3))
        return send(res, 429, { error: "Demasiados registros desde esta conexión. Intenta en una hora." });
      if (!email || !body.password) return send(res, 400, { error: "Email y contraseña requeridos." });
      if (body.password.length < 6 || body.password.length > 100) return send(res, 400, { error: "La contraseña debe tener entre 6 y 100 caracteres." });
      if (!body.country || !body.document || !body.age || !body.profession)
        return send(res, 400, { error: "Faltan datos: país, documento, edad y profesión son obligatorios." });
      if (!body.traccion)
        return send(res, 400, { error: "Cuéntanos la tracción de tu negocio: es parte del filtro de admisión." });
      const db = await readDB();
      if (db.users[email]) return send(res, 409, { error: "Ya existe una cuenta con ese email. Inicia sesión." });
      const firstUser = Object.keys(db.users).length === 0;
      const str = (v) => (typeof v === "string" ? v.trim() : "");
      const profession = str(body.profession);
      // Si hay OWNER_EMAIL definido, SOLO el owner es admin/aprobado directo; el resto queda pendiente.
      // Si no, el primer registro queda como admin (modo arranque).
      const approved = isOwner(email) || (!OWNER_EMAIL && firstUser);
      const user = {
        id: "u_" + Math.random().toString(36).slice(2, 10),
        email, name: str(body.name) || email.split("@")[0],
        passHash: await hashPw(body.password),
        country: str(body.country), document: str(body.document),
        age: body.age ? Number(body.age) : null,
        profession, role: profession || "Founder",
        company: str(body.company), sector: str(body.sector), city: str(body.city),
        linkedin: str(body.linkedin), instagram: str(body.instagram), bio: "",
        traccion: str(body.traccion),
        plan: "Pro", isAdmin: approved, status: approved ? "approved" : "pending", createdAt: Date.now(), lastSeen: Date.now()
      };
      db.users[email] = user;
      await writeDB(db);
      if (approved) {
        res.setHeader("Set-Cookie", sessionCookie(signToken(email)));
        return send(res, 200, { user: safeUser(user) });
      }
      // Emails (no-op si no hay RESEND_API_KEY): confirmación al aplicante + aviso al owner.
      await sendEmail(email, "Recibimos tu solicitud — Ethos LATAM",
        emailWrap("¡Gracias por aplicar, " + (user.name.split(" ")[0]) + "!",
          "Recibimos tu solicitud para entrar a <b>Ethos LATAM</b>. Revisamos cada perfil con atención para cuidar la calidad de la comunidad. Te escribiremos en 48–72h con la decisión." +
          "<br><br><b>Adelanta el siguiente paso:</b> agenda tu <b>entrevista de admisión</b> (15 minutos, por video). Los horarios se abren <b>desde la próxima semana</b>, en horario laboral de Perú (GMT-5).",
          { url: calendlyLink(), label: "📅 Agendar mi entrevista" }));
      if (OWNER_EMAIL) await sendEmail(OWNER_EMAIL, "Nueva solicitud: " + user.name,
        emailWrap("Nueva solicitud de ingreso",
          `<b>${user.name}</b> (${email})<br>${user.profession || ""} · ${user.company || "—"} · ${user.city || ""}, ${user.country || ""}${user.traccion ? `<br>Tracción: <b>${user.traccion}</b>` : ""}`,
          { url: "https://ethoslatam.com/miembros/admin", label: "Revisar en el panel" }));
      return send(res, 200, { pending: true });
    }

    if (action === "login") {
      // Anti fuerza-bruta: por IP (ataques distribuidos a muchas cuentas) y por
      // cuenta (ataques a un email concreto desde varias IPs de una instancia).
      if (!rateLimit("login-ip:" + clientIp(req), 20, 600e3) || !rateLimit("login-em:" + email, 8, 600e3))
        return send(res, 429, { error: "Demasiados intentos. Espera 10 minutos y vuelve a intentarlo." });
      const db = await readDB();
      const user = db.users[email];
      if (!user || !(await checkPw(String(body.password || "").slice(0, 100), user.passHash))) {
        return send(res, 401, { error: "Email o contraseña incorrectos." });
      }
      const st = user.status || "approved"; // usuarios antiguos sin status = aprobados
      if (st === "rejected") return send(res, 403, { error: "Tu solicitud de acceso no fue aprobada." });
      if (st === "payment" && !isOwner(email)) return send(res, 403, { error: "¡Fuiste aceptado! Tu acceso se activa en cuanto confirmemos tu pago. Revisa el correo con el link de Mercado Pago." });
      if (st !== "approved" && !isOwner(email)) return send(res, 403, { error: "Tu solicitud está en revisión. Te avisaremos cuando sea aprobada." });
      user.lastSeen = Date.now();
      await writeDB(db);
      res.setHeader("Set-Cookie", sessionCookie(signToken(email)));
      const su = safeUser(user); su.isAdmin = su.isAdmin || isOwner(email);
      return send(res, 200, { user: su });
    }

    if (action === "updateProfile") {
      const sEmail = getSessionEmail(req);
      if (!sEmail) return send(res, 401, { error: "No autenticado." });
      const db = await readDB();
      const user = db.users[sEmail];
      if (!user) return send(res, 404, { error: "Usuario no encontrado." });
      ["name", "company", "role", "sector", "city", "bio", "country", "linkedin", "instagram", "profession", "offers", "asks"].forEach((k) => {
        if (typeof body[k] === "string") user[k] = body[k].slice(0, 280);
      });
      await writeDB(db);
      return send(res, 200, { user: safeUser(user) });
    }

    if (action === "changePassword") {
      const sEmail = getSessionEmail(req);
      if (!sEmail) return send(res, 401, { error: "No autenticado." });
      if (!body.next || body.next.length < 6 || body.next.length > 100) return send(res, 400, { error: "La nueva contraseña debe tener entre 6 y 100 caracteres." });
      const db = await readDB();
      const user = db.users[sEmail];
      if (!user || !(await checkPw(body.current || "", user.passHash))) return send(res, 401, { error: "La contraseña actual no es correcta." });
      user.passHash = await hashPw(body.next);
      await writeDB(db);
      await sendEmail(sEmail, "Tu contraseña se actualizó — Ethos LATAM",
        emailWrap("Contraseña actualizada", "Acabas de cambiar la contraseña de tu cuenta de Ethos LATAM. Si no fuiste tú, escríbenos de inmediato a hola@ethoslatam.com.", null));
      return send(res, 200, { ok: true });
    }

    if (action === "avatar") {
      const sEmail = getSessionEmail(req);
      if (!sEmail) return send(res, 401, { error: "No autenticado." });
      const db = await readDB();
      const user = db.users[sEmail];
      if (!user) return send(res, 404, { error: "Usuario no encontrado." });
      const m = String(body.dataUrl || "").match(/^data:(image\/(png|jpeg|webp));base64,(.+)$/);
      if (!m) return send(res, 400, { error: "Imagen no válida." });
      const buf = Buffer.from(m[3], "base64");
      if (buf.length > 600 * 1024) return send(res, 413, { error: "La imagen es demasiado grande." });
      const ext = m[2] === "jpeg" ? "jpg" : m[2];
      const r = await put("avatars/" + uidFor(sEmail) + "-" + Date.now() + "." + ext, buf, {
        access: "private", contentType: m[1], token: process.env.BLOB_READ_WRITE_TOKEN, addRandomSuffix: false
      });
      user.avatarBlob = r.url;                       // URL privada (se sirve vía proxy)
      user.avatar = "/api/avatar?u=" + uidFor(sEmail); // URL pública estable para <img>
      await writeDB(db);
      return send(res, 200, { user: safeUser(user) });
    }

    return send(res, 400, { error: "Acción no válida." });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
