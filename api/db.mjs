// ETHOS LATAM — Data API (datos compartidos en Vercel Blob)
import { readDB, writeDB, safeUser, getSessionEmail, readJson, send, initials, isOwner, uidFor, pushNotif } from "../lib/server.mjs";
import { sendEmail, emailWrap } from "../lib/email.mjs";
import { MP_LINK, precioDe } from "../lib/pagos.mjs";

const rid = (p) => p + "_" + Math.random().toString(36).slice(2, 10);

export default async function handler(req, res) {
  try {
    const email = getSessionEmail(req);
    if (!email) return send(res, 401, { error: "No autenticado." });
    const db = await readDB();
    db.dms = db.dms || {};
    db.notifications = db.notifications || {};
    db.groups = db.groups || [];
    db.leads = db.leads || [];
    db.subscribers = db.subscribers || [];
    db.testimonials = db.testimonials || [];
    const me = db.users[email];
    if (!me) return send(res, 401, { error: "Sesión no válida." });
    const isAdmin = !!me.isAdmin || isOwner(email);
    const myUid = uidFor(email);

    if (req.method === "GET") {
      // Miembros: ocultar email a no-admins (PII); el admin lo necesita para gestionar.
      // uid = handle público para mensajería/tarjetas (no es PII).
      const members = Object.values(db.users)
        .filter((u) => (u.status || "approved") === "approved")  // solo miembros aprobados
        .map((u) => {
          const s = safeUser(u);
          s.uid = uidFor(u.email);
          if (!isAdmin) { delete s.email; delete s.document; delete s.age; }
          return s;
        });
      // Posts: no exponer likedBy/authorEmail (PII); enviar solo "liked" del usuario actual.
      const shapePost = (p) => ({
        id: p.id, channel: p.channel, author: p.author, initials: p.initials,
        text: p.text, likes: p.likes || 0, comments: p.comments || [], time: p.time, ts: p.ts || 0,
        liked: (p.likedBy || []).includes(email), mine: p.authorEmail === email || isAdmin
      });
      // Feed público: excluye los posts privados de Core Groups (canal "grp:<id>").
      const posts = (db.posts || []).filter((p) => !String(p.channel || "").startsWith("grp:")).map(shapePost);
      // Mensajes directos del usuario (con datos públicos del interlocutor).
      const uidToUser = {}; Object.keys(db.users).forEach((e) => (uidToUser[uidFor(e)] = db.users[e]));
      const myDms = Object.keys(db.dms)
        .filter((k) => k.split("~").includes(myUid))
        .map((k) => {
          const c = db.dms[k]; const otherUid = k.split("~").find((u) => u !== myUid) || myUid;
          const ou = uidToUser[otherUid] || {};
          const msgs = c.messages || [];
          const lastRead = (c.read && c.read[myUid]) || 0;
          const last = msgs[msgs.length - 1];
          return {
            uid: otherUid, name: ou.name || "Miembro", initials: initials(ou.name), avatar: ou.avatar || "",
            role: ou.profession || ou.role || "", company: ou.company || "", lastSeen: ou.lastSeen || 0,
            messages: msgs.slice(-100).map((m) => ({ from: m.from, text: m.text, ts: m.ts, mine: m.from === myUid })),
            lastText: last ? last.text : "", lastTs: last ? last.ts : 0,
            unread: msgs.filter((m) => m.from !== myUid && m.ts > lastRead).length
          };
        })
        .sort((a, b) => b.lastTs - a.lastTs);
      // Core Groups: el grupo del usuario (resuelto a datos públicos) + todos los grupos para el admin.
      const resolveMembers = (uids) => (uids || []).map((u) => {
        const ou = uidToUser[u]; if (!ou) return null;
        return { uid: u, name: ou.name, initials: initials(ou.name), role: ou.profession || ou.role || "", company: ou.company || "", lastSeen: ou.lastSeen || 0, avatar: ou.avatar || "" };
      }).filter(Boolean);
      const myGroupRaw = db.groups.find((grp) => (grp.memberUids || []).includes(myUid)) || null;
      const myGroup = myGroupRaw ? {
        id: myGroupRaw.id, name: myGroupRaw.name, description: myGroupRaw.description || "", schedule: myGroupRaw.schedule || "",
        members: resolveMembers(myGroupRaw.memberUids),
        posts: (db.posts || []).filter((p) => p.channel === "grp:" + myGroupRaw.id).map(shapePost)
      } : null;
      const groups = isAdmin ? db.groups.map((grp) => ({ id: grp.id, name: grp.name, description: grp.description || "", schedule: grp.schedule || "", memberUids: grp.memberUids || [], members: resolveMembers(grp.memberUids) })) : [];
      const notifications = db.notifications[email] || [];
      // Aforo + asistentes por evento (prueba social + networking: "quién va").
      const attByEvent = {};
      Object.entries(db.rsvps || {}).forEach(([em, ids]) => {
        const u = db.users[em]; if (!u || (u.status || "approved") !== "approved") return;
        (ids || []).forEach((id) => { (attByEvent[id] = attByEvent[id] || []).push({ uid: uidFor(em), name: u.name, initials: initials(u.name) }); });
      });
      const events = (db.events || []).map((e) => ({ ...e, rsvpCount: (attByEvent[e.id] || []).length, attendees: (attByEvent[e.id] || []).slice(0, 50) }));
      // ---- Gamificación: puntos + leaderboard (calculado del uso real, sin estado extra) ----
      const approvedUsers = Object.values(db.users).filter((u) => (u.status || "approved") === "approved");
      const pointsFor = (u) => {
        const mine = (db.posts || []).filter((p) => p.authorEmail === u.email);
        let pts = mine.length * 10;
        mine.forEach((p) => { pts += (p.likes || 0) * 3 + (p.comments || []).length * 2; });
        pts += (db.rsvps[u.email] || []).length * 5;
        if (u.avatarBlob) pts += 10;
        if (u.offers) pts += 5; if (u.asks) pts += 5; if (u.bio) pts += 5;
        return pts;
      };
      const ranked = approvedUsers.map((u) => ({ uid: uidFor(u.email), name: u.name, initials: initials(u.name), avatar: u.avatar || "", points: pointsFor(u) })).sort((a, b) => b.points - a.points);
      const leaderboard = ranked.slice(0, 8);
      const myRank = ranked.findIndex((x) => x.uid === myUid) + 1;
      const myPoints = (ranked.find((x) => x.uid === myUid) || {}).points || 0;
      // ---- Café de la semana: emparejado determinista que rota semanalmente (warm intros) ----
      const week = Math.floor(Date.now() / 604800000);
      let seed = week >>> 0;
      const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const pool = approvedUsers.map((u) => uidFor(u.email)).sort();
      for (let i = pool.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [pool[i], pool[k]] = [pool[k], pool[i]]; }
      let coffee = null;
      const myPos = pool.indexOf(myUid);
      if (myPos >= 0) {
        const mate = myPos % 2 === 0 ? pool[myPos + 1] : pool[myPos - 1];
        const mu = mate ? uidToUser[mate] : null;
        if (mu) coffee = { uid: mate, name: mu.name, initials: initials(mu.name), avatar: mu.avatar || "", role: mu.profession || mu.role || "", company: mu.company || "", lastSeen: mu.lastSeen || 0 };
      }
      // ---- Miembro destacado (lo elige el admin en Ajustes) ----
      let spotlight = null;
      const spUid = (db.settings || {}).spotlightUid;
      if (spUid && uidToUser[spUid]) { const sp = uidToUser[spUid]; spotlight = { uid: spUid, name: sp.name, initials: initials(sp.name), avatar: sp.avatar || "", role: sp.profession || sp.role || "", company: sp.company || "", text: (db.settings || {}).spotlightText || "" }; }
      const meSafe = safeUser(me); meSafe.isAdmin = isAdmin; meSafe.uid = myUid;
      return send(res, 200, {
        me: meSafe,
        channels: db.channels || [],
        posts,
        events,
        // code/url de canje solo se entregan al canjear (o al admin para editarlos)
        perks: isAdmin ? (db.perks || []) : (db.perks || []).map((p) => { const { code, url, ...rest } = p; return { ...rest, hasCode: !!code, hasLink: !!url }; }),
        resources: db.resources || [],
        members,
        leads: isAdmin ? db.leads : [],
        subscribers: isAdmin ? db.subscribers : [],
        testimonials: isAdmin ? db.testimonials : [],
        myGroup,
        groups,
        leaderboard, myRank, myPoints, coffee, spotlight,
        myDms,
        notifications,
        unreadNotifs: notifications.filter((n) => !n.read).length,
        applications: isAdmin ? Object.values(db.users).filter((u) => u.status === "pending" || u.status === "payment").map((u) => ({
          id: u.email, name: u.name, email: u.email, role: u.profession || u.role, company: u.company,
          sector: u.sector, city: u.city, country: u.country, age: u.age, document: u.document,
          plan: u.plan, linkedin: u.linkedin, instagram: u.instagram, msg: u.bio || "", status: u.status,
          traccion: u.traccion, investigacion: u.investigacion,
          date: new Date(u.createdAt || Date.now()).toISOString().slice(0, 10)
        })) : [],
        myRsvps: db.rsvps[email] || [],
        settings: db.settings || {}
      });
    }

    if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
    const body = await readJson(req);
    const op = body.op;
    me.lastSeen = Date.now(); // presencia: cada acción refresca "última vez activo" (persiste en el writeDB de la op)
    const needAdmin = () => { if (!isAdmin) { send(res, 403, { error: "Solo administradores." }); return false; } return true; };
    const uidEmail = {}; Object.keys(db.users).forEach((e) => (uidEmail[uidFor(e)] = e));
    const notifyNewMembers = (uids, prevSet, gname) => (uids || []).forEach((u) => { if (!prevSet.has(u) && uidEmail[u]) pushNotif(db, uidEmail[u], { type: "group", text: `👥 Te asignaron al Core Group "${gname}"`, href: "grupo.html" }); });

    switch (op) {
      /* ----- comunidad ----- */
      case "addPost": {
        if (!body.text) return send(res, 400, { error: "Texto requerido." });
        const ch = body.channel || "general";
        if (ch.startsWith("grp:")) { const grp = (db.groups || []).find((x) => x.id === ch.slice(4)); if (!grp || !(grp.memberUids || []).includes(myUid)) return send(res, 403, { error: "No perteneces a este grupo." }); }
        const post = { id: rid("p"), channel: ch, author: me.name, authorEmail: email, initials: initials(me.name), text: String(body.text).slice(0, 2000), likes: 0, likedBy: [], comments: [], time: "ahora", ts: Date.now() };
        db.posts.unshift(post); await writeDB(db); const { authorEmail, ...pub } = post; return send(res, 200, { post: { ...pub, comments: [], liked: false, mine: true } });
      }
      case "toggleLike": {
        const p = (db.posts || []).find((x) => x.id === body.postId);
        if (!p) return send(res, 404, { error: "Post no encontrado." });
        p.likedBy = p.likedBy || [];
        const i = p.likedBy.indexOf(email);
        let liked;
        if (i >= 0) { p.likedBy.splice(i, 1); p.likes = Math.max(0, (p.likes || 0) - 1); liked = false; }
        else {
          p.likedBy.push(email); p.likes = (p.likes || 0) + 1; liked = true;
          if (p.authorEmail && p.authorEmail !== email) pushNotif(db, p.authorEmail, { type: "like", text: `❤️ A ${me.name} le gustó tu publicación`, href: "comunidad.html" });
        }
        await writeDB(db); return send(res, 200, { liked, likes: p.likes });
      }
      case "addComment": {
        const p = (db.posts || []).find((x) => x.id === body.postId);
        if (!p) return send(res, 404, { error: "Post no encontrado." });
        if (!body.text) return send(res, 400, { error: "Comentario vacío." });
        p.comments = p.comments || []; p.comments.push({ author: me.name, text: String(body.text).slice(0, 500) });
        if (p.authorEmail && p.authorEmail !== email) pushNotif(db, p.authorEmail, { type: "comment", text: `💬 ${me.name} comentó tu publicación`, href: "comunidad.html" });
        await writeDB(db); return send(res, 200, { comments: p.comments });
      }
      case "deletePost": {
        const p = (db.posts || []).find((x) => x.id === body.postId);
        if (!p) return send(res, 404, { error: "Publicación no encontrada." });
        if (p.authorEmail !== email && !isAdmin) return send(res, 403, { error: "No puedes borrar esta publicación." });
        db.posts = db.posts.filter((x) => x.id !== body.postId);
        await writeDB(db); return send(res, 200, { ok: true });
      }
      /* ----- eventos ----- */
      case "toggleRsvp": {
        db.rsvps[email] = db.rsvps[email] || [];
        const i = db.rsvps[email].indexOf(body.eventId);
        let going;
        if (i >= 0) { db.rsvps[email].splice(i, 1); going = false; } else { db.rsvps[email].push(body.eventId); going = true; }
        await writeDB(db); return send(res, 200, { going });
      }
      /* ----- admin: eventos ----- */
      case "saveEvent": {
        if (!needAdmin()) return; const ev = body.item || {};
        if (ev.id) { const i = db.events.findIndex((x) => x.id === ev.id); if (i >= 0) db.events[i] = { ...db.events[i], ...ev }; }
        else { ev.id = rid("ev"); db.events.push(ev); }
        await writeDB(db); return send(res, 200, { ok: true, id: ev.id });
      }
      case "deleteEvent": { if (!needAdmin()) return; db.events = db.events.filter((x) => x.id !== body.id); await writeDB(db); return send(res, 200, { ok: true }); }
      /* ----- admin: recursos ----- */
      case "saveResource": {
        if (!needAdmin()) return; const r = body.item || {};
        if (r.id) { const i = db.resources.findIndex((x) => x.id === r.id); if (i >= 0) db.resources[i] = { ...db.resources[i], ...r }; }
        else { r.id = rid("r"); db.resources.push(r); }
        await writeDB(db); return send(res, 200, { ok: true, id: r.id });
      }
      case "deleteResource": { if (!needAdmin()) return; db.resources = db.resources.filter((x) => x.id !== body.id); await writeDB(db); return send(res, 200, { ok: true }); }
      /* ----- admin: perks ----- */
      case "savePerk": {
        if (!needAdmin()) return; const p = body.item || {};
        if (p.id) { const i = db.perks.findIndex((x) => x.id === p.id); if (i >= 0) db.perks[i] = { ...db.perks[i], ...p }; }
        else { p.id = rid("pk"); db.perks.push(p); }
        await writeDB(db); return send(res, 200, { ok: true, id: p.id });
      }
      case "deletePerk": { if (!needAdmin()) return; db.perks = db.perks.filter((x) => x.id !== body.id); await writeDB(db); return send(res, 200, { ok: true }); }
      /* ----- canje real de beneficios (miembro) ----- */
      case "redeemPerk": {
        const p = (db.perks || []).find((x) => x.id === body.id);
        if (!p) return send(res, 404, { error: "Beneficio no encontrado." });
        const RANK = { Starter: 1, Pro: 2, Elite: 3 };
        if ((RANK[me.plan] || 1) < (RANK[p.plan] || 1)) return send(res, 403, { error: "Tu plan no incluye este beneficio." });
        p.redeems = (p.redeems || 0) + 1;
        Object.keys(db.users).forEach((e) => { const u = db.users[e]; if ((u.isAdmin || isOwner(e)) && e !== email) pushNotif(db, e, { type: "perk", text: `🎁 ${me.name} canjeó "${p.title}" (${p.partner})`, href: "admin.html" }); });
        await writeDB(db);
        return send(res, 200, { ok: true, code: p.code || "", url: p.url || "", partner: p.partner, title: p.title });
      }
      /* ----- cambio de plan self-serve ----- */
      case "setMyPlan": {
        const plan = ["Starter", "Pro", "Elite"].includes(body.plan) ? body.plan : null;
        if (!plan) return send(res, 400, { error: "Plan no válido." });
        me.plan = plan;
        await writeDB(db);
        return send(res, 200, { ok: true, plan });
      }
      /* ----- admin: solicitudes ----- */
      // Paso 1 — ACEPTAR Y COBRAR: se aprueba el perfil pero NO se da acceso todavía.
      // Se le envía al aplicante el link de pago de Mercado Pago con el monto de su plan.
      // El acceso se abre recién al confirmar el pago (op "approveApp").
      case "acceptApp": {
        if (!needAdmin()) return;
        const u = db.users[body.id];
        if (u) {
          u.status = "payment";
          u.acceptedAt = Date.now();
          const p = precioDe(u.plan);
          pushNotif(db, body.id, { type: "approval", text: "✅ ¡Fuiste aceptado! Activa tu membresía para entrar.", href: "index.html" });
          await writeDB(db);
          await sendEmail(body.id, "¡Fuiste aceptado en Ethos LATAM! Activa tu membresía",
            emailWrap("Enhorabuena, " + ((u.name || "").split(" ")[0]) + " ✦",
              "Revisamos tu perfil y <b>te aceptamos en Ethos LATAM</b> — el club de founders de alto rendimiento de la región." +
              "<br><br>Para activar tu membresía <b>" + p.nombre + "</b>, completa el pago de <b>" + p.monto + p.periodo + "</b> por Mercado Pago (tarjeta, Yape o transferencia). En el checkout, ingresa exactamente ese monto." +
              "<br><br>En cuanto confirmemos tu pago, abrimos tu acceso a la plataforma, tu Core Group y los eventos. Tu cupo queda reservado a tu nombre por 7 días.",
              { url: MP_LINK, label: "💳 Pagar y activar mi membresía" }));
          return send(res, 200, { ok: true });
        }
        await writeDB(db); return send(res, 200, { ok: true });
      }
      // Paso 2 — CONFIRMAR PAGO: se abre el acceso a la plataforma y se da la bienvenida.
      case "approveApp": {
        if (!needAdmin()) return;
        const u = db.users[body.id];
        if (u) {
          u.status = "approved";
          u.paidAt = Date.now();
          pushNotif(db, body.id, { type: "approval", text: "✅ ¡Pago confirmado! Ya eres parte de Ethos LATAM.", href: "index.html" });
          await writeDB(db);
          await sendEmail(body.id, "Tu membresía Ethos LATAM está activa 🎉",
            emailWrap("¡Bienvenido a Ethos LATAM, " + ((u.name || "").split(" ")[0]) + "! 🎉",
              "Confirmamos tu pago y tu membresía ya está <b>activa</b>. Entra a la plataforma para completar tu perfil, unirte a tu Core Group, reservar eventos y conocer a la comunidad.",
              { url: "https://ethoslatam.com/miembros/login", label: "Entrar a la plataforma" }));
          return send(res, 200, { ok: true });
        }
        await writeDB(db); return send(res, 200, { ok: true });
      }
      case "rejectApp": { if (!needAdmin()) return; const u = db.users[body.id]; if (u) u.status = "rejected"; await writeDB(db); return send(res, 200, { ok: true }); }
      /* ----- admin: miembros ----- */
      case "updateMember": { if (!needAdmin()) return; const u = db.users[body.email]; if (u) Object.assign(u, body.patch || {}); await writeDB(db); return send(res, 200, { ok: true }); }
      case "removeMember": { if (!needAdmin()) return; delete db.users[body.email]; await writeDB(db); return send(res, 200, { ok: true }); }
      /* ----- admin: ajustes de la web ----- */
      case "saveSettings": {
        if (!needAdmin()) return;
        const prev = (db.settings || {}).announcement || "";
        db.settings = Object.assign({}, db.settings || {}, body.patch || {});
        const ann = String(db.settings.announcement || "").trim();
        if (ann && ann !== prev) {
          Object.keys(db.users).forEach((e) => {
            if ((db.users[e].status || "approved") === "approved" && e !== email)
              pushNotif(db, e, { type: "announcement", text: `📣 ${ann.slice(0, 90)}`, href: "index.html" });
          });
        }
        await writeDB(db); return send(res, 200, { ok: true, settings: db.settings });
      }
      /* ----- admin: Core Groups ----- */
      case "saveGroup": {
        if (!needAdmin()) return;
        const it = body.item || {};
        const uids = Array.isArray(it.memberUids) ? it.memberUids.slice(0, 20) : [];
        let grp;
        if (it.id) {
          grp = db.groups.find((x) => x.id === it.id);
          if (grp) { const prev = new Set(grp.memberUids || []); grp.name = it.name || grp.name; grp.description = it.description || ""; grp.schedule = it.schedule || ""; grp.memberUids = uids; notifyNewMembers(uids, prev, grp.name); }
        } else {
          grp = { id: rid("grp"), name: it.name || "Core Group", description: it.description || "", schedule: it.schedule || "", memberUids: uids };
          db.groups.push(grp); notifyNewMembers(uids, new Set(), grp.name);
        }
        await writeDB(db); return send(res, 200, { ok: true, id: grp.id });
      }
      case "deleteGroup": { if (!needAdmin()) return; db.groups = (db.groups || []).filter((x) => x.id !== body.id); await writeDB(db); return send(res, 200, { ok: true }); }
      /* ----- admin: backup completo de la base de datos ----- */
      case "exportDB": { if (!needAdmin()) return; return send(res, 200, { db, exportedAt: Date.now() }); }
      /* ----- admin: captación web (leads + suscriptores) ----- */
      case "deleteLead": { if (!needAdmin()) return; db.leads = (db.leads || []).filter((x) => x.id !== body.id); await writeDB(db); return send(res, 200, { ok: true }); }
      case "setLeadStatus": {
        if (!needAdmin()) return;
        const st = ["new", "interview", "discarded"].includes(body.status) ? body.status : "new";
        const l = (db.leads || []).find((x) => x.id === body.id);
        if (l) { l.status = st; await writeDB(db); }
        return send(res, 200, { ok: true, status: st });
      }
      case "deleteSubscriber": { if (!needAdmin()) return; db.subscribers = (db.subscribers || []).filter((x) => x.email !== body.email); await writeDB(db); return send(res, 200, { ok: true }); }
      /* ----- admin: testimonios REALES (se muestran en la home pública si approved) ----- */
      case "saveTestimonial": {
        if (!needAdmin()) return;
        const t = body.item || {};
        const clean = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
        const rec = { name: clean(t.name, 80), role: clean(t.role, 80), text: clean(t.text, 600), approved: t.approved !== false };
        if (!rec.name || !rec.text) return send(res, 400, { error: "Nombre y testimonio son obligatorios." });
        if (t.id) { const i = db.testimonials.findIndex((x) => x.id === t.id); if (i >= 0) db.testimonials[i] = { ...db.testimonials[i], ...rec }; }
        else { rec.id = rid("ts"); rec.ts = Date.now(); db.testimonials.unshift(rec); }
        await writeDB(db); return send(res, 200, { ok: true });
      }
      case "deleteTestimonial": { if (!needAdmin()) return; db.testimonials = (db.testimonials || []).filter((x) => x.id !== body.id); await writeDB(db); return send(res, 200, { ok: true }); }
      /* ----- mensajes directos (DMs) ----- */
      case "sendDM": {
        const text = String(body.text || "").trim().slice(0, 2000);
        if (!text) return send(res, 400, { error: "Mensaje vacío." });
        let toEmail = null;
        for (const e in db.users) { if (uidFor(e) === body.toUid) { toEmail = e; break; } }
        if (!toEmail || toEmail === email) return send(res, 400, { error: "Destinatario no válido." });
        if ((db.users[toEmail].status || "approved") !== "approved") return send(res, 400, { error: "Destinatario no disponible." });
        const key = [myUid, body.toUid].sort().join("~");
        const c = db.dms[key] || (db.dms[key] = { messages: [], read: {} });
        const ts = Date.now();
        c.messages.push({ from: myUid, text, ts });
        if (c.messages.length > 500) c.messages = c.messages.slice(-500);
        c.read = c.read || {}; c.read[myUid] = ts;
        pushNotif(db, toEmail, { type: "dm", text: `💬 ${me.name}: ${text.slice(0, 60)}`, href: "mensajes.html?u=" + myUid });
        await writeDB(db); return send(res, 200, { ok: true, message: { from: myUid, text, ts, mine: true } });
      }
      case "readDM": {
        const key = [myUid, body.uid].sort().join("~");
        if (db.dms[key]) { db.dms[key].read = db.dms[key].read || {}; db.dms[key].read[myUid] = Date.now(); await writeDB(db); }
        return send(res, 200, { ok: true });
      }
      case "markNotifsRead": {
        if (db.notifications[email]) { db.notifications[email].forEach((n) => (n.read = true)); await writeDB(db); }
        return send(res, 200, { ok: true });
      }
      default: return send(res, 400, { error: "Operación no válida." });
    }
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
}
