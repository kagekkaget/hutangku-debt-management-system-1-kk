"use server";

import { db } from "@/db";
import { customers, debts, payments, type Debt, type Payment } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../customers/actions";

export type DebtInput = {
  customerId: number;
  description: string;
  amount: number;
  debtDate: string;
  dueDate: string;
  notes?: string;
};

export type PaymentInput = {
  debtId: number;
  amount: number;
  method: string;
  paidAt: string;
  note?: string;
};

function validateDebt(input: DebtInput): string | null {
  if (!input.customerId) return "Pilih pelanggan terlebih dahulu.";
  if (!input.description?.trim()) return "Keterangan wajib diisi.";
  if (!Number.isFinite(input.amount) || input.amount <= 0) return "Jumlah hutang harus lebih dari 0.";
  if (!input.debtDate || !input.dueDate) return "Tanggal hutang & jatuh tempo wajib diisi.";
  if (input.dueDate < input.debtDate) return "Jatuh tempo tidak boleh sebelum tanggal hutang.";
  return null;
}

async function recalcDebt(debtId: number) {
  const [agg] = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)::bigint` })
    .from(payments)
    .where(eq(payments.debtId, debtId));
  const [debt] = await db.select({ amount: debts.amount }).from(debts).where(eq(debts.id, debtId));
  if (!debt) return;
  const paid = Number(agg?.total ?? 0);
  const status = paid >= debt.amount ? "paid" : paid > 0 ? "partial" : "unpaid";
  await db.update(debts).set({ paidAmount: paid, status, updatedAt: new Date() }).where(eq(debts.id, debtId));
}

export async function createDebt(input: DebtInput): Promise<ActionResult<Debt>> {
  const user = await requireUser();
  const err = validateDebt(input);
  if (err) return { ok: false, error: err };
  const [cust] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, input.customerId), eq(customers.userId, user.id)));
  if (!cust) return { ok: false, error: "Pelanggan tidak ditemukan." };

  const [row] = await db
    .insert(debts)
    .values({
      userId: user.id,
      customerId: input.customerId,
      description: input.description.trim(),
      amount: Math.round(input.amount),
      debtDate: input.debtDate,
      dueDate: input.dueDate,
      notes: input.notes?.trim() || null,
    })
    .returning();
  revalidatePath("/dashboard");
  return { ok: true, data: row };
}

export async function updateDebt(id: number, input: DebtInput): Promise<ActionResult<Debt>> {
  const user = await requireUser();
  const err = validateDebt(input);
  if (err) return { ok: false, error: err };
  const [existing] = await db.select().from(debts).where(and(eq(debts.id, id), eq(debts.userId, user.id)));
  if (!existing) return { ok: false, error: "Catatan hutang tidak ditemukan." };
  if (Math.round(input.amount) < existing.paidAmount) {
    return { ok: false, error: `Jumlah tidak boleh lebih kecil dari yang sudah dibayar (${existing.paidAmount}).` };
  }
  await db
    .update(debts)
    .set({
      customerId: input.customerId,
      description: input.description.trim(),
      amount: Math.round(input.amount),
      debtDate: input.debtDate,
      dueDate: input.dueDate,
      notes: input.notes?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(debts.id, id));
  await db.update(payments).set({ customerId: input.customerId }).where(eq(payments.debtId, id));
  await recalcDebt(id);
  const [row] = await db.select().from(debts).where(eq(debts.id, id));
  revalidatePath("/dashboard");
  return { ok: true, data: row };
}

export async function deleteDebt(id: number): Promise<ActionResult> {
  const user = await requireUser();
  const deleted = await db
    .delete(debts)
    .where(and(eq(debts.id, id), eq(debts.userId, user.id)))
    .returning({ id: debts.id });
  if (deleted.length === 0) return { ok: false, error: "Catatan hutang tidak ditemukan." };
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function addPayment(input: PaymentInput): Promise<ActionResult<Payment>> {
  const user = await requireUser();
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { ok: false, error: "Jumlah pembayaran harus lebih dari 0." };
  if (!input.paidAt) return { ok: false, error: "Tanggal pembayaran wajib diisi." };
  const [debt] = await db.select().from(debts).where(and(eq(debts.id, input.debtId), eq(debts.userId, user.id)));
  if (!debt) return { ok: false, error: "Catatan hutang tidak ditemukan." };
  const remaining = debt.amount - debt.paidAmount;
  if (Math.round(input.amount) > remaining) {
    return { ok: false, error: "Pembayaran melebihi sisa hutang." };
  }
  const [row] = await db
    .insert(payments)
    .values({
      userId: user.id,
      debtId: debt.id,
      customerId: debt.customerId,
      amount: Math.round(input.amount),
      method: input.method || "tunai",
      paidAt: input.paidAt,
      note: input.note?.trim() || null,
    })
    .returning();
  await recalcDebt(debt.id);
  revalidatePath("/dashboard");
  return { ok: true, data: row };
}

export async function deletePayment(id: number): Promise<ActionResult> {
  const user = await requireUser();
  const [deleted] = await db
    .delete(payments)
    .where(and(eq(payments.id, id), eq(payments.userId, user.id)))
    .returning({ debtId: payments.debtId });
  if (!deleted) return { ok: false, error: "Pembayaran tidak ditemukan." };
  await recalcDebt(deleted.debtId);
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}
