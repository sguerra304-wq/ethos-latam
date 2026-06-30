// ETHOS LATAM — backend compartido (Vercel Blob + JWT + bcrypt)
import { put, list, del } from "@vercel/blob";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const DB_PREFIX = "db/data-"; // versionado: cada escritura = URL nueva (nunca cacheada en CDN)
export const OWNER_EMAIL = (process.env.OWNER_EMAIL || "").trim().toLowerCase();
export const isOwner = (email) => !!OWNER_EMAIL && email === OWNER_EMAIL;

/* ---------- Seed ---------- */
export function defaultDB() {
  return {
    users: {},
    rsvps: {},
    channels: [
      { id: "general", name: "Anuncios", emoji: "📣" },
      { id: "growth", name: "Growth", emoji: "🚀" },
      { id: "fundraising", name: "Fundraising", emoji: "💰" },
      { id: "wellness", name: "Wellness", emoji: "🧘" },
      { id: "wins", name: "Wins", emoji: "🏆" },
      { id: "ayuda", name: "Pedir ayuda", emoji: "🙋" }
    ],
    posts: [
      { id: "p1", channel: "wins", author: "Marcos Pérez", initials: "MP", text: "¡Cerramos el mejor mes de la historia: $520k en ventas! 🔥 Gracias al mastermind por la idea del bundle.", likes: 42, likedBy: [], comments: [{ author: "Julia Méndez", text: "¡Bestial! 👏" }], time: "hace 2h" },
      { id: "p2", channel: "fundraising", author: "Tomás Gil", initials: "TG", text: "¿Alguien con contactos en fondos seed que inviertan en fintech LatAm? Cerrando ronda.", likes: 11, likedBy: [], comments: [], time: "hace 5h" },
      { id: "p3", channel: "wellness", author: "Lucía Romero", initials: "LR", text: "Reto de la semana: 10k pasos + 0 pantallas tras las 22h. ¿Quién se apunta? 💪", likes: 28, likedBy: [], comments: [], time: "ayer" }
    ],
    events: [
      { id: "ev1", date: "2026-07-12", title: "Mastermind de escalado", type: "Mastermind", city: "Madrid", mode: "Presencial", plan: "Pro", img: "../assets/img/mastermind.webp", desc: "Resuelve tu mayor cuello de botella con 11 founders.", seats: 12 },
      { id: "ev2", date: "2026-07-19", title: "Retiro Wellness & Foco", type: "Retiro", city: "Sierra", mode: "Presencial", plan: "Elite", img: "../assets/img/emotion-sunrise.webp", desc: "Dos días: deporte, respiración, estrategia y desconexión.", seats: 20 },
      { id: "ev3", date: "2026-07-27", title: "Demo Day de inversión", type: "Inversión", city: "Online + Madrid", mode: "Híbrido", plan: "Starter", img: "../assets/img/emotion-celebration.webp", desc: "6 founders presentan ante angels y fondos.", seats: 60 },
      { id: "ev4", date: "2026-08-05", title: "Workshop: IA para founders", type: "Workshop", city: "Online", mode: "Online", plan: "Starter", img: "../assets/img/coworking.webp", desc: "Integra IA en tu operación y multiplica productividad.", seats: 100 },
      { id: "ev6", date: "2026-09-21", title: "Ethos Summit 2026", type: "Cumbre", city: "Lisboa", mode: "Presencial", plan: "Starter", img: "../assets/img/hero-founders.webp", desc: "El gran encuentro anual de la comunidad.", seats: 200 }
    ],
    resources: [
      { id: "r1", cat: "Fundraising", title: "Plantilla de data room", type: "Plantilla", desc: "Estructura para cerrar rondas más rápido." },
      { id: "r2", cat: "Growth", title: "Playbook de 0 a $1M ARR", type: "Guía", desc: "Tácticas reales de adquisición de miembros." },
      { id: "r3", cat: "Wellness", title: "Protocolo de energía del founder", type: "Guía", desc: "Sueño, entrenamiento y foco sin quemarte." },
      { id: "r4", cat: "Finanzas", title: "Modelo financiero (Sheets)", type: "Plantilla", desc: "Modelo de 3 estados listo para personalizar." }
    ],
    perks: [
      { id: "pk1", partner: "AWS Activate", title: "$5,000 en créditos cloud", desc: "Créditos para startups en AWS.", value: "$5,000", plan: "Starter", cta: "Canjear" },
      { id: "pk2", partner: "Notion", title: "6 meses gratis de Notion Plus", desc: "Plan Plus con IA para tu equipo.", value: "$1,200", plan: "Starter", cta: "Canjear" },
      { id: "pk3", partner: "Stripe", title: "Sin comisiones en tus primeros $50k", desc: "Procesa sin fees con Stripe.", value: "$1,500", plan: "Pro", cta: "Canjear" },
      { id: "pk4", partner: "HubSpot for Startups", title: "90% de descuento el primer año", desc: "CRM y marketing para escalar.", value: "$8,000", plan: "Pro", cta: "Canjear" },
      { id: "pk5", partner: "WHOOP", title: "Wearable + 1 año de membresía", desc: "Mide recuperación, sueño y esfuerzo.", value: "$400", plan: "Elite", cta: "Canjear" },
      { id: "pk6", partner: "Mercury", title: "Cuenta business + $500 de bienvenida", desc: "Banca para startups, sin comisiones.", value: "$500", plan: "Elite", cta: "Canjear" }
    ],
    applications: [],  // las solicitudes reales son usuarios con status 'pending' (ver api/db.mjs)
    settings: { announcement: "" },  // contenido editable por el admin (banner en el dashboard de miembros)
    dms: {},            // mensajes directos: { "uidA~uidB": { messages:[{from,text,ts}], read:{uid:ts} } }
    notifications: {},  // notificaciones por usuario: { email: [{id,type,text,href,ts,read}] }
    groups: [],         // Core Groups / masterminds: [{id,name,description,schedule,memberUids:[]}]
    leads: [],          // solicitudes desde la web pública (form Aplicar) → panel admin
    subscribers: []     // suscriptores de newsletter desde la web pública → panel admin
  };
}

/* Handle público estable derivado del email (NO reversible a PII; sirve para
   direccionar DMs y tarjetas de directorio sin exponer el email del miembro). */
export function uidFor(email) {
  const s = (email || "").toLowerCase();
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return "u" + h.toString(36);
}

/* Añade una notificación al buzón de un usuario (más recientes primero, máx 50). */
export function pushNotif(db, email, n) {
  if (!email) return;
  db.notifications = db.notifications || {};
  const list = db.notifications[email] || (db.notifications[email] = []);
  list.unshift({ id: "n_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), read: false, ...n });
  if (list.length > 50) list.length = 50;
}

/* ---------- DB read/write (Vercel Blob, versionado) ----------
   Cada escritura crea un blob con URL NUEVA → nunca se sirve cacheada por CDN
   (causa raíz del bug de lecturas obsoletas con pathname fijo). La lectura toma
   la versión más reciente. Tras escribir se borran las versiones antiguas. */
async function listNewest() {
  const { blobs } = await list({ prefix: DB_PREFIX, token: TOKEN });
  const ts = (b) => { const m = (b.pathname || "").match(/data-(\d+)-/); return m ? Number(m[1]) : 0; };
  blobs.sort((a, b) => ts(b) - ts(a)); // timestamp embebido en el nombre (preciso al ms)
  return blobs;
}
export async function readDB() {
  const blobs = await listNewest();
  if (!blobs.length) return defaultDB();           // no escribir durante la lectura (evita versiones que compiten)
  const res = await fetch(blobs[0].url, { headers: { Authorization: "Bearer " + TOKEN }, cache: "no-store" });
  if (!res.ok) return defaultDB();
  return res.json();
}
export async function writeDB(db) {
  const path = DB_PREFIX + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".json";
  const r = await put(path, JSON.stringify(db), { access: "private", contentType: "application/json", token: TOKEN });
  try {
    const blobs = await listNewest();
    const old = blobs.filter((b) => b.url !== r.url).slice(2); // conservar 3 más recientes
    if (old.length) await del(old.map((b) => b.url), { token: TOKEN });
  } catch (e) {}
  return r;
}

/* ---------- Helpers ---------- */
export const initials = (n) => (n || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
export function safeUser(u) {
  if (!u) return null;
  const { passHash, avatarBlob, ...rest } = u;
  return { ...rest, initials: initials(u.name) };
}
export async function hashPw(pw) { return bcrypt.hash(pw, 10); }
export async function checkPw(pw, hash) { return bcrypt.compare(pw, hash); }
export function signToken(email) { return jwt.sign({ email }, SECRET, { expiresIn: "30d" }); }
export function sessionCookie(token) {
  return `eth_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
}
export function clearCookie() { return "eth_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"; }
export function getSessionEmail(req) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/eth_session=([^;]+)/);
  if (!m) return null;
  try { return jwt.verify(decodeURIComponent(m[1]), SECRET).email; } catch (e) { return null; }
}
export function readJson(req) {
  return new Promise((resolve) => {
    let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { resolve({}); } });
  });
}
export function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}
