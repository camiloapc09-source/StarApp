import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { rateLimit } from "@/lib/api";

/** Intentos de contraseña permitidos por cuenta antes de bloquear. */
const MAX_LOGIN_ATTEMPTS = 8;
/** Ventana del bloqueo: 10 minutos. */
const LOGIN_WINDOW_MS = 10 * 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "text" },
        password: { label: "Password", type: "password" },
        clubSlug: { label: "Club",     type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const emailInput = (credentials.email as string).trim().toLowerCase();
        const clubSlug   = (credentials.clubSlug as string | undefined)?.trim();

        // Límite de intentos por cuenta. Antes el login no tenía ninguno:
        // se podían probar contraseñas sin tope. Además cada intento hace 2-3
        // consultas y un `compare` de bcrypt, así que también servía para
        // inflar la factura de la base de datos.
        //
        // La clave es el email + club, no la IP: una IP compartida (un colegio,
        // un celular con datos móviles) dejaría fuera a usuarios legítimos.
        const attemptKey = `login:${clubSlug ?? ""}:${emailInput}`;
        if (!rateLimit(attemptKey, MAX_LOGIN_ATTEMPTS, LOGIN_WINDOW_MS)) {
          // Mensaje genérico: no confirma si la cuenta existe.
          throw new Error("Demasiados intentos. Espera unos minutos e intenta de nuevo.");
        }

        // Resolve clubId from slug when provided
        let clubId: string | undefined;
        let resolvedSlug: string | undefined = clubSlug;
        if (clubSlug) {
          const club = await db.club.findUnique({
            where: { slug: clubSlug },
            select: { id: true, slug: true },
          });
          clubId      = club?.id   ?? undefined;
          resolvedSlug = club?.slug ?? clubSlug;
        }

        let user = await db.user.findFirst({
          where: {
            email: emailInput,
            ...(clubId ? { clubId } : {}),
          },
        });

        // Fallback: if input has no @, try the @bb.internal / @acudiente.bb.internal
        // formats used for accounts migrated from document-number credentials
        if (!user && !emailInput.includes("@")) {
          user = await db.user.findFirst({
            where: {
              AND: [
                { email: { startsWith: `${emailInput}@` } },
                { email: { endsWith: ".internal" } },
              ],
              ...(clubId ? { clubId } : {}),
            },
          });
        }

        // Fallback: parent logging in with their child's document number as username
        if (!user && !emailInput.includes("@")) {
          const link = await db.parentPlayer.findFirst({
            where: {
              player: {
                documentNumber: emailInput,
                ...(clubId ? { clubId } : {}),
              },
            },
            select: { parent: { select: { user: true } } },
          });
          if (link?.parent?.user) user = link.parent.user;
        }

        if (!user) return null;

        const isValid = await compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        // Resolve slug if not already known (e.g. login from global /login page)
        if (!resolvedSlug) {
          const club = await db.club.findUnique({
            where: { id: user.clubId },
            select: { slug: true },
          });
          resolvedSlug = club?.slug ?? "";
        }

        // For COACH users, check if they also have a player profile (dual-role)
        let linkedPlayerId: string | null = null;
        if (user.role === "COACH") {
          const playerProfile = await db.player.findUnique({
            where: { userId: user.id },
            select: { id: true },
          });
          linkedPlayerId = playerProfile?.id ?? null;
        }

        return {
          id:             user.id,
          name:           user.name,
          email:          user.email,
          role:           user.role,
          clubId:         user.clubId,
          clubSlug:       resolvedSlug,
          setupCompleted: user.setupCompleted,
          linkedPlayerId,
        };
      },
    }),
  ],
});
