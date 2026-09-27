"use server";

import { db } from "@/db";
import { customers, type Customer } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type CustomerInput = {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
};

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function clean(v?: string) {
  const t = v?.trim();
  return t ? t : null;
}

export async function createCustomer(input: CustomerInput): Promise<ActionResult<Customer>> {
  const user = await requireUser();
  if (!input.name?.trim()) return { ok: false, error: "Nama pelanggan wajib diisi." };
  const [row] = await db
    .insert(customers)
    .values({
      userId: user.id,
      name: input.name.trim(),
      phone: clean(input.phone),
      address: clean(input.address),
      notes: clean(input.notes),
    })
    .returning();
  revalidatePath("/dashboard");
  return { ok: true, data: row };
}

export async function updateCustomer(id: number, input: CustomerInput): Promise<ActionResult<Customer>> {
  const user = await requireUser();
  if (!input.name?.trim()) return { ok: false, error: "Nama pelanggan wajib diisi." };
  const [row] = await db
    .update(customers)
    .set({
      name: input.name.trim(),
      phone: clean(input.phone),
      address: clean(input.address),
      notes: clean(input.notes),
    })
    .where(and(eq(customers.id, id), eq(customers.userId, user.id)))
    .returning();
  if (!row) return { ok: false, error: "Pelanggan tidak ditemukan." };
  revalidatePath("/dashboard");
  return { ok: true, data: row };
}

export async function deleteCustomer(id: number): Promise<ActionResult> {
  const user = await requireUser();
  const deleted = await db
    .delete(customers)
    .where(and(eq(customers.id, id), eq(customers.userId, user.id)))
    .returning({ id: customers.id });
  if (deleted.length === 0) return { ok: false, error: "Pelanggan tidak ditemukan." };
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}
