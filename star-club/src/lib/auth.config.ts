import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config — no Node.js-only imports (no db, no bcrypt)
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" as const },
  pages: { signIn: "/" },
  providers: [], // Credentials provider added in auth.ts (Node.js only)
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; role?: string; clubId?: string; clubSlug?: string; setupCompleted?: boolean; linkedPlayerId?: string | null };
        if (u.role)                    token.role           = u.role;
        if (u.id)                      token.id             = u.id;
        if (u.clubId)                  token.clubId         = u.clubId;
        if (u.clubSlug)                token.clubSlug       = u.clubSlug;
        if (u.setupCompleted !== undefined) token.setupCompleted = u.setupCompleted;
        token.linkedPlayerId = u.linkedPlayerId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).role           = token.role;
        (session.user as any).id             = token.id ?? token.sub;
        (session.user as any).clubId         = token.clubId ?? "club-star";
        (session.user as any).clubSlug       = token.clubSlug ?? "";
        (session.user as any).setupCompleted = token.setupCompleted ?? false;
        (session.user as any).linkedPlayerId = token.linkedPlayerId ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
