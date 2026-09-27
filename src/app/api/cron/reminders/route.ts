import { db } from "@/db";
import { customers, debts, reminderLogs, users } from "@/db/schema";
import { sendWhatsApp } from "@/lib/wa";
import { addDaysISO, formatDate, formatRupiah, renderTemplate, todayISO } from "@/lib/utils";
import { and, eq, isNotNull, lte, ne, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Automatic reminder job. Call daily via an external cron.
 * Sends reminders for debts due tomorrow, due today, and overdue debts
 * (overdue ones only once every 7 days to avoid spamming).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    const q = req.nextUrl.searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && q !== secret) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const today = todayISO();
  const tomorrow = addDaysISO(1);

  const rows = await db
    .select({
      id: debts.id,
      description: debts.description,
      amount: debts.amount,
      paidAmount: debts.paidAmount,
      dueDate: debts.dueDate,
      userId: debts.userId,
      customerId: customers.id,
      customerName: customers.name,
      customerPhone: customers.phone,
      storeName: users.storeName,
      template: users.reminderTemplate,
      lastReminder: sql<string | null>`(
        select max(${reminderLogs.createdAt}) from ${reminderLogs}
        where ${reminderLogs.debtId} = ${debts.id}
      )`,
    })
    .from(debts)
    .innerJoin(customers, eq(customers.id, debts.customerId))
    .innerJoin(users, eq(users.id, debts.userId))
    .where(and(ne(debts.status, "paid"), lte(debts.dueDate, tomorrow), isNotNull(customers.phone)));

  const results: Array<{ debtId: number; customer: string; status: string; reason?: string }> = [];
  const sevenDaysAgo = Date.now() - 7 * 86400000;

  for (const d of rows) {
    const isOverdue = d.dueDate < today;
    if (isOverdue && d.lastReminder && new Date(d.lastReminder).getTime() > sevenDaysAgo) {
      results.push({ debtId: d.id, customer: d.customerName, status: "skipped", reason: "sudah diingatkan <7 hari" });
      continue;
    }
    if (!isOverdue && d.lastReminder && new Date(d.lastReminder).toISOString().slice(0, 10) === today) {
      results.push({ debtId: d.id, customer: d.customerName, status: "skipped", reason: "sudah diingatkan hari ini" });
      continue;
    }
    const message = renderTemplate(d.template, {
      nama: d.customerName,
      warung: d.storeName,
      jumlah: formatRupiah(d.amount - d.paidAmount),
      keterangan: d.description,
      jatuh_tempo: formatDate(d.dueDate),
    });
    const res = await sendWhatsApp(d.customerPhone!, message);
    await db.insert(reminderLogs).values({
      userId: d.userId,
      customerId: d.customerId,
      debtId: d.id,
      phone: d.customerPhone!,
      message,
      status: res.status,
      response: `[cron] ${res.response}`,
    });
    results.push({ debtId: d.id, customer: d.customerName, status: res.status });
  }

  return Response.json({ ok: true, date: today, processed: results.length, results });
}
