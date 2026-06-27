/* ETH FOUNDERS — interactions */
(function () {
  "use strict";

  /* Header shadow on scroll */
  const header = document.querySelector(".site-header");
  const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile nav */
  const toggle = document.querySelector(".nav-toggle");
  if (toggle && header) {
    toggle.addEventListener("click", () => header.classList.toggle("open"));
    header.querySelectorAll(".nav-links a").forEach((a) =>
      a.addEventListener("click", () => header.classList.remove("open"))
    );
  }

  /* Reveal on scroll */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((r) => io.observe(r));
  } else {
    reveals.forEach((r) => r.classList.add("in"));
  }

  /* FAQ accordion */
  document.querySelectorAll(".faq-item").forEach((item) => {
    const q = item.querySelector(".faq-q");
    const a = item.querySelector(".faq-a");
    if (!q || !a) return;
    q.addEventListener("click", () => {
      const open = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach((o) => {
        o.classList.remove("open");
        const oa = o.querySelector(".faq-a");
        if (oa) oa.style.maxHeight = null;
      });
      if (!open) {
        item.classList.add("open");
        a.style.maxHeight = a.scrollHeight + "px";
      }
    });
  });

  /* Pricing toggle */
  const sw = document.querySelector(".switch");
  if (sw) {
    const labMonth = document.querySelector("[data-lab=month]");
    const labYear = document.querySelector("[data-lab=year]");
    const setMode = (year) => {
      sw.classList.toggle("year", year);
      labMonth && labMonth.classList.toggle("on", !year);
      labYear && labYear.classList.toggle("on", year);
      document.querySelectorAll("[data-month]").forEach((el) => {
        el.textContent = year ? el.dataset.year : el.dataset.month;
      });
      document.querySelectorAll("[data-note-month]").forEach((el) => {
        el.textContent = year ? el.dataset.noteYear : el.dataset.noteMonth;
      });
    };
    sw.addEventListener("click", () => setMode(!sw.classList.contains("year")));
    labMonth && labMonth.addEventListener("click", () => setMode(false));
    labYear && labYear.addEventListener("click", () => setMode(true));
  }

  /* Count-up numbers when they scroll into view */
  const counters = document.querySelectorAll(".stat .n, .impact-grid .ig .n, .floating-stat .n");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (counters.length && "IntersectionObserver" in window && !reduceMotion) {
    const animate = (el) => {
      const raw = el.textContent.trim();
      const m = raw.match(/^(\D*)([\d.,]+)(.*)$/);
      if (!m) return;
      const prefix = m[1], suffix = m[3];
      const clean = m[2].replace(/,/g, "");
      const decimals = (clean.split(".")[1] || "").length;
      const target = parseFloat(clean);
      if (isNaN(target)) return;
      const dur = 1400, t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = (target * eased).toFixed(decimals);
        el.textContent = prefix + (decimals ? val : Math.round(val).toLocaleString("es-ES")) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = raw;
      };
      requestAnimationFrame(tick);
    };
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { animate(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    counters.forEach((c) => cio.observe(c));
  }

  /* Testimonials infinite carousel — duplicate cards for seamless loop */
  const track = document.querySelector(".testi-track");
  if (track) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      Array.from(track.children).forEach((card) => {
        const clone = card.cloneNode(true);
        clone.classList.add("dup");
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      });
    }
  }

  /* Footer year */
  const y = document.querySelector("[data-current-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* Pointer-following glow on cards (desktop only) */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const glowSel = ".card, .plan, .quote-card";
    document.addEventListener("pointermove", (e) => {
      const t = e.target.closest(glowSel);
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty("--mx", (e.clientX - r.left) + "px");
      t.style.setProperty("--my", (e.clientY - r.top) + "px");
    }, { passive: true });
  }

  /* Newsletter (.news) → backend real (api/public) */
  document.querySelectorAll("form.news").forEach((f) => {
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = f.querySelector('input[type="email"]');
      const email = ((input && input.value) || "").trim();
      if (!email) return;
      const btn = f.querySelector("button"); if (btn) btn.disabled = true;
      try {
        const r = await fetch("/api/public?action=subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        f.innerHTML = `<p style="font-family:var(--font-display); font-weight:600; color:${r.ok ? "var(--lime-deep)" : "var(--coral)"}; padding:6px 0">${r.ok ? "✅ ¡Suscrito! Te escribiremos pronto." : "Hubo un problema, intenta de nuevo."}</p>`;
      } catch (err) { if (btn) btn.disabled = false; }
    });
  });

  /* Formulario de aplicación (contacto) → backend real → panel admin */
  const applyForm = document.getElementById("applyForm");
  if (applyForm) {
    applyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const g = (n) => { const el = applyForm.querySelector(`[name="${n}"]`); return el ? el.value.trim() : ""; };
      if (g("_honey")) return; // honeypot anti-spam
      const payload = { name: g("Nombre"), email: g("Email"), company: g("Empresa"), role: g("Rol"), plan: g("Plan de interés"), link: g("Web/LinkedIn"), msg: g("Mensaje") };
      const btn = applyForm.querySelector('button[type="submit"]'); if (btn) { btn.disabled = true; btn.textContent = "Enviando…"; }
      try {
        const r = await fetch("/api/public?action=apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!r.ok) throw new Error();
        applyForm.innerHTML = '<div style="text-align:center; padding:34px 10px"><div style="font-size:46px">✅</div><h3 style="margin:12px 0 6px">¡Solicitud enviada!</h3><p class="muted">Revisamos cada solicitud con atención y te respondemos en 48–72h. Gracias por tu interés en Ethos LATAM.</p></div>';
      } catch (err) { if (btn) { btn.disabled = false; btn.textContent = "Enviar solicitud"; } alert("No se pudo enviar. Inténtalo de nuevo o escríbenos a hola@ethoslatam.com"); }
    });
  }

  /* Scroll progress bar */
  const prog = document.createElement("div");
  prog.className = "scroll-prog";
  prog.innerHTML = "<i></i>";
  document.body.insertBefore(prog, document.body.firstChild);
  const bar = prog.firstChild;
  const updateProg = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
  };
  updateProg();
  window.addEventListener("scroll", updateProg, { passive: true });
  window.addEventListener("resize", updateProg);
})();
