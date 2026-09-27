"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Button, Card, ConfirmDialog, EmptyState, Input, Select, StatusBadge, useToast } from "@/components/ui";
import { DebtFormModal, PaymentModal, type CustomerOption, type DebtLike } from "@/components/debt-forms";
import { cn, daysUntil, formatDate, formatRupiah } from "@/lib/utils";
import { addPayment, createDebt, deleteDebt, updateDebt, type DebtInput, type PaymentInput } from "./actions";

export type DebtRow = DebtLike & { customerPhone: string | null };

type Filter = "all" | "open" | "overdue" | "partial" | "paid";

type OptimisticAction =
  | { type: "add"; row: DebtRow }
  | { type: "update"; id: number; row: Partial<DebtRow> }
  | { type: "delete"; id: number }
  | { type: "pay"; id: number; amount: number };

export function DebtsClient({
  initial,
  customers,
  openNew,
  initialCustomer,
  initialStatus,
}: {
  initial: DebtRow[];
  customers: CustomerOption[];
  openNew?: boolean;
  initialCustomer?: number;
  initialStatus?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>((["all", "open", "overdue", "partial", "paid"].includes(initialStatus ?? "") ? initialStatus : "open") as Filter);
  const [customerFilter, setCustomerFilter] = useState<number | "all">(initialCustomer ?? "all");
  const [formModal, setFormModal] = useState<{ mode: "create" } | { mode: "edit"; row: DebtRow } | null>(openNew ? { mode: "create" } : null);
  const [paying, setPaying] = useState<DebtRow | null>(null);
  const [deleting, setDeleting] = useState<DebtRow | null>(null);

  useEffect(() => {
    if (openNew) window.history.replaceState(null, "", "/dashboard/debts");
  }, [openNew]);

  const [rows, applyOptimistic] = useOptimistic(initial, (state: DebtRow[], action: OptimisticAction) => {
    switch (action.type) {
      case "add":
        return [action.row, ...state];
      case "update":
        return state.map((r) => (r.id === action.id ? { ...r, ...action.row } : r));
      case "delete":
        return state.filter((r) => r.id !== action.id);
      case "pay":
        return state.map((r) => {
          if (r.id !== action.id) return r;
          const paidAmount = r.paidAmount + action.amount;
          return { ...r, paidAmount, status: paidAmount >= r.amount ? "paid" : "partial" };
        });
    }
  });

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((r) => {
      if (customerFilter !== "all" && r.customerId !== customerFilter) return false;
      if (q && !r.customerName.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
      const overdue = r.status !== "paid" && daysUntil(r.dueDate) < 0;
      switch (filter) {
        case "open":
          return r.status !== "paid";
        case "overdue":
          return overdue;
        case "partial":
          return r.status === "partial";
        case "paid":
          return r.status === "paid";
        default:
          return true;
      }
    });
  }, [rows, query, filter, customerFilter]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      open: rows.filter((r) => r.status !== "paid").length,
      overdue: rows.filter((r) => r.status !== "paid" && daysUntil(r.dueDate) < 0).length,
      partial: rows.filter((r) => r.status === "partial").length,
      paid: rows.filter((r) => r.status === "paid").length,
    }),
    [rows],
  );

  const filteredTotal = filtered.reduce((s, r) => s + (r.amount - r.paidAmount), 0);

  function handleDebtSubmit(input: DebtInput) {
    const current = formModal;
    setFormModal(null);
    const customer = customers.find((c) => c.id === input.customerId);
    startTransition(async () => {
      if (current?.mode === "edit") {
        applyOptimistic({ type: "update", id: current.row.id, row: { ...input, notes: input.notes || null, customerName: customer?.name ?? current.row.customerName } });
        const res = await updateDebt(current.row.id, input);
        toast(res.ok ? "Catatan hutang diperbarui" : res.error, res.ok ? "success" : "error");
      } else {
        applyOptimistic({
          type: "add",
          row: {
            id: -Date.now(),
            customerId: input.customerId,
            customerName: customer?.name ?? "…",
            customerPhone: customer?.phone ?? null,
            description: input.description,
            amount: input.amount,
            paidAmount: 0,
            status: "unpaid",
            debtDate: input.debtDate,
            dueDate: input.dueDate,
            notes: input.notes || null,
          },
        });
        const res = await createDebt(input);
        toast(res.ok ? "Hutang berhasil dicatat" : res.error, res.ok ? "success" : "error");
      }
      router.refresh();
    });
  }

  function handlePayment(input: PaymentInput) {
    setPaying(null);
    startTransition(async () => {
      applyOptimistic({ type: "pay", id: input.debtId, amount: input.amount });
      const res = await addPayment(input);
      toast(res.ok ? `Pembayaran ${formatRupiah(input.amount)} dicatat` : res.error, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    startTransition(async () => {
      applyOptimistic({ type: "delete", id });
      const res = await deleteDebt(id);
      toast(res.ok ? "Catatan hutang dihapus" : res.error, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  const tabs: Array<{ key: Filter; label: string }> = [
    { key: "open", label: "Aktif" },
    { key: "overdue", label: "Jatuh Tempo" },
    { key: "partial", label: "Sebagian" },
    { key: "paid", label: "Lunas" },
    { key: "all", label: "Semua" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 text-sm">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition",
                filter === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
              )}
            >
              {t.label}
              <span className={cn("rounded-full px-1.5 text-[11px]", filter === t.key ? "bg-slate-100 text-slate-600" : "bg-slate-200/60 text-slate-500", t.key === "overdue" && counts.overdue > 0 && "bg-rose-100 text-rose-700")}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Cari…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full lg:w-44" />
          <Select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value === "all" ? "all" : Number(e.target.value))} className="w-full lg:w-48">
            <option value="all">Semua pelanggan</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Button onClick={() => setFormModal({ mode: "create" })} className="shrink-0">
            + Catat
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3 text-sm">
          <span className="text-slate-500">
            {filtered.length} catatan{isPending && <span className="ml-2 text-xs text-emerald-600">menyimpan…</span>}
          </span>
          <span className="text-slate-600">
            Sisa: <span className="font-semibold text-slate-900">{formatRupiah(filteredTotal)}</span>
          </span>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon="🧾"
            title={rows.length === 0 ? "Belum ada catatan hutang" : "Tidak ada catatan di filter ini"}
            description={rows.length === 0 ? "Mulai catat hutang pelanggan agar tidak lupa dan tidak hilang." : "Coba pilih filter atau pelanggan lain."}
            action={rows.length === 0 ? <Button onClick={() => setFormModal({ mode: "create" })}>+ Catat Hutang</Button> : undefined}
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm md:table">
              <thead className="bg-white text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Pelanggan</th>
                  <th className="px-3 py-3 font-medium">Keterangan</th>
                  <th className="px-3 py-3 font-medium text-right">Jumlah</th>
                  <th className="px-3 py-3 font-medium text-right">Sisa</th>
                  <th className="px-3 py-3 font-medium">Jatuh tempo</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d) => {
                  const n = daysUntil(d.dueDate);
                  const remaining = d.amount - d.paidAmount;
                  const progress = Math.min(100, Math.round((d.paidAmount / d.amount) * 100));
                  return (
                    <tr key={d.id} className={cn("transition hover:bg-slate-50/70", d.id < 0 && "opacity-60")}>
                      <td className="px-5 py-3">
                        <Link href={d.customerId ? `/dashboard/customers/${d.customerId}` : "#"} className="flex items-center gap-2.5">
                          <Avatar name={d.customerName} size="sm" />
                          <span className="font-medium text-slate-900 hover:text-emerald-700">{d.customerName}</span>
                        </Link>
                      </td>
                      <td className="max-w-[240px] px-3 py-3">
                        <p className="truncate text-slate-800">{d.description}</p>
                        <p className="text-xs text-slate-400">{formatDate(d.debtDate)}</p>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-700">{formatRupiah(d.amount)}</td>
                      <td className="px-3 py-3 text-right">
                        <p className={cn("font-semibold tabular-nums", remaining > 0 ? "text-slate-900" : "text-emerald-600")}>{formatRupiah(remaining)}</p>
                        {d.status === "partial" && (
                          <div className="ml-auto mt-1 h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full bg-sky-500" style={{ width: `${progress}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-slate-800">{formatDate(d.dueDate)}</p>
                        {d.status !== "paid" && (
                          <p className={cn("text-xs", n < 0 ? "font-medium text-rose-600" : n <= 3 ? "text-amber-600" : "text-slate-400")}>
                            {n < 0 ? `telat ${-n} hari` : n === 0 ? "hari ini" : `${n} hari lagi`}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={d.status} dueDate={d.dueDate} />
                      </td>
                      <td className="px-5 py-3">
                        <RowActions d={d} onPay={() => setPaying(d)} onEdit={() => setFormModal({ mode: "edit", row: d })} onDelete={() => setDeleting(d)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {filtered.map((d) => {
                const n = daysUntil(d.dueDate);
                const remaining = d.amount - d.paidAmount;
                return (
                  <li key={d.id} className={cn("p-4", d.id < 0 && "opacity-60")}>
                    <div className="flex items-start gap-3">
                      <Avatar name={d.customerName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-medium text-slate-900">{d.customerName}</p>
                          <StatusBadge status={d.status} dueDate={d.dueDate} />
                        </div>
                        <p className="truncate text-sm text-slate-600">{d.description}</p>
                        <div className="mt-2 flex items-end justify-between">
                          <div>
                            <p className="text-xs text-slate-400">Sisa dari {formatRupiah(d.amount)}</p>
                            <p className="text-base font-bold text-slate-900">{formatRupiah(remaining)}</p>
                          </div>
                          <div className="text-right text-xs">
                            <p className="text-slate-500">Tempo {formatDate(d.dueDate)}</p>
                            {d.status !== "paid" && (
                              <p className={cn(n < 0 ? "font-medium text-rose-600" : "text-slate-400")}>{n < 0 ? `telat ${-n} hari` : n === 0 ? "hari ini" : `${n} hari lagi`}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <RowActions d={d} onPay={() => setPaying(d)} onEdit={() => setFormModal({ mode: "edit", row: d })} onDelete={() => setDeleting(d)} always />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      <DebtFormModal
        open={formModal !== null}
        onClose={() => setFormModal(null)}
        customers={customers}
        initial={formModal?.mode === "edit" ? formModal.row : undefined}
        defaultCustomerId={customerFilter !== "all" ? customerFilter : undefined}
        onSubmit={handleDebtSubmit}
        pending={isPending}
      />
      <PaymentModal open={paying !== null} onClose={() => setPaying(null)} debt={paying} onSubmit={handlePayment} pending={isPending} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Hapus catatan hutang?"
        description={deleting ? `"${deleting.description}" milik ${deleting.customerName} beserta riwayat pembayarannya akan dihapus permanen.` : undefined}
      />
    </div>
  );
}

function RowActions({ d, onPay, onEdit, onDelete, always }: { d: DebtRow; onPay: () => void; onEdit: () => void; onDelete: () => void; always?: boolean }) {
  return (
    <div className={cn("flex items-center justify-end gap-1", !always && "opacity-0 transition group-hover:opacity-100 md:opacity-100")}>
      {d.status !== "paid" && (
        <Button size="sm" variant="success" onClick={onPay} disabled={d.id < 0}>
          Bayar
        </Button>
      )}
      <button onClick={onEdit} disabled={d.id < 0} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Ubah">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
        </svg>
      </button>
      <button onClick={onDelete} disabled={d.id < 0} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Hapus">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
        </svg>
      </button>
    </div>
  );
}
