/* =========================================================
   ETH FOUNDERS — App shell (sidebar + topbar) + guard
   ========================================================= */
(function () {
  const ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    comunidad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    beneficios: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    eventos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke-linecap="round"/></svg>',
    directorio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    recursos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    perfil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mensajes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l8 4v6c0 4-3 7-8 8-5-1-8-4-8-8V6l8-4z" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    grupo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3" stroke-linecap="round"/></svg>'
  };
  const NAV = [
    { key: "dashboard", href: "index.html", label: "Inicio" },
    { key: "comunidad", href: "comunidad.html", label: "Comunidad" },
    { key: "mensajes", href: "mensajes.html", label: "Mensajes" },
    { key: "eventos", href: "eventos.html", label: "Eventos" },
    { key: "directorio", href: "directorio.html", label: "Directorio" },
    { key: "grupo", href: "grupo.html", label: "Mi grupo" },
    { key: "recursos", href: "recursos.html", label: "Recursos" },
    { key: "beneficios", href: "beneficios.html", label: "Beneficios" },
    { key: "perfil", href: "perfil.html", label: "Perfil" }
  ];
  const BRAND = '<a href="index.html" class="brand"><svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="sg" x1="0" y1="64" x2="64" y2="0"><stop offset="0" stop-color="#C7FB4F"/><stop offset="1" stop-color="#7B5CFF"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="#0E1014"/><path d="M8 38 H20 L26 24 L34 46 L40 30 L44 38 H52" fill="none" stroke="url(#sg)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 30 L54 24M44 24 H54 V34" fill="none" stroke="#C7FB4F" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Ethos <b>LATAM</b></a>';

  window.EthShell = {
    async mount(active) {
      const user = await window.EthAuth.requireAuth();
      if (!user) return null;
      const app = document.getElementById("app");

      let snap = {};
      try { if (window.EthData) snap = await window.EthData.refresh(); } catch (e) {}
      const unreadDm = (snap.myDms || []).reduce((a, c) => a + (c.unread || 0), 0);

      const items = NAV.slice();
      if (user.isAdmin) items.push({ key: "admin", href: "admin.html", label: "Admin" });
      const navHtml = items.map((n) => {
        const badge = (n.key === "mensajes" && unreadDm) ? `<span class="nav-badge">${unreadDm}</span>` : "";
        return `<a href="${n.href}" class="${n.key === active ? "active" : ""}">${ICONS[n.key]}<span>${n.label}</span>${badge}</a>`;
      }).join("");

      const sidebar = document.createElement("aside");
      sidebar.className = "sidebar";
      sidebar.innerHTML =
        `<div>${BRAND}</div>
         <nav class="side-nav">${navHtml}</nav>
         <div class="side-foot">
           <div class="user-card">
             <span class="av" ${this.avatarStyle(user.avatar)}>${user.initials || "ET"}</span>
             <div class="ui"><b>${user.name || "Founder"}</b><span>Plan ${user.plan || "Pro"}</span></div>
           </div>
           <button class="side-logout" id="ethLogout">${ICONS.logout} Cerrar sesión</button>
         </div>`;

      const unreadN = snap.unreadNotifs || 0;
      const topbar = document.createElement("header");
      topbar.className = "app-head";
      topbar.innerHTML =
        `<button class="ham" id="ethHam" aria-label="Menú"><span></span><span></span><span></span></button>
         <div class="gsearch">${ICONS.search}
           <input id="gq" type="search" placeholder="Buscar miembros, eventos, recursos…" autocomplete="off" aria-label="Buscar">
           <div class="gpanel" id="gpanel"></div>
         </div>
         <button class="bell" id="ethBell" aria-label="Notificaciones">${ICONS.bell}<span class="bell-dot" id="bellDot"${unreadN ? "" : " hidden"}></span></button>
         <div class="npanel" id="npanel"></div>`;

      const scrim = document.createElement("div");
      scrim.className = "scrim";

      // structure: app > sidebar + (topbar + main)
      const main = app.querySelector(".app-main");
      const right = document.createElement("div");
      app.insertBefore(sidebar, main);
      app.insertBefore(scrim, main);
      app.insertBefore(right, main);
      right.appendChild(topbar);
      right.appendChild(main);

      document.getElementById("ethLogout").onclick = () => window.EthAuth.signOut();
      const setNav = (o) => {
        app.classList.toggle("nav-open", o);
        // inline !important = prioridad absoluta (a prueba de conflictos de cascade)
        if (o) sidebar.style.setProperty("left", "0px", "important");
        else sidebar.style.removeProperty("left");
        scrim.style.setProperty("opacity", o ? "1" : "0", "important");
        scrim.style.setProperty("pointer-events", o ? "auto" : "none", "important");
      };
      const ham = document.getElementById("ethHam");
      if (ham) ham.onclick = () => setNav(!app.classList.contains("nav-open"));
      scrim.onclick = () => setNav(false);
      sidebar.querySelectorAll(".side-nav a").forEach((a) => a.addEventListener("click", () => setNav(false)));
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") setNav(false); });

      this._wireHeader(snap);
      this._fx(app);
      app.classList.add("ready"); // shell montado → mostrar todo de golpe (sin saltos de layout)
      return user;
    },

    /* Buscador global + campana de notificaciones (barra superior) */
    _wireHeader(snap) {
      const esc = (s) => (s == null ? "" : String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])));
      const rel = (ts) => {
        if (!ts) return "";
        const s = Math.floor((Date.now() - ts) / 1000);
        if (s < 60) return "ahora"; if (s < 3600) return Math.floor(s / 60) + " min";
        if (s < 86400) return Math.floor(s / 3600) + " h"; return Math.floor(s / 86400) + " d";
      };
      // ----- buscador global (sobre el snapshot ya cargado) -----
      const gq = document.getElementById("gq"), gpanel = document.getElementById("gpanel");
      const members = snap.members || [], events = snap.events || [], resources = snap.resources || [], perks = snap.perks || [];
      const run = () => {
        const term = gq.value.trim().toLowerCase();
        if (!term) { gpanel.classList.remove("on"); gpanel.innerHTML = ""; return; }
        const out = [];
        members.forEach((m) => { if (((m.name || "") + " " + (m.company || "") + " " + (m.role || "") + " " + (m.sector || "") + " " + (m.offers || "") + " " + (m.asks || "")).toLowerCase().includes(term)) out.push({ g: "Miembro", t: m.name, s: [m.role, m.company].filter(Boolean).join(" · "), href: "directorio.html" }); });
        events.forEach((e) => { if (((e.title || "") + " " + (e.city || "") + " " + (e.type || "")).toLowerCase().includes(term)) out.push({ g: "Evento", t: e.title, s: [e.type, e.city].filter(Boolean).join(" · "), href: "eventos.html" }); });
        resources.forEach((r) => { if (((r.title || "") + " " + (r.cat || "")).toLowerCase().includes(term)) out.push({ g: "Recurso", t: r.title, s: r.cat || "", href: "recursos.html" }); });
        perks.forEach((p) => { if (((p.title || "") + " " + (p.partner || "")).toLowerCase().includes(term)) out.push({ g: "Beneficio", t: p.title, s: p.partner || "", href: "beneficios.html" }); });
        gpanel.innerHTML = out.length
          ? out.slice(0, 8).map((r) => `<a class="gitem" href="${r.href}"><span class="gg">${r.g}</span><span class="gt">${esc(r.t)}</span><span class="gs">${esc(r.s)}</span></a>`).join("")
          : '<div class="gempty">Sin resultados para “' + esc(gq.value) + '”</div>';
        gpanel.classList.add("on");
      };
      if (gq) { gq.addEventListener("input", run); gq.addEventListener("focus", () => { if (gq.value) run(); }); }
      // ----- campana -----
      const bell = document.getElementById("ethBell"), npanel = document.getElementById("npanel"), dot = document.getElementById("bellDot");
      let notifs = snap.notifications || [];
      const renderN = () => {
        npanel.innerHTML = '<div class="nhead">Notificaciones</div>' + (notifs.length
          ? notifs.slice(0, 14).map((n) => `<a class="nitem ${n.read ? "" : "unread"}" href="${esc(n.href || "index.html")}">${esc(n.text)}<time>${rel(n.ts)}</time></a>`).join("")
          : '<div class="gempty">Sin notificaciones todavía.</div>');
      };
      renderN();
      if (bell) bell.addEventListener("click", async (e) => {
        e.stopPropagation();
        const open = npanel.classList.toggle("on");
        if (gpanel) gpanel.classList.remove("on");
        if (open && notifs.some((n) => !n.read)) {
          try { await window.EthData.markNotifsRead(); } catch (err) {}
          notifs.forEach((n) => (n.read = true)); renderN();
          if (dot) dot.hidden = true;
        }
      });
      document.addEventListener("click", (e) => {
        if (gpanel && !e.target.closest(".gsearch")) gpanel.classList.remove("on");
        if (npanel && !e.target.closest(".bell") && !e.target.closest(".npanel")) npanel.classList.remove("on");
      });
    },

    /* Premium FX: solo glow sutil que sigue el cursor (sin animaciones de entrada ni count-up) */
    _fx(app) {
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        const sel = ".mcard,.perk,.panel,.kpi,.ov-card,.post,.rcard,.ev-item,.admin-row";
        app.addEventListener("pointermove", (e) => {
          const t = e.target.closest(sel); if (!t) return;
          const r = t.getBoundingClientRect();
          t.style.setProperty("--mx", (e.clientX - r.left) + "px");
          t.style.setProperty("--my", (e.clientY - r.top) + "px");
        }, { passive: true });
      }
    },

    toast(text) {
      let t = document.querySelector(".toast");
      if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
      t.textContent = text;
      t.classList.add("show");
      clearTimeout(this._tt);
      this._tt = setTimeout(() => t.classList.remove("show"), 2600);
    },

    fmtDate(iso) {
      const d = new Date(iso + "T00:00:00");
      return { day: d.getDate(), mon: ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"][d.getMonth()] };
    },

    /* Devuelve el atributo style para pintar un avatar como foto (o "" si no hay). */
    avatarStyle(url) {
      return url ? `style="background-image:url('${String(url).replace(/'/g, "%27")}');background-size:cover;background-position:center;color:transparent"` : "";
    },

    /* Presencia a partir de lastSeen (ms). <5min = en línea. */
    presence(ts) {
      if (!ts) return { label: "", online: false };
      const s = Math.floor((Date.now() - ts) / 1000);
      if (s < 300) return { label: "En línea", online: true };
      if (s < 3600) return { label: "activo hace " + Math.floor(s / 60) + " min", online: false };
      if (s < 86400) return { label: "activo hace " + Math.floor(s / 3600) + " h", online: false };
      if (s < 604800) return { label: "activo hace " + Math.floor(s / 86400) + " d", online: false };
      return { label: "", online: false };
    },

    /* Tiempo relativo a partir de un timestamp (ms); fallback al texto dado. */
    relTime(ts, fallback) {
      if (!ts) return fallback || "";
      const s = Math.floor((Date.now() - ts) / 1000);
      if (s < 60) return "ahora";
      if (s < 3600) return "hace " + Math.floor(s / 60) + " min";
      if (s < 86400) return "hace " + Math.floor(s / 3600) + " h";
      if (s < 604800) return "hace " + Math.floor(s / 86400) + " d";
      return new Date(ts).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    }
  };
})();
