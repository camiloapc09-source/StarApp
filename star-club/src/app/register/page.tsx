import { Suspense } from "react";
import RegisterClient from "@/components/register/register-client";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div />}> 
      <RegisterClient />
    </Suspense>
  );
}
