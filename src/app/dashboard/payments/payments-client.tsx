"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Card, ConfirmDialog, EmptyState, Input, Select, useToast } from "@/components/ui";
import { formatDate, formatRupiah } from "@/lib/utils";
import { deletePayment } from "../debts/actions";

type PaymentRow = {
  id: number;
  amount: number;
  method: string;
  note: string | null;
  paidAt: string;
  debtId: number;
  description: string;
  customerId: number;
  customerName: string;
};

const methodTone: Record<string, "emerald" | "sky" | "violet" | "slate"> = {
  tunai: "emerald",
  transfer: "sky",
  qris: "violet",
};

export function PaymentsClient({ initial }: { initial: PaymentRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("all");
  const [deleting, setDeleting] = useState<PaymentRow | null>(null);
  const [rows, removeOptimistic] = useOptimistic(initial, (state: PaymentRow[], id: number) => state.filter((r) => r.id !== id));

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((r) => {
      if (method !== "all" && r.method !== method) return false;
      if (q && !r.customerName.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, method]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, PaymentRow[]>();
    for (const r of filtered) {
      const arr = map.get(r.paidAt) ?? [];
      arr.push(r);
      map.set(r.paidAt, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  function handleDelete() {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    startTransition(async () => {
      removeOptimistic(id);
      const res = await deletePayment(id);
      toast(res.ok ? "Pembayaran dibatalkan, sisa hutang dikembalikan" : res.error, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Cari pelanggan / keterangan…" value={query} onChange={(e) => setQuery(e.target.value)} className="sm:max-w-xs" />
        <Select value={method} onChange={(e) => setMethod(e.target.value)} className="sm:w-44">
          <option value="all">Semua metode</option>
          <option value="tunai">Tunai</option>
          <option value="transfer">Transfer</option>
          <option value="qris">QRIS</option>
          <option value="lainnya">Lainnya</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon="💸" title="Belum ada pembayaran" description="Pembayaran akan muncul di sini saat pelanggan mencicil atau melunasi hutangnya." />
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-slate-700">{formatDate(date)}</h3>
                <span className="text-xs text-slate-500">{formatRupiah(items.reduce((s, i) => s + i.amount, 0))}</span>
              </div>
              <Card>
                <ul className="divide-y divide-slate-100">
                  {items.map((p) => (
                    <li key={p.id} className="group flex items-center gap-3 px-4 py-3">
                      <Avatar name={p.customerName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/dashboard/customers/${p.customerId}`} className="block truncate text-sm font-medium text-slate-900 hover:text-emerald-700">
                          {p.customerName}
                        </Link>
                        <p className="truncate text-xs text-slate-500">
                          {p.description}
                          {p.note ? ` · ${p.note}` : ""}
                        </p>
                      </div>
                      <Badge tone={methodTone[p.method] ?? "slate"} className="hidden sm:inline-flex">
                        {p.method}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums text-emerald-600">+{formatRupiah(p.amount)}</span>
                      <button onClick={() => setDeleting(p)} className="rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100" title="Batalkan pembayaran">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Batalkan pembayaran ini?"
        confirmLabel="Batalkan Pembayaran"
        description={deleting ? `Pembayaran ${formatRupiah(deleting.amount)} dari ${deleting.customerName} akan dihapus dan sisa hutang dikembalikan.` : undefined}
      />
    </div>
  );
}
