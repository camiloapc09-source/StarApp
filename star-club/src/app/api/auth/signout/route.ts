import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(_req: NextRequest) {
  const session = await auth();
  let redirectTo = "/";

  if (session?.user?.clubId) {
    try {
      const club = await db.club.findUnique({
        where: { id: session.user.clubId },
        select: { slug: true },
      });
      if (club) redirectTo = `/${club.slug}`;
    } catch {
      // DB error — fall back to root
    }
  }

  await signOut({ redirectTo });
}
