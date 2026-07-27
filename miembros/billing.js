/* =========================================================
   ETHOS LATAM — Billing. Hoy el cobro real se hace por Mercado Pago desde el
   panel de admin (ver lib/pagos.mjs); este módulo solo cambia el plan del
   miembro. Las ramas de Stripe quedan inactivas (DEMO) hasta que se configure.
   ========================================================= */
(function () {
  const cfg = window.ETH_CONFIG || {};
  const DEMO = cfg.DEMO || !cfg.STRIPE_PUBLISHABLE_KEY;

  async function startCheckout(plan) {
    if (DEMO) { window.EthShell && EthShell.toast("Escríbenos y coordinamos el cobro por Mercado Pago."); return; }
    const user = await window.EthAuth.getUser();
    const res = await fetch("/api/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, email: user && user.email })
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else EthShell.toast(data.error || "No se pudo iniciar el pago.");
  }

  window.EthBilling = {
    DEMO,
    note() {
      return DEMO
        ? "El cambio de plan es inmediato. El ajuste del cobro se coordina con el equipo por Mercado Pago."
        : "Pagos seguros gestionados por la pasarela de pago.";
    },
    changePlan() {
      const PLANS = [["Starter", "US$99/mes", "Comunidad + eventos abiertos + recursos"], ["Pro", "US$199/mes", "Todo + masterminds + wellness + networking 1:1"], ["Elite", "US$399/mes", "Todo + retiros + inversionistas + concierge"]];
      let modal = document.getElementById("planModal");
      if (!modal) {
        modal = document.createElement("div"); modal.className = "modal"; modal.id = "planModal";
        modal.innerHTML = '<div class="modal-card"><h3 style="margin-bottom:16px">Elige tu plan</h3><div id="planOpts" style="display:grid;gap:10px"></div><div class="modal-actions" style="margin-top:16px"><button class="btn btn-ghost" data-close>Cancelar</button></div></div>';
        document.body.appendChild(modal);
        modal.addEventListener("click", (e) => { if (e.target === modal || e.target.closest("[data-close]")) modal.classList.remove("on"); });
        modal.querySelector("#planOpts").addEventListener("click", async (e) => {
          const b = e.target.closest("[data-plan]"); if (!b) return;
          const plan = b.dataset.plan;
          if (!DEMO) { modal.classList.remove("on"); return startCheckout(plan.toLowerCase()); }
          const r = await window.EthData.setMyPlan(plan);
          modal.classList.remove("on");
          if (r.ok) { EthShell.toast("Plan actualizado a " + plan + " ✦"); setTimeout(() => location.reload(), 700); }
          else EthShell.toast(r.error || "No se pudo cambiar el plan.");
        });
      }
      window.EthAuth.getUser().then((u) => {
        const cur = (u && u.plan) || "Pro";
        modal.querySelector("#planOpts").innerHTML = PLANS.map(([p, pr, d]) =>
          `<button class="plan-opt${p === cur ? " on" : ""}" data-plan="${p}"><div><b>${p}</b><span class="po-desc">${d}</span></div><span class="po-price">${pr}${p === cur ? " · Actual" : ""}</span></button>`).join("");
        modal.classList.add("on");
      });
    },
    async portal() {
      if (DEMO) { EthShell.toast("Para cambios de facturación, escríbenos a hola@ethoslatam.com."); return; }
      const user = await window.EthAuth.getUser();
      const res = await fetch("/api/portal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user && user.email })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else EthShell.toast(data.error || "No se pudo abrir el portal.");
    },
    startCheckout
  };
})();
