"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "../actions";
import { Button, Field, Input } from "@/components/ui";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, undefined);

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900">Buat akun baru</h2>
      <p className="mt-1 text-sm text-slate-500">Gratis, cukup 1 menit. Mulai catat piutang warung Anda.</p>

      <form action={action} className="mt-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama Anda">
            <Input name="name" placeholder="Ibu Sari" required />
          </Field>
          <Field label="Nama warung / toko">
            <Input name="storeName" placeholder="Warung Berkah" required />
          </Field>
        </div>
        <Field label="Email">
          <Input name="email" type="email" placeholder="nama@email.com" required autoComplete="email" />
        </Field>
        <Field label="Kata sandi" hint="min. 6 karakter">
          <Input name="password" type="password" placeholder="••••••••" required minLength={6} autoComplete="new-password" />
        </Field>
        {state?.error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</div>
        )}
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Daftar & Mulai
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
          Masuk
        </Link>
      </p>
    </div>
  );
}
