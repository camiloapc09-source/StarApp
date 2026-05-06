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
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const emailInput = (credentials.email as string).trim();
        const isEmail = emailInput.includes("@");

        const user = await db.user.findFirst({
          where: isEmail
            ? { email: emailInput }
            : { email: { startsWith: emailInput.toLowerCase() + "@" } },
        });

        if (!user) return null;

        const isValid = await compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return {
          id:     user.id,
          name:   user.name,
          email:  user.email,
          role:   user.role,
          clubId: user.clubId,
        };
      },
    }),
  ],
});
