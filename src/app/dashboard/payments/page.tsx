import { db } from "@/db";
import { customers, debts, payments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { PaymentsClient } from "./payments-client";
import { Card } from "@/components/ui";
import { formatRupiah, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const user = await requireUser();

  const rows = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      method: payments.method,
      note: payments.note,
      paidAt: payments.paidAt,
      debtId: payments.debtId,
      description: debts.description,
      customerId: customers.id,
      customerName: customers.name,
    })
    .from(payments)
    .innerJoin(debts, eq(debts.id, payments.debtId))
    .innerJoin(customers, eq(customers.id, payments.customerId))
    .where(eq(payments.userId, user.id))
    .orderBy(desc(payments.paidAt), desc(payments.id));

  const today = todayISO();
  const monthStart = today.slice(0, 7) + "-01";
  const totalToday = rows.filter((r) => r.paidAt === today).reduce((s, r) => s + r.amount, 0);
  const totalMonth = rows.filter((r) => r.paidAt >= monthStart).reduce((s, r) => s + r.amount, 0);
  const totalAll = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <PageHeader title="Pembayaran" description="Riwayat semua pembayaran / cicilan yang diterima." />
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: "Hari ini", value: totalToday },
          { label: "Bulan ini", value: totalMonth },
          { label: "Total diterima", value: totalAll },
        ].map((s) => (
          <Card key={s.label} className="px-4 py-3">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="truncate text-lg font-bold text-emerald-600 sm:text-xl">{formatRupiah(s.value)}</p>
          </Card>
        ))}
      </div>
      <PaymentsClient initial={rows} />
    </div>
  );
}
