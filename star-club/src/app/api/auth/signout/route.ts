import { signOut } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(_req: NextRequest) {
  await signOut({ redirectTo: "/login" });
}
