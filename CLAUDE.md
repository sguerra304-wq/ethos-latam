# Ethos LATAM — guía para agentes (leer ESTO antes de tocar archivos)

Club privado de founders. Web pública (marketing, SEO/GEO) + plataforma de miembros con backend real.
Producción: https://ethoslatam.com · Proyecto Vercel: `ethos-latam` (cuenta `sguerra304-9046`). Deploy: `npx vercel deploy --prod --yes` desde esta carpeta.

## Stack
HTML/CSS/JS vanilla, sin build. Funciones serverless en `api/*` (Node `export default (req,res)`, ESM `.mjs`). Datos en **Vercel Blob** (store privado). Sin Supabase (eliminado), sin framework.

## Mapa de archivos
- **Web pública** (raíz, indexable): `index.html` `comunidad.html` `eventos.html` `planes.html` `contacto.html`. Estilos `assets/css/styles.css`. JS `assets/js/main.js` (nav, reveal, FAQ, contadores, glow). SEO/GEO: `robots.txt` `sitemap.xml` `llms.txt` `manifest.webmanifest`. JSON-LD en el `<head>` de cada página.
- **Backend**: `lib/server.mjs` (núcleo: defaultDB, readDB/writeDB versionado, auth bcrypt+JWT, `uidFor`, `pushNotif`, helpers). `api/auth.mjs` (signup/login/me/logout/updateProfile). `api/db.mjs` (GET snapshot + POST ops). Stripe: `api/checkout.js` `api/portal.js` `api/stripe-webhook.js` (cableado, inactivo).
- **Plataforma miembros** (`miembros/`, noindex): páginas `login index comunidad eventos directorio grupo recursos beneficios mensajes perfil admin` (.html). Librerías JS: `auth.js` (EthAuth), `data.js` (EthData — snapshot de `/api/db` + ops), `shell.js` (EthShell — sidebar/topbar+buscador+campana, helpers `presence`/`relTime`/`fmtDate`/`toast`), `admin.js` (EthAdmin), `billing.js`+`config.js` (solo en perfil, Stripe demo). Estilos `app.css`.
- Cada página de miembros carga SOLO: `auth.js data.js shell.js` (perfil suma `config.js billing.js`; admin suma `admin.js`). No hay seed/store/config legacy (eliminados).

## Modelo de datos (Blob, un único JSON)
`users{email→{...,uid via uidFor, status, isAdmin, plan, lastSeen, offers, asks, ...}}`, `posts[]` (canal `grp:<id>` = privado de grupo; resto público; `authorEmail` no se expone), `rsvps{email→[eventId]}`, `events[]`, `resources[]`, `perks[]`, `channels[]`, `groups[{id,name,description,schedule,memberUids[]}]`, `dms{"uidA~uidB"→{messages[],read{}}}`, `notifications{email→[{type,text,href,ts,read}]}`, `settings{announcement}`.

## API rápida (`api/db.mjs`)
- GET → `{me,members,posts,events(+rsvpCount,+attendees),myGroup(+posts),groups(admin),myDms,notifications,unreadNotifs,perks,resources,channels,myRsvps,settings,applications(admin)}`.
- POST `op`: addPost·toggleLike·addComment·deletePost·toggleRsvp · saveEvent/deleteEvent · saveResource/deleteResource · savePerk/deletePerk · approveApp/rejectApp · updateMember/removeMember · saveSettings · saveGroup/deleteGroup · sendDM/readDM · markNotifsRead. Ops admin exigen `isAdmin` (403 si no).

## INVARIANTES (no romper)
1. **No hacer wipe del store.** La cuenta real del owner **sguerra304@gmail.com** (Sebastian Guerra, admin) YA existe con sus posts. `OWNER_EMAIL` (env) = único admin.
2. **Blob versionado**: cada escritura crea `db/data-<ts>-<rand>.json`; se lee el más nuevo; `readDB` NO escribe. Env: `BLOB_READ_WRITE_TOKEN`, `AUTH_SECRET`, `OWNER_EMAIL` (en Vercel).
3. **Privacidad**: a no-admin se le ocultan email/DNI(`document`)/`age` de otros; se expone `uid` (handle público de `uidFor`, no PII) para DMs/tarjetas. Posts de grupo solo a sus miembros.
4. Toda página de `miembros/` necesita `<base href="/miembros/">`. `.scrim` siempre `position:fixed`.
5. FX: solo glow en hover (sin animación de entrada ni count-up en miembros — molestaban).

## Verificación E2E (sin tocar la cuenta real)
No se puede aprobar por API sin la contraseña del owner. Patrón: script Node que setea `BLOB_READ_WRITE_TOKEN` desde `.env.local`, importa `readDB/writeDB/uidFor` de `lib/server.mjs`, hace `signup` por API de usuarios `*_test_e2e@example.com`, los aprueba (y a uno lo hace `isAdmin` para probar ops admin) escribiendo el Blob, ejercita por API, y al final **borra solo los de prueba** (users/rsvps/notifications/dms/groups/posts) preservando al owner. Verificar al final que `owners` siguen y no quedan restos.

## Pendiente (requiere claves del usuario)
Resend (emails reales), Stripe (pegar claves para activar cobro).
