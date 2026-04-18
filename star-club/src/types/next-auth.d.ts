import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      clubId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    clubId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
    clubId?: string;
  }
}
