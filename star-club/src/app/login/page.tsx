import { redirect } from "next/navigation";

// Redirect to the club selector — each club has its own login at /[clubSlug]
export default function LoginPage() {
  redirect("/");
}
