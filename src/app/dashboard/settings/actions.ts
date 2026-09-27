"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type SettingsState = { ok?: boolean; error?: string; message?: string } | undefined;

export async function updateProfile(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const storeName = String(formData.get("storeName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !storeName) return { error: "Nama dan nama warung wajib diisi." };
  await db.update(users).set({ name, storeName, phone: phone || null }).where(eq(users.id, user.id));
  revalidatePath("/dashboard");
  return { ok: true, message: "Profil berhasil disimpan." };
}

export async function changePassword(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 6) return { error: "Kata sandi baru minimal 6 karakter." };
  if (next !== confirm) return { error: "Konfirmasi kata sandi tidak cocok." };
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Kata sandi saat ini salah." };
  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, user.id));
  return { ok: true, message: "Kata sandi berhasil diubah." };
}
