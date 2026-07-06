import { createHash } from "crypto";

/**
 * Helpers de integración con Wompi (Colombia) — Web Checkout + Webhook de eventos.
 *
 * Variables de entorno requeridas (se configuran en Render):
 *   WOMPI_PUBLIC_KEY      — llave pública (pub_test_... / pub_prod_...)
 *   WOMPI_INTEGRITY_SECRET — secreto de integridad (para firmar el checkout)
 *   WOMPI_EVENTS_SECRET   — secreto de eventos (para validar el webhook)
 *   WOMPI_PRIVATE_KEY     — llave privada (opcional, para consultar transacciones)
 *
 * Docs: https://docs.wompi.co
 */

const CHECKOUT_BASE = "https://checkout.wompi.co/p/";
const CURRENCY = "COP";

export function wompiConfigured(): boolean {
  return Boolean(process.env.WOMPI_PUBLIC_KEY && process.env.WOMPI_INTEGRITY_SECRET);
}

/** Pesos colombianos → centavos (Wompi trabaja en centavos, entero). */
export function toCents(amountCOP: number): number {
  return Math.round(amountCOP * 100);
}

/**
 * Firma de integridad del checkout:
 *   SHA256(reference + amountInCents + currency + integritySecret)
 */
export function integritySignature(reference: string, amountInCents: number): string {
  const secret = process.env.WOMPI_INTEGRITY_SECRET ?? "";
  return createHash("sha256")
    .update(`${reference}${amountInCents}${CURRENCY}${secret}`)
    .digest("hex");
}

/** Construye la URL de Web Checkout a la que se redirige al usuario. */
export function buildCheckoutUrl(opts: {
  reference: string;
  amountInCents: number;
  redirectUrl: string;
  customerEmail?: string;
  customerName?: string;
}): string {
  const params = new URLSearchParams({
    "public-key": process.env.WOMPI_PUBLIC_KEY ?? "",
    currency: CURRENCY,
    "amount-in-cents": String(opts.amountInCents),
    reference: opts.reference,
    "signature:integrity": integritySignature(opts.reference, opts.amountInCents),
    "redirect-url": opts.redirectUrl,
  });
  if (opts.customerEmail) params.set("customer-data:email", opts.customerEmail);
  if (opts.customerName) params.set("customer-data:full-name", opts.customerName);
  return `${CHECKOUT_BASE}?${params.toString()}`;
}

/**
 * Valida el checksum de un evento de webhook de Wompi.
 * checksum = SHA256(concat(valores de signature.properties) + timestamp + eventsSecret)
 */
export function verifyEventChecksum(event: {
  data?: { transaction?: Record<string, unknown> };
  signature?: { properties?: string[]; checksum?: string };
  timestamp?: number;
}): boolean {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  if (!secret) return false;
  const properties = event.signature?.properties;
  const checksum = event.signature?.checksum;
  if (!Array.isArray(properties) || !checksum) return false;

  // Cada property es una ruta tipo "transaction.status" relativa a event.data
  let concatenated = "";
  for (const path of properties) {
    const value = path
      .split(".")
      .reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), event.data);
    concatenated += value == null ? "" : String(value);
  }
  concatenated += String(event.timestamp ?? "");
  concatenated += secret;

  const computed = createHash("sha256").update(concatenated).digest("hex");
  return computed.toLowerCase() === checksum.toLowerCase();
}

/** Mapea el método de pago de Wompi a las etiquetas internas de la app. */
export function mapWompiMethod(type?: string | null): string {
  switch ((type ?? "").toUpperCase()) {
    case "CARD":        return "CARD";
    case "NEQUI":       return "NEQUI";
    case "PSE":         return "PSE";
    case "BANCOLOMBIA_TRANSFER":
    case "BANCOLOMBIA_QR": return "TRANSFER";
    default:            return "WOMPI";
  }
}

/** Genera una referencia única para un pago (correlaciona el webhook). */
export function makeReference(paymentId: string): string {
  return `star-${paymentId}-${Date.now()}`;
}
