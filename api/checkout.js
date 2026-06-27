// Vercel Serverless Function — Crea una sesión de Stripe Checkout (suscripción)
// Requiere env: STRIPE_SECRET_KEY, STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO, STRIPE_PRICE_ELITE, SITE_URL
const Stripe = require("stripe");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: "Stripe no configurado (falta STRIPE_SECRET_KEY)." });

  try {
    const stripe = new Stripe(key);
    const { plan, email } = req.body || {};
    const prices = {
      starter: process.env.STRIPE_PRICE_STARTER,
      pro: process.env.STRIPE_PRICE_PRO,
      elite: process.env.STRIPE_PRICE_ELITE
    };
    const price = prices[plan] || prices.pro;
    if (!price) return res.status(400).json({ error: "Plan o precio no válido." });

    const site = process.env.SITE_URL || "https://ethoslatam.com";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: email || undefined,
      allow_promotion_codes: true,
      success_url: site + "/miembros/index.html?checkout=success",
      cancel_url: site + "/planes.html?checkout=cancel",
      metadata: { plan }
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
