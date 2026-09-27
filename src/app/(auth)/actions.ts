"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export type AuthState = { error?: string } | undefined;

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  await ensureSeeded();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email dan kata sandi wajib diisi." };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email atau kata sandi salah." };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  await ensureSeeded();
  const name = String(formData.get("name") ?? "").trim();
  const storeName = String(formData.get("storeName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password || !storeName) return { error: "Semua kolom wajib diisi." };
  if (password.length < 6) return { error: "Kata sandi minimal 6 karakter." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Format email tidak valid." };

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "Email sudah terdaftar. Silakan masuk." };

  const [user] = await db
    .insert(users)
    .values({ name, email, storeName, passwordHash: await hashPassword(password) })
    .returning({ id: users.id });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
