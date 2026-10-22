"use client";

import { useActionState } from "react";
import { acceptInvite, login } from "@/app/auth-actions";
import { Button } from "./ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Email</span>
        <input className="input" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input className="input" name="password" type="password" autoComplete="current-password" required />
      </label>
      {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <Button className="w-full" disabled={pending}>{pending ? "Accesso…" : "Accedi"}</Button>
    </form>
  );
}

export function InviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvite, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block">
        <span className="label">Scegli una password</span>
        <input className="input" name="password" type="password" autoComplete="new-password" minLength={10} required />
        <span className="mt-1 block text-xs text-stone-500">Almeno 10 caratteri, con lettere e numeri.</span>
      </label>
      <label className="block">
        <span className="label">Ripeti la password</span>
        <input className="input" name="confirm" type="password" autoComplete="new-password" required />
      </label>
      {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <Button className="w-full" disabled={pending}>{pending ? "Attivazione…" : "Attiva il mio accesso"}</Button>
    </form>
  );
}
