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
        const u = user as { id?: string; role?: string; clubId?: string };
        if (u.role)   token.role   = u.role;
        if (u.id)     token.id     = u.id;
        if (u.clubId) token.clubId = u.clubId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).role   = token.role;
        (session.user as any).id     = token.id ?? token.sub;
        (session.user as any).clubId = token.clubId ?? "club-star";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
