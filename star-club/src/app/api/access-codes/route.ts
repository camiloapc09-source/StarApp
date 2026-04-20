import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiOk, apiError, rateLimit, getClientIp } from "@/lib/api";

// Public endpoint — just validates if a code is usable, returns plan info
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`validate-code:${ip}`, 20, 60_000)) return apiError("Too many requests", 429);

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.toUpperCase().trim();
  if (!code) return apiError("Código requerido", 400);

  const entry = await db.accessCode.findUnique({ where: { code } });

  if (!entry) return apiOk({ valid: false, reason: "Código inválido" });
  if (entry.usedAt) return apiOk({ valid: false, reason: "Este código ya fue utilizado" });
  if (entry.expiresAt && entry.expiresAt < new Date()) {
    return apiOk({ valid: false, reason: "Este código ha expirado" });
  }

  return apiOk({ valid: true, plan: entry.plan });
}
