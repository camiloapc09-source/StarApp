import { clubThemeCss, type ClubBrand } from "@/lib/club-theme";

/** Aplica los colores del club a toda la página. Server component. */
export function ClubThemeStyle({ club }: { club: ClubBrand | null | undefined }) {
  const css = clubThemeCss(club);
  if (!css) return null;
  // Solo contiene colores #RRGGBB validados: no hay texto libre del usuario.
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
