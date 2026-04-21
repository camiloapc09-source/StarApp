import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "Nova <noreply@resend.dev>";

function base(content: string) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nova</title></head>
<body style="margin:0;padding:0;background:#080812;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080812;padding:40px 20px;">
  <tr><td align="center">
    <table width="100%" style="max-width:520px;">
      <!-- Logo -->
      <tr><td style="padding-bottom:32px;text-align:center;">
        <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;">★ Nova</span>
      </td></tr>
      <!-- Card -->
      <tr><td style="background:#0e0e2c;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px 32px;">
        ${content}
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding-top:24px;text-align:center;">
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.20);">Nova · Gestión deportiva inteligente</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:linear-gradient(135deg,#7C3AED,#4338CA);color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;border-radius:12px;">${text}</a>`;
}

function label(text: string) {
  return `<p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.30);">${text}</p>`;
}

function title(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.3px;">${text}</h1>`;
}

function body(text: string) {
  return `<p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.60);">${text}</p>`;
}

function amount(value: string) {
  return `<div style="margin:20px 0;padding:16px 20px;background:rgba(139,92,246,0.10);border:1px solid rgba(139,92,246,0.20);border-radius:12px;">
    <p style="margin:0;font-size:28px;font-weight:900;color:#A78BFA;">${value}</p>
  </div>`;
}

// ─── Pago vencido → al padre ──────────────────────────────────────────────────
export async function sendOverduePaymentEmail({
  to, parentName, playerName, concept, amountCOP, clubName, appUrl,
}: {
  to: string; parentName: string; playerName: string; concept: string;
  amountCOP: number; clubName: string; appUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const html = base(`
    ${label(clubName)}
    ${title("Pago vencido ⚠️")}
    ${body(`Hola ${parentName}, el siguiente pago de <strong style="color:#fff;">${playerName}</strong> está vencido:`)}
    ${amount(`$${amountCOP.toLocaleString("es-CO")} — ${concept}`)}
    ${body("Sube el comprobante de pago desde la app para que el administrador lo confirme.")}
    ${btn("Ver pagos →", `${appUrl}/dashboard/parent/payments`)}
  `);
  await resend.emails.send({ from: FROM, to, subject: `⚠️ Pago vencido — ${playerName}`, html }).catch(console.error);
}

// ─── Pago confirmado → al padre ───────────────────────────────────────────────
export async function sendPaymentConfirmedEmail({
  to, parentName, playerName, concept, amountCOP, clubName, appUrl,
}: {
  to: string; parentName: string; playerName: string; concept: string;
  amountCOP: number; clubName: string; appUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const html = base(`
    ${label(clubName)}
    ${title("Pago confirmado ✓")}
    ${body(`Hola ${parentName}, el pago de <strong style="color:#fff;">${playerName}</strong> fue recibido correctamente:`)}
    ${amount(`$${amountCOP.toLocaleString("es-CO")} — ${concept}`)}
    ${body("Gracias por mantenerte al día. Puedes ver el historial completo en la app.")}
    ${btn("Ver historial →", `${appUrl}/dashboard/parent/payments`)}
  `);
  await resend.emails.send({ from: FROM, to, subject: `✓ Pago confirmado — ${playerName}`, html }).catch(console.error);
}

// ─── Bienvenida al padre ──────────────────────────────────────────────────────
export async function sendParentWelcomeEmail({
  to, parentName, playerName, clubName, appUrl,
}: {
  to: string; parentName: string; playerName: string; clubName: string; appUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const html = base(`
    ${label(clubName)}
    ${title(`Bienvenido/a, ${parentName} 👋`)}
    ${body(`Ya estás vinculado/a como padre o tutor de <strong style="color:#fff;">${playerName}</strong> en ${clubName}.`)}
    ${body("Desde la app puedes ver los pagos pendientes, la asistencia y el progreso de misiones de tu hijo/a.")}
    ${btn("Ir a la app →", `${appUrl}/dashboard/parent`)}
    <p style="margin:20px 0 0;font-size:13px;color:rgba(255,255,255,0.30);">Si tienes dudas, contacta al administrador del club.</p>
  `);
  await resend.emails.send({ from: FROM, to, subject: `Bienvenido/a a ${clubName} — Nova`, html }).catch(console.error);
}

// ─── Evidencia aprobada → al jugador ─────────────────────────────────────────
export async function sendEvidenceApprovedEmail({
  to, playerName, missionTitle, xpReward, clubName, appUrl,
}: {
  to: string; playerName: string; missionTitle: string; xpReward: number; clubName: string; appUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const html = base(`
    ${label(clubName)}
    ${title("¡Misión completada! 🎯")}
    ${body(`Hola ${playerName}, tu evidencia para la misión <strong style="color:#fff;">"${missionTitle}"</strong> fue aprobada.`)}
    ${amount(`+${xpReward} XP ganados`)}
    ${body("Sigue así — cada misión completada te acerca al siguiente nivel.")}
    ${btn("Ver mis misiones →", `${appUrl}/dashboard/player/missions`)}
  `);
  await resend.emails.send({ from: FROM, to, subject: `+${xpReward} XP — Misión aprobada`, html }).catch(console.error);
}
