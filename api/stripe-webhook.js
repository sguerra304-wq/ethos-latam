// Vercel Serverless Function — Webhook de Stripe → actualiza el plan en Supabase
// Requiere env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Configura el endpoint en Stripe: https://TU-DOMINIO/api/stripe-webhook
const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

// Stripe necesita el cuerpo SIN parsear para verificar la firma.
module.exports.config = { api: { bodyParser: false } };

function readRaw(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(Buffer.from(data)));
    req.on("error", reject);
  });
}

const PRICE_TO_PLAN = () => ({
  [process.env.STRIPE_PRICE_STARTER]: "Starter",
  [process.env.STRIPE_PRICE_PRO]: "Pro",
  [process.env.STRIPE_PRICE_ELITE]: "Elite"
});

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const key = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !whSecret) return res.status(500).end();

  const stripe = new Stripe(key);
  let event;
  try {
    const raw = await readRaw(req);
    event = stripe.webhooks.constructEvent(raw, req.headers["stripe-signature"], whSecret);
  } catch (e) {
    return res.status(400).send("Webhook signature error: " + e.message);
  }

  try {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const setPlan = async (email, plan, customerId) => {
      if (!email) return;
      await sb.from("profiles").update({ plan, stripe_customer_id: customerId }).eq("email", email);
    };

    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const plan = (s.metadata && s.metadata.plan) ? s.metadata.plan : "pro";
      const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
      await setPlan(s.customer_details && s.customer_details.email || s.customer_email, planName, s.customer);
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const sub = event.data.object;
      const priceId = sub.items && sub.items.data[0] && sub.items.data[0].price.id;
      const planName = PRICE_TO_PLAN()[priceId] || "Pro";
      const cust = await stripe.customers.retrieve(sub.customer);
      await setPlan(cust.email, sub.status === "active" || sub.status === "trialing" ? planName : "Starter", sub.customer);
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const cust = await stripe.customers.retrieve(sub.customer);
      await setPlan(cust.email, "Starter", sub.customer);
    }
    return res.status(200).json({ received: true });
  } catch (e) {
    return res.status(500).send(e.message);
  }
};
