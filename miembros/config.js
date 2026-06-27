/* =========================================================
   ETH FOUNDERS — Config del área de miembros
   ---------------------------------------------------------
   Rellena estos valores para pasar de MODO DEMO a PRODUCCIÓN.
   Mientras SUPABASE_URL esté vacío, la app corre en modo demo
   (sesión y datos locales en el navegador) para poder probar
   toda la experiencia sin cuentas externas.
   ========================================================= */
window.ETH_CONFIG = {
  // 1) Supabase  → https://app.supabase.com  (Project Settings → API)
  SUPABASE_URL: "",            // ej: https://xxxx.supabase.co
  SUPABASE_ANON_KEY: "",       // anon public key

  // 2) Stripe (modo test primero) → https://dashboard.stripe.com
  //    Crea 3 precios recurrentes y pega aquí los price_id.
  STRIPE_PUBLISHABLE_KEY: "",  // pk_test_... o pk_live_...
  STRIPE_PRICES: {
    starter: "",               // price_xxx (Starter $29/mes)
    pro: "",                   // price_xxx (Pro $89/mes)
    elite: ""                  // price_xxx (Elite $249/mes)
  },

  // Se activa solo cuando NO hay Supabase configurado.
  get DEMO() { return !this.SUPABASE_URL || !this.SUPABASE_ANON_KEY; }
};
