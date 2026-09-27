import Link from "next/link";
import { db } from "@/db";
import { customers, debts, payments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { AGING_LABELS, agingBucket, cn, daysUntil, formatDate, formatRupiah, type AgingBucket } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Avatar, Button, Card, EmptyState, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  const [openDebts, customerCount, recentPayments, recentDebts, monthPaid] = await Promise.all([
    db
      .select({
        id: debts.id,
        description: debts.description,
        amount: debts.amount,
        paidAmount: debts.paidAmount,
        status: debts.status,
        dueDate: debts.dueDate,
        customerId: debts.customerId,
        customerName: customers.name,
      })
      .from(debts)
      .innerJoin(customers, eq(customers.id, debts.customerId))
      .where(and(eq(debts.userId, user.id), ne(debts.status, "paid"))),
    db.select({ value: sql<number>`count(*)::int` }).from(customers).where(eq(customers.userId, user.id)),
    db
      .select({
        id: payments.id,
        amount: payments.amount,
        paidAt: payments.paidAt,
        method: payments.method,
        customerName: customers.name,
        description: debts.description,
      })
      .from(payments)
      .innerJoin(customers, eq(customers.id, payments.customerId))
      .innerJoin(debts, eq(debts.id, payments.debtId))
      .where(eq(payments.userId, user.id))
      .orderBy(desc(payments.paidAt), desc(payments.id))
      .limit(5),
    db
      .select({
        id: debts.id,
        description: debts.description,
        amount: debts.amount,
        paidAmount: debts.paidAmount,
        status: debts.status,
        dueDate: debts.dueDate,
        debtDate: debts.debtDate,
        customerName: customers.name,
      })
      .from(debts)
      .innerJoin(customers, eq(customers.id, debts.customerId))
      .where(eq(debts.userId, user.id))
      .orderBy(desc(debts.createdAt))
      .limit(5),
    db
      .select({ value: sql<number>`coalesce(sum(${payments.amount}), 0)::bigint` })
      .from(payments)
      .where(and(eq(payments.userId, user.id), gte(payments.paidAt, new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)))),
  ]);

  const totalOutstanding = openDebts.reduce((s, d) => s + (d.amount - d.paidAmount), 0);
  const overdue = openDebts.filter((d) => daysUntil(d.dueDate) < 0);
  const overdueTotal = overdue.reduce((s, d) => s + (d.amount - d.paidAmount), 0);
  const dueSoon = openDebts
    .filter((d) => {
      const n = daysUntil(d.dueDate);
      return n >= 0 && n <= 7;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const debtorsCount = new Set(openDebts.map((d) => d.customerId)).size;

  const aging: Record<AgingBucket, number> = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  for (const d of openDebts) aging[agingBucket(d.dueDate)] += d.amount - d.paidAmount;
  const agingMax = Math.max(1, ...Object.values(aging));
  const agingColors: Record<AgingBucket, string> = {
    current: "bg-emerald-500",
    "1-30": "bg-amber-400",
    "31-60": "bg-orange-500",
    "61-90": "bg-rose-500",
    "90+": "bg-rose-800",
  };

  // Top debtors
  const byCustomer = new Map<number, { name: string; total: number; count: number }>();
  for (const d of openDebts) {
    const e = byCustomer.get(d.customerId) ?? { name: d.customerName, total: 0, count: 0 };
    e.total += d.amount - d.paidAmount;
    e.count += 1;
    byCustomer.set(d.customerId, e);
  }
  const topDebtors = [...byCustomer.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 11) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  })();

  const stats = [
    {
      label: "Total Piutang Aktif",
      value: formatRupiah(totalOutstanding),
      sub: `${openDebts.length} catatan dari ${debtorsCount} pelanggan`,
      tone: "from-emerald-500 to-teal-600",
      icon: "💰",
    },
    {
      label: "Sudah Jatuh Tempo",
      value: formatRupiah(overdueTotal),
      sub: `${overdue.length} catatan perlu ditagih`,
      tone: "from-rose-500 to-pink-600",
      icon: "⏰",
    },
    {
      label: "Jatuh Tempo 7 Hari",
      value: formatRupiah(dueSoon.reduce((s, d) => s + (d.amount - d.paidAmount), 0)),
      sub: `${dueSoon.length} catatan segera jatuh tempo`,
      tone: "from-amber-400 to-orange-500",
      icon: "📅",
    },
    {
      label: "Terkumpul Bulan Ini",
      value: formatRupiah(Number(monthPaid[0]?.value ?? 0)),
      sub: `${customerCount[0]?.value ?? 0} pelanggan terdaftar`,
      tone: "from-sky-500 to-indigo-600",
      icon: "✅",
    },
  ];

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]} 👋`}
        description={`Berikut ringkasan piutang ${user.storeName} hari ini, ${formatDate(new Date())}.`}
        actions={
          <>
            <Link href="/dashboard/debts?new=1">
              <Button>+ Catat Hutang</Button>
            </Link>
          </>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="relative overflow-hidden p-5">
            <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-10", s.tone)} />
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              <span className="text-xl">{s.icon}</span>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{s.value}</p>
            <p className="mt-1 text-xs text-slate-500">{s.sub}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Aging */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Umur Piutang (Aging)</h2>
              <p className="text-xs text-slate-500">Distribusi sisa piutang berdasarkan keterlambatan</p>
            </div>
            <Link href="/dashboard/reports" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
              Lihat laporan →
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {(Object.keys(aging) as AgingBucket[]).map((k) => (
              <div key={k} className="grid grid-cols-[130px_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[160px_1fr_auto]">
                <span className="text-slate-600">{AGING_LABELS[k]}</span>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn("h-full rounded-full transition-all", agingColors[k])} style={{ width: `${(aging[k] / agingMax) * 100}%` }} />
                </div>
                <span className="w-28 text-right font-medium tabular-nums text-slate-900">{formatRupiah(aging[k])}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top debtors */}
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900">Penunggak Terbesar</h2>
          <p className="text-xs text-slate-500">Pelanggan dengan sisa hutang tertinggi</p>
          <div className="mt-4 space-y-3">
            {topDebtors.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Belum ada piutang aktif 🎉</p>}
            {topDebtors.map(([id, c], i) => (
              <Link key={id} href={`/dashboard/customers/${id}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50">
                <span className="w-4 text-xs font-semibold text-slate-400">{i + 1}</span>
                <Avatar name={c.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.count} catatan</p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-slate-900">{formatRupiah(c.total)}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Due soon / overdue */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Perlu Ditagih</h2>
              <p className="text-xs text-slate-500">Jatuh tempo & segera jatuh tempo</p>
            </div>
            <Link href="/dashboard/reminders" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
              Kirim pengingat →
            </Link>
          </div>
          {overdue.length + dueSoon.length === 0 ? (
            <EmptyState icon="🎉" title="Semua aman" description="Tidak ada piutang yang jatuh tempo dalam 7 hari ke depan." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {[...overdue.sort((a, b) => a.dueDate.localeCompare(b.dueDate)), ...dueSoon].slice(0, 6).map((d) => {
                const n = daysUntil(d.dueDate);
                return (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={d.customerName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{d.customerName}</p>
                      <p className="truncate text-xs text-slate-500">{d.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-slate-900">{formatRupiah(d.amount - d.paidAmount)}</p>
                      <p className={cn("text-xs", n < 0 ? "text-rose-600" : n === 0 ? "text-amber-600" : "text-slate-500")}>
                        {n < 0 ? `Telat ${-n} hari` : n === 0 ? "Hari ini" : `${n} hari lagi`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Recent activity */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Aktivitas Terbaru</h2>
              <p className="text-xs text-slate-500">Hutang & pembayaran terakhir</p>
            </div>
            <Link href="/dashboard/debts" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
              Semua →
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {recentPayments.slice(0, 3).map((p) => (
              <li key={`p${p.id}`} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">↓</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {p.customerName} <span className="font-normal text-slate-500">membayar</span>
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {p.description} · {formatDate(p.paidAt)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-600">+{formatRupiah(p.amount)}</span>
              </li>
            ))}
            {recentDebts.slice(0, 3).map((d) => (
              <li key={`d${d.id}`} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600">↑</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {d.customerName} <span className="font-normal text-slate-500">berhutang</span>
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {d.description} · {formatDate(d.debtDate)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-semibold text-slate-900">{formatRupiah(d.amount)}</span>
                  <StatusBadge status={d.status} dueDate={d.dueDate} />
                </div>
              </li>
            ))}
            {recentPayments.length + recentDebts.length === 0 && (
              <li>
                <EmptyState icon="📝" title="Belum ada aktivitas" description="Catat hutang pertama pelanggan Anda." />
              </li>
            )}
          </ul>
        </Card>
      </div>

      {overdue.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📲</span>
            <div>
              <p className="font-semibold text-rose-900">
                {overdue.length} piutang sudah lewat jatuh tempo — total {formatRupiah(overdueTotal)}
              </p>
              <p className="text-sm text-rose-700">Kirim pengingat WhatsApp ke pelanggan dengan sekali klik.</p>
            </div>
          </div>
          <Link href="/dashboard/reminders">
            <Button variant="danger">Kirim Pengingat WA</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
