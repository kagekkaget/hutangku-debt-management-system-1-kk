"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, useToast } from "@/components/ui";
import { changePassword, updateProfile, type SettingsState } from "./actions";

function useFeedback(state: SettingsState) {
  const { toast } = useToast();
  const router = useRouter();
  useEffect(() => {
    if (state?.ok && state.message) {
      toast(state.message);
      router.refresh();
    }
  }, [state, toast, router]);
}

export function ProfileForm({ user }: { user: { name: string; storeName: string; phone: string; email: string } }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  useFeedback(state);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama Anda">
          <Input name="name" defaultValue={user.name} required />
        </Field>
        <Field label="Nama warung / toko">
          <Input name="storeName" defaultValue={user.storeName} required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email">
          <Input value={user.email} disabled />
        </Field>
        <Field label="Nomor HP warung">
          <Input name="phone" defaultValue={user.phone} placeholder="0812xxxxxxx" />
        </Field>
      </div>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          Simpan Profil
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  useFeedback(state);
  return (
    <form action={action} className="space-y-4" key={state?.ok ? "done" : "form"}>
      <Field label="Kata sandi saat ini">
        <Input name="current" type="password" required autoComplete="current-password" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kata sandi baru">
          <Input name="next" type="password" required minLength={6} autoComplete="new-password" />
        </Field>
        <Field label="Ulangi kata sandi baru">
          <Input name="confirm" type="password" required minLength={6} autoComplete="new-password" />
        </Field>
      </div>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" loading={pending}>
          Ubah Kata Sandi
        </Button>
      </div>
    </form>
  );
}
