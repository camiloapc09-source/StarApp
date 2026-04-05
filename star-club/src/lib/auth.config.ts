import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config — no Node.js-only imports (no db, no bcrypt)
export const authConfig = {
  session: { strategy: "jwt" as const },
  pages: { signIn: "/login" },
  providers: [], // Credentials provider added in auth.ts (Node.js only)
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; role?: string };
        if (u.role) token.role = u.role;
        if (u.id) token.id = u.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
