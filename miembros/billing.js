/* =========================================================
   ETH FOUNDERS — Billing (Stripe real + demo)
   ========================================================= */
(function () {
  const cfg = window.ETH_CONFIG || {};
  const DEMO = cfg.DEMO || !cfg.STRIPE_PUBLISHABLE_KEY;

  async function startCheckout(plan) {
    if (DEMO) { window.EthShell && EthShell.toast("Modo demo: conecta Stripe para cobrar de verdad."); return; }
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
        ? "Estás en modo demo: la facturación real se activa al conectar tu cuenta de Stripe (ver checklist)."
        : "Pagos seguros gestionados con Stripe.";
    },
    changePlan() {
      // Llevar a la página pública de planes para elegir (allí se lanza el checkout).
      window.location.href = "../planes.html#planes";
    },
    async portal() {
      if (DEMO) { EthShell.toast("Modo demo: el portal de facturación se activa con Stripe."); return; }
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
