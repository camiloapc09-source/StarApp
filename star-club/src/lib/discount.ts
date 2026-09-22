/**
 * Descuento por pronto pago.
 *
 * ESTADO ANTERIOR
 * ───────────────
 * El club podía configurar `earlyPaymentDays` y `earlyPaymentDiscount` en
 * Ajustes, y la pantalla de cobros mostraba un letrero anunciando el descuento
 * ("Descuento por pronto pago activo · $10.000")… pero el descuento NO se
 * aplicaba en ninguna parte. Al registrar el pago se cobraba el monto completo.
 * La app prometía algo que no cumplía.
 *
 * Además el letrero calculaba la ventana con el día del mes del CLUB
 * (`billingCycleDay`), ignorando que cada deportista tiene su propio día de
 * pago según su fecha de ingreso. Para un alumno que paga el día 3, una ventana
 * basada en el día 15 del club no significaba nada.
 *
 * LA REGLA
 * ────────
 * El esquema lo define así: `earlyPaymentDays` = "días después del inicio del
 * ciclo para obtener el descuento". El cobro vence el día de pago del alumno,
 * que es cuando arranca su ciclo. Entonces:
 *
 *   Hay descuento si el pago se registra ANTES de que pasen
 *   `earlyPaymentDays` días desde el vencimiento del cobro.
 *
 * Pagar adelantado (antes del vencimiento) también cuenta: es pronto pago por
 * definición.
 *
 * Ejemplo Ball Breakers (ciclo día 15, 5 días, $10.000):
 *   vence el 15 → pagando del 10 al 19 hay descuento; del 20 en adelante no.
 *
 * Para Star Club los valores están en 0, así que no aplica nada.
 */

import { daysUntilDue, CLUB_TIMEZONE } from "@/lib/dates";

export interface DiscountConfig {
  earlyPaymentDays?: number | null;
  earlyPaymentDiscount?: number | null;
}

export interface DiscountResult {
  /** ¿Este cobro califica para el descuento en este momento? */
  applies: boolean;
  /** Valor del descuento en COP. 0 si no aplica. */
  amount: number;
  /** Lo que quedaría por pagar tras el descuento. */
  finalAmount: number;
  /** Días que faltan para que se cierre la ventana. Negativo = ya cerró. */
  daysLeft: number;
  /** Último día (inclusive) en que se puede pagar con descuento. */
  deadline: Date | null;
}

/** ¿El club tiene el descuento configurado? */
export function isDiscountEnabled(config: DiscountConfig): boolean {
  return (config.earlyPaymentDays ?? 0) > 0 && (config.earlyPaymentDiscount ?? 0) > 0;
}

/**
 * Evalúa el descuento para un cobro concreto.
 *
 * @param dueDate  Vencimiento del cobro (inicio del ciclo de ese alumno).
 * @param amount   Monto del cobro.
 * @param paidOn   Cuándo se paga. Por defecto, hoy.
 */
export function evaluateDiscount(
  dueDate: Date | string,
  amount: number,
  config: DiscountConfig,
  paidOn?: Date | string | null,
  timeZone: string = CLUB_TIMEZONE,
): DiscountResult {
  const none: DiscountResult = {
    applies: false, amount: 0, finalAmount: amount, daysLeft: 0, deadline: null,
  };

  const windowDays = config.earlyPaymentDays ?? 0;
  const discount = config.earlyPaymentDiscount ?? 0;
  if (windowDays <= 0 || discount <= 0) return none;

  const due = new Date(dueDate);
  // Último día con descuento: el vencimiento más (ventana - 1).
  const deadline = new Date(due.getFullYear(), due.getMonth(), due.getDate() + windowDays - 1);

  // Días transcurridos desde el vencimiento hasta el día del pago.
  // `daysUntilDue` devuelve negativo cuando la fecha ya pasó, por eso el signo.
  const daysSinceDue = paidOn
    ? Math.round(
        (new Date(new Date(paidOn).getFullYear(), new Date(paidOn).getMonth(), new Date(paidOn).getDate()).getTime()
          - new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()) / 86_400_000,
      )
    : -daysUntilDue(due, timeZone);

  const applies = daysSinceDue < windowDays;
  if (!applies) return { ...none, daysLeft: windowDays - daysSinceDue, deadline };

  // El descuento nunca puede dejar el cobro en cero o en negativo.
  const effective = Math.min(discount, Math.max(0, amount - 1));
  if (effective <= 0) return { ...none, deadline };

  return {
    applies: true,
    amount: effective,
    finalAmount: amount - effective,
    daysLeft: windowDays - daysSinceDue,
    deadline,
  };
}

/** Texto corto para mostrarle al acudiente o al admin. */
export function discountLabel(result: DiscountResult): string | null {
  if (!result.applies) return null;
  const money = `$${result.amount.toLocaleString("es-CO")}`;
  if (result.daysLeft === 1) return `${money} de descuento — último día`;
  return `${money} de descuento si pagas en ${result.daysLeft} días`;
}
