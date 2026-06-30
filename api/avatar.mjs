// ETHOS LATAM — proxy de fotos de perfil.
// Sirve el avatar (blob PRIVADO) por uid público, sin exponer la URL privada ni el token.
import { readDB, uidFor } from "../lib/server.mjs";

export default async function handler(req, res) {
  try {
    const u = new URL(req.url, "http://localhost").searchParams.get("u");
    if (!u) { res.statusCode = 400; return res.end("Falta uid"); }
    const db = await readDB();
    let blobUrl = null;
    for (const e in db.users) { if (uidFor(e) === u) { blobUrl = db.users[e].avatarBlob; break; } }
    if (!blobUrl) { res.statusCode = 404; return res.end("Sin avatar"); }
    const r = await fetch(blobUrl, { headers: { Authorization: "Bearer " + process.env.BLOB_READ_WRITE_TOKEN }, cache: "no-store" });
    if (!r.ok) { res.statusCode = 404; return res.end("No encontrado"); }
    const buf = Buffer.from(await r.arrayBuffer());
    res.statusCode = 200;
    res.setHeader("Content-Type", r.headers.get("content-type") || "image/webp");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.end(buf);
  } catch (e) {
    res.statusCode = 500; res.end("Error");
  }
}
