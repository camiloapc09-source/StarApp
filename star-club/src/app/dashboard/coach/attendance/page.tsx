import { redirect } from "next/navigation";

export default function CoachAttendanceIndexPage() {
  redirect("/dashboard/coach/sessions");
}
