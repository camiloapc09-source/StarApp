/**
 * Tema visual por club.
 *
 * Cada club guarda 3 colores (principal, secundario y fondo). Con eso se
 * sobrescriben las variables `--brand*` de globals.css y TODA la app toma sus
 * colores: los demás tonos (claro, oscuro, brillo, tarjetas) se derivan en CSS
 * con color-mix, así que no hay que tocar cada pantalla.
 *
 * Las variables se ponen en `:root` a propósito: `--accent` se define ahí como
 * `var(--brand)`, y si `--brand` se cambiara en un elemento hijo, `--accent`
 * ya vendría resuelto con el valor viejo.
 */

export type ClubBrand = {
  brandPrimary?: string | null;
  brandSecondary?: string | null;
  brandBackground?: string | null;
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

/** Luminancia relativa (WCAG) de un color #RRGGBB. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Texto que se lee sobre el color principal: oscuro sobre colores claros
 * (el dorado de Ballbreakers), blanco sobre colores oscuros (el lila de Star).
 */
export function onColor(hex: string): string {
  return luminance(hex) > 0.4 ? "#0B0B14" : "#FFFFFF";
}

/** CSS a inyectar en un <style>. Vacío si el club no tiene marca. */
export function clubThemeCss(club: ClubBrand | null | undefined): string {
  if (!club) return "";
  const vars: string[] = [];
  if (isHexColor(club.brandPrimary)) {
    vars.push(`--brand:${club.brandPrimary}`, `--on-accent:${onColor(club.brandPrimary)}`);
  }
  if (isHexColor(club.brandSecondary)) vars.push(`--brand-2:${club.brandSecondary}`);
  if (isHexColor(club.brandBackground)) vars.push(`--brand-bg:${club.brandBackground}`);
  return vars.length ? `:root{${vars.join(";")}}` : "";
}
