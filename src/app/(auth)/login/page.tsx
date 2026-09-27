"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "../actions";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900">Selamat datang kembali 👋</h2>
      <p className="mt-1 text-sm text-slate-500">Masuk untuk mengelola piutang warung Anda.</p>

      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-semibold">Akun demo</p>
        <p className="mt-1">
          Email: <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">demo@hutangku.id</code> · Sandi:{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">demo1234</code>
        </p>
      </div>

      <form action={action} className="mt-6 space-y-4">
        <Field label="Email">
          <Input name="email" type="email" placeholder="nama@email.com" defaultValue="demo@hutangku.id" required autoComplete="email" />
        </Field>
        <Field label="Kata sandi">
          <Input name="password" type="password" placeholder="••••••••" defaultValue="demo1234" required autoComplete="current-password" />
        </Field>
        {state?.error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</div>
        )}
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Masuk
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Belum punya akun?{" "}
        <Link href="/register" className="font-semibold text-emerald-600 hover:text-emerald-700">
          Daftar gratis
        </Link>
      </p>
    </div>
  );
}
