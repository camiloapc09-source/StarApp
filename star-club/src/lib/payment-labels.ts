/** Nombre en español de cada método de pago, para mostrarlo a las familias. */
export const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  CARD: "Tarjeta",
  PSE: "PSE",
  WOMPI: "Pago en línea",
};

export function methodLabel(method: string | null | undefined): string {
  if (!method) return "";
  return METHOD_LABELS[method] ?? method.charAt(0) + method.slice(1).toLowerCase();
}
