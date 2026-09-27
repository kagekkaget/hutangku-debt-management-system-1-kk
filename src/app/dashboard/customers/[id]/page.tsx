import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { customers, debts, payments, reminderLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, asc, desc, eq } from "drizzle-orm";
import { Avatar, Badge, Card } from "@/components/ui";
import { daysUntil, formatDate, formatDateTime, formatRupiah } from "@/lib/utils";
import { CustomerDetailClient } from "./detail-client";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isFinite(customerId)) notFound();

  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.userId, user.id)));
  if (!customer) notFound();

  const [debtRows, paymentRows, reminders, allCustomers] = await Promise.all([
    db.select().from(debts).where(eq(debts.customerId, customerId)).orderBy(desc(debts.debtDate), desc(debts.id)),
    db
      .select({
        id: payments.id,
        amount: payments.amount,
        method: payments.method,
        note: payments.note,
        paidAt: payments.paidAt,
        description: debts.description,
        debtId: payments.debtId,
      })
      .from(payments)
      .innerJoin(debts, eq(debts.id, payments.debtId))
      .where(eq(payments.customerId, customerId))
      .orderBy(desc(payments.paidAt), desc(payments.id)),
    db.select().from(reminderLogs).where(eq(reminderLogs.customerId, customerId)).orderBy(desc(reminderLogs.createdAt)).limit(5),
    db.select({ id: customers.id, name: customers.name, phone: customers.phone }).from(customers).where(eq(customers.userId, user.id)).orderBy(asc(customers.name)),
  ]);

  const open = debtRows.filter((d) => d.status !== "paid");
  const outstanding = open.reduce((s, d) => s + (d.amount - d.paidAmount), 0);
  const overdue = open.filter((d) => daysUntil(d.dueDate) < 0);
  const totalBorrowed = debtRows.reduce((s, d) => s + d.amount, 0);
  const totalPaid = paymentRows.reduce((s, p) => s + p.amount, 0);

  const debtLikes = debtRows.map((d) => ({
    id: d.id,
    customerId: d.customerId,
    customerName: customer.name,
    description: d.description,
    amount: d.amount,
    paidAmount: d.paidAmount,
    status: d.status,
    debtDate: d.debtDate,
    dueDate: d.dueDate,
    notes: d.notes,
  }));

  return (
    <div>
      <Link href="/dashboard/customers" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        ← Kembali ke pelanggan
      </Link>

      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar name={customer.name} size="lg" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span>📱 {customer.phone ?? "Tanpa nomor HP"}</span>
                {customer.address && <span>📍 {customer.address}</span>}
                <span>Pelanggan sejak {formatDate(customer.createdAt)}</span>
              </div>
              {customer.notes && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-800">📝 {customer.notes}</p>}
            </div>
          </div>
          <CustomerDetailClient
            customer={{ id: customer.id, name: customer.name, phone: customer.phone, address: customer.address, notes: customer.notes }}
            customers={allCustomers}
            debts={debtLikes}
            hasOverdue={overdue.length > 0}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Sisa hutang", value: formatRupiah(outstanding), tone: outstanding > 0 ? "text-slate-900" : "text-emerald-600" },
            { label: "Jatuh tempo", value: `${overdue.length} catatan`, tone: overdue.length > 0 ? "text-rose-600" : "text-slate-900" },
            { label: "Total pernah hutang", value: formatRupiah(totalBorrowed), tone: "text-slate-900" },
            { label: "Total sudah bayar", value: formatRupiah(totalPaid), tone: "text-emerald-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-lg font-bold ${s.tone}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h2 className="mb-3 font-semibold text-slate-900">Riwayat Hutang ({debtRows.length})</h2>
          {debtRows.length === 0 ? (
            <Card className="p-10 text-center text-sm text-slate-400">Belum ada catatan hutang untuk pelanggan ini.</Card>
          ) : (
            <div className="space-y-3">
              {debtRows.map((d) => {
                const remaining = d.amount - d.paidAmount;
                const n = daysUntil(d.dueDate);
                const progress = Math.min(100, Math.round((d.paidAmount / d.amount) * 100));
                const debtPayments = paymentRows.filter((p) => p.debtId === d.id);
                return (
                  <Card key={d.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{d.description}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(d.debtDate)} → tempo {formatDate(d.dueDate)}
                          {d.status !== "paid" && (
                            <span className={n < 0 ? "ml-1 font-medium text-rose-600" : "ml-1 text-slate-400"}>
                              ({n < 0 ? `telat ${-n} hari` : n === 0 ? "hari ini" : `${n} hari lagi`})
                            </span>
                          )}
                        </p>
                        {d.notes && <p className="mt-1 text-xs text-slate-400">{d.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{formatRupiah(remaining)}</p>
                        <p className="text-xs text-slate-400">dari {formatRupiah(d.amount)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full ${d.status === "paid" ? "bg-emerald-500" : "bg-sky-500"}`} style={{ width: `${progress}%` }} />
                      </div>
                      {d.status === "paid" ? <Badge tone="emerald">Lunas</Badge> : n < 0 ? <Badge tone="rose">Jatuh Tempo</Badge> : d.status === "partial" ? <Badge tone="sky">{progress}% dibayar</Badge> : <Badge tone="amber">Belum bayar</Badge>}
                    </div>
                    {debtPayments.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t border-dashed border-slate-200 pt-3 text-xs">
                        {debtPayments.map((p) => (
                          <li key={p.id} className="flex justify-between text-slate-500">
                            <span>
                              ↓ {formatDate(p.paidAt)} · {p.method}
                              {p.note ? ` · ${p.note}` : ""}
                            </span>
                            <span className="font-medium text-emerald-600">+{formatRupiah(p.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div>
            <h2 className="mb-3 font-semibold text-slate-900">Pembayaran Terakhir</h2>
            <Card>
              {paymentRows.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-400">Belum ada pembayaran.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {paymentRows.slice(0, 6).map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate text-slate-800">{p.description}</p>
                        <p className="text-xs text-slate-400">
                          {formatDate(p.paidAt)} · {p.method}
                        </p>
                      </div>
                      <span className="font-semibold text-emerald-600">+{formatRupiah(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <div>
            <h2 className="mb-3 font-semibold text-slate-900">Pengingat WA Terkirim</h2>
            <Card>
              {reminders.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-400">Belum pernah dikirim pengingat.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {reminders.map((r) => (
                    <li key={r.id} className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span>
                        <Badge tone={r.status === "sent" ? "emerald" : r.status === "failed" ? "rose" : "slate"}>
                          {r.status === "sent" ? "Terkirim" : r.status === "failed" ? "Gagal" : "Simulasi"}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{r.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
