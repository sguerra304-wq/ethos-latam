// Vercel Serverless Function — Abre el portal de facturación de Stripe
// Requiere env: STRIPE_SECRET_KEY, SITE_URL
const Stripe = require("stripe");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: "Stripe no configurado." });

  try {
    const stripe = new Stripe(key);
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "Falta el email." });

    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) return res.status(404).json({ error: "No encontramos una suscripción para este email." });

    const site = process.env.SITE_URL || "https://ethoslatam.com";
    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: site + "/miembros/perfil.html"
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
