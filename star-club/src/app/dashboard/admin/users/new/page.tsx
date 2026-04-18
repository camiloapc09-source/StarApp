import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import NewCoachForm from "@/components/admin/new-coach-form";
import { getDictionary } from "@/lib/dict";

export default async function NewCoachPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  const dict = await getDictionary();

  return (
    <div>
      <Header title={dict.common?.coaches ?? "Entrenadores"} subtitle={"Crear entrenador"} />
      <div className="p-8">
        <div className="max-w-lg">
          <NewCoachForm />
        </div>
      </div>
    </div>
  );
}
