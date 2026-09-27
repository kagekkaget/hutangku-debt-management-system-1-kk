"use server";

import { db } from "@/db";
import { customers, debts, reminderLogs, users, type User } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { sendWhatsApp } from "@/lib/wa";
import { formatDate, formatRupiah, renderTemplate } from "@/lib/utils";
import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../customers/actions";

export type ReminderResult = {
  debtId: number;
  customerName: string;
  status: "sent" | "failed" | "simulated" | "skipped";
  detail: string;
};

export async function buildReminderMessage(
  user: Pick<User, "storeName" | "reminderTemplate">,
  debt: { description: string; amount: number; paidAmount: number; dueDate: string },
  customerName: string,
) {
  return renderTemplate(user.reminderTemplate, {
    nama: customerName,
    warung: user.storeName,
    jumlah: formatRupiah(debt.amount - debt.paidAmount),
    keterangan: debt.description,
    jatuh_tempo: formatDate(debt.dueDate),
  });
}

export async function sendReminders(debtIds: number[]): Promise<ActionResult<ReminderResult[]>> {
  const user = await requireUser();
  if (debtIds.length === 0) return { ok: false, error: "Pilih minimal satu piutang." };

  const rows = await db
    .select({
      id: debts.id,
      description: debts.description,
      amount: debts.amount,
      paidAmount: debts.paidAmount,
      dueDate: debts.dueDate,
      customerId: customers.id,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(debts)
    .innerJoin(customers, eq(customers.id, debts.customerId))
    .where(and(eq(debts.userId, user.id), inArray(debts.id, debtIds), ne(debts.status, "paid")));

  const results: ReminderResult[] = [];
  for (const d of rows) {
    if (!d.customerPhone) {
      results.push({ debtId: d.id, customerName: d.customerName, status: "skipped", detail: "Nomor WA tidak tersedia" });
      continue;
    }
    const message = await buildReminderMessage(user, d, d.customerName);
    const res = await sendWhatsApp(d.customerPhone, message);
    await db.insert(reminderLogs).values({
      userId: user.id,
      customerId: d.customerId,
      debtId: d.id,
      phone: d.customerPhone,
      message,
      status: res.status,
      response: res.response,
    });
    results.push({ debtId: d.id, customerName: d.customerName, status: res.status, detail: res.response });
  }

  revalidatePath("/dashboard");
  return { ok: true, data: results };
}

export async function previewReminder(debtId: number): Promise<ActionResult<string>> {
  const user = await requireUser();
  const [d] = await db
    .select({ description: debts.description, amount: debts.amount, paidAmount: debts.paidAmount, dueDate: debts.dueDate, customerName: customers.name })
    .from(debts)
    .innerJoin(customers, eq(customers.id, debts.customerId))
    .where(and(eq(debts.userId, user.id), eq(debts.id, debtId)));
  if (!d) return { ok: false, error: "Tidak ditemukan" };
  return { ok: true, data: await buildReminderMessage(user, d, d.customerName) };
}

export async function updateReminderTemplate(template: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!template.trim()) return { ok: false, error: "Template tidak boleh kosong." };
  await db.update(users).set({ reminderTemplate: template.trim() }).where(eq(users.id, user.id));
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}
