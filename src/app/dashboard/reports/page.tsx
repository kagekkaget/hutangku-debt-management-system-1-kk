import Link from "next/link";
import { db } from "@/db";
import { customers, debts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq, ne } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { Avatar, Card, EmptyState } from "@/components/ui";
import { AGING_LABELS, agingBucket, cn, formatRupiah, type AgingBucket } from "@/lib/utils";
import { ExportButton } from "./export-button";

export const dynamic = "force-dynamic";

const BUCKETS: AgingBucket[] = ["current", "1-30", "31-60", "61-90", "90+"];
const BUCKET_TONE: Record<AgingBucket, string> = {
  current: "text-emerald-700 bg-emerald-50",
  "1-30": "text-amber-700 bg-amber-50",
  "31-60": "text-orange-700 bg-orange-50",
  "61-90": "text-rose-700 bg-rose-50",
  "90+": "text-rose-900 bg-rose-100",
};
const BAR_TONE: Record<AgingBucket, string> = {
  current: "bg-emerald-500",
  "1-30": "bg-amber-400",
  "31-60": "bg-orange-500",
  "61-90": "bg-rose-500",
  "90+": "bg-rose-800",
};

export default async function ReportsPage() {
  const user = await requireUser();
  const rows = await db
    .select({
      id: debts.id,
      amount: debts.amount,
      paidAmount: debts.paidAmount,
      dueDate: debts.dueDate,
      customerId: customers.id,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(debts)
    .innerJoin(customers, eq(customers.id, debts.customerId))
    .where(and(eq(debts.userId, user.id), ne(debts.status, "paid")));

  type Row = { id: number; name: string; phone: string | null; buckets: Record<AgingBucket, number>; total: number; count: number; maxOverdue: number };
  const byCustomer = new Map<number, Row>();
  const totals: Record<AgingBucket, number> = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };

  for (const d of rows) {
    const remaining = d.amount - d.paidAmount;
    const b = agingBucket(d.dueDate);
    totals[b] += remaining;
    const r = byCustomer.get(d.customerId) ?? {
      id: d.customerId,
      name: d.customerName,
      phone: d.customerPhone,
      buckets: { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
      total: 0,
      count: 0,
      maxOverdue: 0,
    };
    r.buckets[b] += remaining;
    r.total += remaining;
    r.count += 1;
    r.maxOverdue = Math.max(r.maxOverdue, BUCKETS.indexOf(b));
    byCustomer.set(d.customerId, r);
  }
  const report = [...byCustomer.values()].sort((a, b) => b.maxOverdue - a.maxOverdue || b.total - a.total);
  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
  const overdueTotal = grandTotal - totals.current;

  const csv = [
    ["Pelanggan", "No HP", ...BUCKETS.map((b) => AGING_LABELS[b]), "Total"].join(","),
    ...report.map((r) => [`"${r.name}"`, r.phone ?? "", ...BUCKETS.map((b) => r.buckets[b]), r.total].join(",")),
    ["TOTAL", "", ...BUCKETS.map((b) => totals[b]), grandTotal].join(","),
  ].join("\n");

  return (
    <div>
      <PageHeader
        title="Laporan Piutang Aging"
        description="Analisis umur piutang: seberapa lama hutang pelanggan sudah lewat jatuh tempo."
        actions={<ExportButton csv={csv} filename={`aging-${new Date().toISOString().slice(0, 10)}.csv`} />}
      />

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4 sm:col-span-3 lg:col-span-1">
          <p className="text-xs text-slate-500">Total piutang</p>
          <p className="text-lg font-bold text-slate-900">{formatRupiah(grandTotal)}</p>
          <p className="mt-1 text-xs text-rose-600">{grandTotal > 0 ? Math.round((overdueTotal / grandTotal) * 100) : 0}% sudah lewat tempo</p>
        </Card>
        {BUCKETS.map((b) => (
          <Card key={b} className="p-4">
            <p className="text-xs text-slate-500">{AGING_LABELS[b]}</p>
            <p className={cn("text-lg font-bold", b === "current" ? "text-emerald-600" : b === "1-30" ? "text-amber-600" : "text-rose-600")}>{formatRupiah(totals[b])}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={cn("h-full", BAR_TONE[b])} style={{ width: `${grandTotal ? (totals[b] / grandTotal) * 100 : 0}%` }} />
            </div>
          </Card>
        ))}
      </div>

      {/* Stacked bar */}
      {grandTotal > 0 && (
        <Card className="mt-5 p-5">
          <p className="mb-3 text-sm font-medium text-slate-700">Komposisi piutang</p>
          <div className="flex h-5 w-full overflow-hidden rounded-full bg-slate-100">
            {BUCKETS.map((b) =>
              totals[b] > 0 ? <div key={b} className={cn("h-full", BAR_TONE[b])} style={{ width: `${(totals[b] / grandTotal) * 100}%` }} title={`${AGING_LABELS[b]}: ${formatRupiah(totals[b])}`} /> : null,
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
            {BUCKETS.map((b) => (
              <span key={b} className="flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-full", BAR_TONE[b])} /> {AGING_LABELS[b]}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="mt-5 overflow-hidden">
        {report.length === 0 ? (
          <EmptyState icon="📊" title="Tidak ada piutang aktif" description="Semua pelanggan sudah lunas. Laporan aging akan muncul saat ada hutang yang belum dibayar." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Pelanggan</th>
                  {BUCKETS.map((b) => (
                    <th key={b} className="px-3 py-3 text-right font-medium">
                      {AGING_LABELS[b].replace("Telat ", "")}
                    </th>
                  ))}
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/customers/${r.id}`} className="flex items-center gap-2.5">
                        <Avatar name={r.name} size="sm" />
                        <div>
                          <p className="font-medium text-slate-900 hover:text-emerald-700">{r.name}</p>
                          <p className="text-xs text-slate-400">{r.count} catatan</p>
                        </div>
                      </Link>
                    </td>
                    {BUCKETS.map((b) => (
                      <td key={b} className="px-3 py-3 text-right tabular-nums">
                        {r.buckets[b] > 0 ? <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", BUCKET_TONE[b])}>{formatRupiah(r.buckets[b])}</span> : <span className="text-slate-300">–</span>}
                      </td>
                    ))}
                    <td className="px-5 py-3 text-right font-bold tabular-nums text-slate-900">{formatRupiah(r.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <tr>
                  <td className="px-5 py-3 text-slate-700">Total</td>
                  {BUCKETS.map((b) => (
                    <td key={b} className="px-3 py-3 text-right tabular-nums text-slate-900">
                      {formatRupiah(totals[b])}
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right tabular-nums text-slate-900">{formatRupiah(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
