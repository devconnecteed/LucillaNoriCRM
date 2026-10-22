import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { LoginForm } from "@/components/auth-forms";
import { Card, Logo } from "@/components/ui";

export const metadata = { title: "Accedi" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-ln-100 to-ivory px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-8 text-center"><Logo /></div>
        <h1 className="mb-6 text-center font-serif text-xl text-ln-900">Area riservata</h1>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-stone-500">Prima volta? Usa il link d’invito ricevuto via email.</p>
      </Card>
    </main>
  );
}
