import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      clubId: string;
      clubSlug: string;
      setupCompleted: boolean;
      linkedPlayerId?: string | null; // set for COACH users who also have a player profile
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    clubId?: string;
    clubSlug?: string;
    setupCompleted?: boolean;
    linkedPlayerId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
    clubId?: string;
    clubSlug?: string;
    setupCompleted?: boolean;
    linkedPlayerId?: string | null;
  }
}
