/**
 * Utilidades de fecha para el ciclo de cobros.
 *
 * PROBLEMA QUE RESUELVE
 * ─────────────────────
 * El servidor corre en UTC (Render) y los clubes están en Colombia (UTC-5).
 * Eso producía dos errores visibles para el admin:
 *
 *  1. `new Date("2026-09-22")` se interpreta como medianoche UTC, que en
 *     Colombia es el 21 a las 7 p.m. → `.getDate()` devolvía 21, no 22.
 *     Así, el "día de pago" de cada deportista quedaba corrido un día.
 *
 *  2. Un cobro con vencimiento hoy se guardaba como hoy 00:00, y el barrido
 *     `dueDate < now` lo marcaba VENCIDO apenas empezaba el día — de hecho a
 *     las 7 p.m. del día anterior, hora Colombia. El acudiente nunca tuvo
 *     margen para pagar.
 *
 * REGLA DE NEGOCIO
 * ────────────────
 * Un cobro está vencido cuando TERMINA su día de vencimiento en la zona
 * horaria del club. Durante todo el día de vencimiento el cobro está
 * "vence hoy", no "vencido".
 */

/** Zona horaria por defecto de los clubes. */
export const CLUB_TIMEZONE = "America/Bogota";

/** Indicativo telefónico por país ISO. Usado para armar enlaces de WhatsApp. */
const DIAL_CODES: Record<string, string> = {
  CO: "57", MX: "52", AR: "54", CL: "56", PE: "51", EC: "593",
  VE: "58", BO: "591", PY: "595", UY: "598", BR: "55", PA: "507",
  CR: "506", GT: "502", HN: "504", SV: "503", NI: "505", DO: "1",
  US: "1", ES: "34",
};

/** Indicativo del país del club (por defecto Colombia). */
export function dialCode(country?: string | null): string {
  return DIAL_CODES[(country ?? "CO").toUpperCase()] ?? "57";
}

/**
 * Lee una fecha "YYYY-MM-DD" (de un <input type="date">) como día calendario,
 * sin que la zona horaria la corra al día anterior.
 *
 * `new Date("2026-09-22")`   → Sep 21 19:00 en Colombia  ❌
 * `parseDateOnly("2026-09-22")` → Sep 22 00:00 local     ✅
 */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/**
 * Día del mes de una fecha "YYYY-MM-DD", sin corrimiento.
 * Es el reemplazo directo de `new Date(str).getDate()`.
 */
export function dayOfMonthFromDateOnly(value: string): number {
  return parseDateOnly(value).getDate();
}

/** Formatea una fecha como "YYYY-MM-DD" usando sus componentes locales. */
export function toDateOnlyString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Partes de calendario (año/mes/día) de un instante, leídas en la zona del club.
 * Funciona igual en el servidor (UTC) que en el navegador del admin.
 */
export function clubCalendarParts(
  instant: Date = new Date(),
  timeZone: string = CLUB_TIMEZONE,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Día del mes de "hoy" en la zona del club. */
export function clubToday(timeZone: string = CLUB_TIMEZONE): Date {
  const { year, month, day } = clubCalendarParts(new Date(), timeZone);
  return new Date(year, month - 1, day);
}

/**
 * El instante a partir del cual un cobro con este vencimiento cuenta como
 * VENCIDO: el final del día de vencimiento (23:59:59.999).
 *
 * Es el corazón del arreglo. El barrido de vencidos compara contra esto en vez
 * de contra `dueDate` pelado.
 */
export function endOfDueDay(dueDate: Date | string): Date {
  const d = new Date(dueDate);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/**
 * Fecha de corte para el barrido de vencidos: todo cobro cuyo `dueDate` sea
 * ANTERIOR a este instante ya terminó su día de gracia.
 *
 * Se usa como `dueDate: { lt: overdueCutoff() }`. Equivale a "el inicio de hoy
 * en hora del club": un cobro que vence hoy queda fuera, uno de ayer entra.
 */
export function overdueCutoff(timeZone: string = CLUB_TIMEZONE): Date {
  return clubToday(timeZone);
}

/** Días calendario entre el vencimiento y hoy. Negativo = ya pasó. */
export function daysUntilDue(dueDate: Date | string, timeZone: string = CLUB_TIMEZONE): number {
  const due = new Date(dueDate);
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = clubToday(timeZone);
  return Math.round((dueMidnight.getTime() - today.getTime()) / 86_400_000);
}

export type DueState = "overdue" | "today" | "tomorrow" | "upcoming";

/**
 * Estado de un cobro para mostrar en pantalla.
 *
 * Nota: se apoya en los días de calendario, NO en el estado guardado, para que
 * un cobro que vence hoy nunca se pinte de rojo aunque la base todavía diga
 * OVERDUE por un barrido viejo.
 */
export function dueState(dueDate: Date | string, timeZone: string = CLUB_TIMEZONE): DueState {
  const days = daysUntilDue(dueDate, timeZone);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return "upcoming";
}

/** ¿Este cobro ya terminó su día de vencimiento? */
export function isOverdue(dueDate: Date | string, timeZone: string = CLUB_TIMEZONE): boolean {
  return daysUntilDue(dueDate, timeZone) < 0;
}

/**
 * Etiqueta para el admin. Reemplaza el viejo "Vencido 0d", que aparecía el
 * mismo día del vencimiento y hacía pensar que el alumno estaba en mora.
 */
export function dueLabel(dueDate: Date | string, timeZone: string = CLUB_TIMEZONE): string {
  const days = daysUntilDue(dueDate, timeZone);
  if (days < 0) {
    const n = Math.abs(days);
    return n === 1 ? "Vencido ayer" : `Vencido hace ${n} días`;
  }
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  const d = new Date(dueDate);
  return `Vence ${d.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`;
}

/** Color semántico de la etiqueta: rojo solo cuando de verdad está en mora. */
export function dueColor(dueDate: Date | string, timeZone: string = CLUB_TIMEZONE): string {
  switch (dueState(dueDate, timeZone)) {
    case "overdue": return "var(--error)";
    case "today":   return "var(--warning)";
    default:        return "var(--text-muted)";
  }
}

/**
 * Construye la fecha de vencimiento del mes indicado respetando el día de pago
 * del deportista, recortando a fin de mes cuando haga falta
 * (día 31 en un mes de 30 → día 30, no se desborda al mes siguiente).
 */
export function buildDueDate(year: number, monthIndex: number, paymentDay: number): Date {
  const normalizedYear = year + Math.floor(monthIndex / 12);
  const normalizedMonth = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(normalizedYear, normalizedMonth + 1, 0).getDate();
  return new Date(normalizedYear, normalizedMonth, Math.min(paymentDay, lastDay));
}

/**
 * Próximo vencimiento a partir de hoy para un día de pago dado.
 * Si el día de pago de este mes todavía no ha pasado, usa este mes; si ya pasó,
 * el siguiente. Un cobro que vence HOY sigue siendo válido para hoy.
 */
export function nextDueDate(paymentDay: number, timeZone: string = CLUB_TIMEZONE): Date {
  const today = clubToday(timeZone);
  const thisMonth = buildDueDate(today.getFullYear(), today.getMonth(), paymentDay);
  if (thisMonth.getTime() >= today.getTime()) return thisMonth;
  return buildDueDate(today.getFullYear(), today.getMonth() + 1, paymentDay);
}

/** Saludo según la hora real del club, no la del servidor. */
export function clubGreeting(timeZone: string = CLUB_TIMEZONE): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false }).format(new Date()),
  );
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Rango [inicio, fin] del mes calendario actual en hora del club. */
export function currentMonthRange(timeZone: string = CLUB_TIMEZONE): { start: Date; end: Date } {
  const today = clubToday(timeZone);
  return {
    start: new Date(today.getFullYear(), today.getMonth(), 1),
    end: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}
