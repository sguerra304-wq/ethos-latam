// ETHOS LATAM — Cobro de membresía (Mercado Pago).
// El pago se solicita SOLO cuando el admin ACEPTA una solicitud (op "acceptApp"),
// nunca antes. Se usa el "link de pago" personal de Mercado Pago: el pagador abre
// el link, ingresa el monto que indica el correo y paga con tarjeta / Yape / transferencia.
// Es real y funcional; el dinero entra directo a la cuenta de Mercado Pago de Sebastián.
//
// PARA CAMBIAR EL PRECIO O LA MONEDA: edita PLAN_PRECIO aquí abajo (una sola vez).
// Nota: el link personal de MP Perú procesa en SOLES; por eso el correo indica el
// importe exacto a ingresar. Si quieres cobrar en soles, cambia "US$199" por "S/ 199", etc.

export const MP_LINK = process.env.MP_LINK || "https://link.mercadopago.com.pe/sguerra00";

export const PLAN_PRECIO = {
  Starter: { nombre: "Starter", monto: "US$99",  periodo: "/mes" },
  Pro:     { nombre: "Pro",     monto: "US$199", periodo: "/mes" },
  Elite:   { nombre: "Elite",   monto: "US$399", periodo: "/mes" }
};

// Devuelve el precio del plan (con Pro como defecto seguro).
export function precioDe(plan) {
  return PLAN_PRECIO[plan] || PLAN_PRECIO.Pro;
}
