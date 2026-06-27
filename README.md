# Ethos LATAM — Web + Plataforma de miembros

Club de founders de alto rendimiento en Latinoamérica. Web pública (marketing) + **plataforma de miembros real** con login, comunidad y panel de administración.

- **Producción:** https://ethoslatam.com
- **Acceso miembros:** https://ethoslatam.com/miembros/login
- **Panel admin (solo owner):** https://ethoslatam.com/miembros/admin

## Backend REAL (sin Supabase)
Auth y datos compartidos viven en **Vercel Blob** (store privado `ethos-latam-data`), servidos por funciones serverless. **No requiere demo ni servicios externos para funcionar.**

- **Auth propia:** email + contraseña, hash `bcrypt`, sesión por cookie JWT HttpOnly (`api/auth.mjs`, `lib/server.mjs`).
- **Flujo de aprobación:** registrarse crea una **solicitud pendiente** (no entra). El **owner** la aprueba/rechaza en el panel. Solo aprobados entran y salen en el directorio.
- **Admin = solo el owner:** controlado por la env `OWNER_EMAIL` (= `sguerra304@gmail.com`). Ningún otro usuario es admin.
- **Datos compartidos:** comunidad (posts/likes/comentarios), eventos + RSVP, recursos, beneficios, miembros, solicitudes y ajustes — todo en `api/db.mjs`.
- **Privacidad:** DNI, email y edad ocultos a otros miembros (solo el admin los ve).

### Variables de entorno (ya configuradas en Vercel)
- `BLOB_READ_WRITE_TOKEN` — token del store Blob (auto al crear el store).
- `AUTH_SECRET` — secreto para firmar las sesiones JWT.
- `OWNER_EMAIL` — email del administrador único (sguerra304@gmail.com).
- *(Stripe, opcional, para cobrar):* `STRIPE_SECRET_KEY`, `STRIPE_PRICE_STARTER/PRO/ELITE`, `SITE_URL`.

## Estructura
```
index, comunidad, eventos, planes, contacto   → web pública (estática, indexable)
robots.txt  sitemap.xml  llms.txt  manifest.webmanifest  → SEO/GEO
assets/css/styles.css  assets/js/main.js  assets/img/*   → marca y assets
miembros/                                       → plataforma privada (noindex)
  login  index(dashboard)  comunidad  eventos  directorio  recursos  beneficios  perfil  admin
  auth.js data.js shell.js admin.js billing.js config.js app.css   (config.js/billing.js: solo en perfil)
CLAUDE.md                                       → guía de arquitectura para agentes/devs
lib/server.mjs                                  → núcleo backend (Blob + JWT + bcrypt)
api/auth.mjs  api/db.mjs                         → API real de auth y datos
api/checkout.js  api/portal.js  api/stripe-webhook.js → Stripe (opcional)
```

## Cómo empezar (owner)
1. Entra a https://ethoslatam.com/miembros/login → **Crear cuenta**.
2. Regístrate con **sguerra304@gmail.com** y tu contraseña → entras directo como **admin**.
3. Desde **/miembros/admin** gestionas solicitudes, eventos, recursos, beneficios, miembros y el anuncio de la web.

## Pendiente / opcional
- **Stripe** (cobro real de planes): añade las claves en Vercel y los `price_id`. El checkout (`api/checkout.js`) y el portal (`api/portal.js`) ya están listos.
- **Login con Google / magic link:** requiere un proveedor de identidad (hoy es email + contraseña).
- **Notificación por email** al aprobar solicitudes: conectar Resend u otro proveedor.
- **Formularios públicos (FormSubmit):** reemplaza `REEMPLAZAR@TU-EMAIL.com` y los `href="#"` de redes en los footers.

## Desarrollo / deploy
```bash
vercel dev            # local con funciones (usa env del proyecto)
vercel deploy --prod  # desplegar
```
