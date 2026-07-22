import { AuthPageShell } from "@/components/auth-page-shell";
import { RegisterForm } from "@/components/register-form";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <AuthPageShell>
      <RegisterForm />
    </AuthPageShell>
  );
}
