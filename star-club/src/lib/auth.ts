import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

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

        return {
          id:       user.id,
          name:     user.name,
          email:    user.email,
          role:     user.role,
          clubId:   user.clubId,
          clubSlug: resolvedSlug,
        };
      },
    }),
  ],
});
