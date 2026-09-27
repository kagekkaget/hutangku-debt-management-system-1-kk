"use client";

import { useMemo, useOptimistic, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, Textarea, useToast } from "@/components/ui";
import { formatRupiah } from "@/lib/utils";
import { createCustomer, deleteCustomer, updateCustomer, type CustomerInput } from "./actions";

export type CustomerRow = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  outstanding: number;
  openCount: number;
  overdueCount: number;
};

type OptimisticAction =
  | { type: "add"; row: CustomerRow }
  | { type: "update"; id: number; input: CustomerInput }
  | { type: "delete"; id: number };

export function CustomersClient({ initial }: { initial: CustomerRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "debt" | "overdue" | "clear">("all");
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; row: CustomerRow } | null>(null);
  const [deleting, setDeleting] = useState<CustomerRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const [rows, applyOptimistic] = useOptimistic(initial, (state: CustomerRow[], action: OptimisticAction) => {
    switch (action.type) {
      case "add":
        return [action.row, ...state];
      case "update":
        return state.map((r) => (r.id === action.id ? { ...r, ...action.input, phone: action.input.phone || null, address: action.input.address || null, notes: action.input.notes || null } : r));
      case "delete":
        return state.filter((r) => r.id !== action.id);
    }
  });

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !(r.phone ?? "").includes(q) && !(r.address ?? "").toLowerCase().includes(q)) return false;
      if (filter === "debt") return r.outstanding > 0;
      if (filter === "overdue") return r.overdueCount > 0;
      if (filter === "clear") return r.outstanding === 0;
      return true;
    });
  }, [rows, query, filter]);

  const totals = useMemo(
    () => ({
      outstanding: rows.reduce((s, r) => s + r.outstanding, 0),
      withDebt: rows.filter((r) => r.outstanding > 0).length,
      overdue: rows.filter((r) => r.overdueCount > 0).length,
    }),
    [rows],
  );

  function handleSubmit(input: CustomerInput) {
    const current = modal;
    setModal(null);
    startTransition(async () => {
      if (current?.mode === "edit") {
        applyOptimistic({ type: "update", id: current.row.id, input });
        const res = await updateCustomer(current.row.id, input);
        if (!res.ok) toast(res.error, "error");
        else toast("Pelanggan diperbarui");
      } else {
        applyOptimistic({
          type: "add",
          row: {
            id: -Date.now(),
            name: input.name,
            phone: input.phone || null,
            address: input.address || null,
            notes: input.notes || null,
            createdAt: new Date().toISOString(),
            outstanding: 0,
            openCount: 0,
            overdueCount: 0,
          },
        });
        const res = await createCustomer(input);
        if (!res.ok) toast(res.error, "error");
        else toast("Pelanggan ditambahkan");
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    startTransition(async () => {
      applyOptimistic({ type: "delete", id });
      const res = await deleteCustomer(id);
      if (!res.ok) toast(res.error, "error");
      else toast("Pelanggan dihapus");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total pelanggan", value: rows.length, tone: "text-slate-900" },
          { label: "Punya hutang", value: totals.withDebt, tone: "text-amber-600" },
          { label: "Nunggak", value: totals.overdue, tone: "text-rose-600" },
        ].map((s) => (
          <Card key={s.label} className="px-4 py-3">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-xl font-bold ${s.tone}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
          <Input placeholder="Cari nama, nomor HP, alamat…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-sm">
          {(
            [
              ["all", "Semua"],
              ["debt", "Punya hutang"],
              ["overdue", "Nunggak"],
              ["clear", "Lunas"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${filter === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button onClick={() => setModal({ mode: "create" })}>+ Tambah Pelanggan</Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="👥"
            title={rows.length === 0 ? "Belum ada pelanggan" : "Tidak ada hasil"}
            description={rows.length === 0 ? "Tambahkan pelanggan yang biasa berhutang di warung Anda." : "Coba ubah kata kunci atau filter."}
            action={rows.length === 0 ? <Button onClick={() => setModal({ mode: "create" })}>+ Tambah Pelanggan</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className={`group relative p-4 transition hover:shadow-md ${c.id < 0 ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <Link href={c.id > 0 ? `/dashboard/customers/${c.id}` : "#"} className="block truncate font-semibold text-slate-900 hover:text-emerald-700">
                    {c.name}
                  </Link>
                  <p className="truncate text-xs text-slate-500">{c.phone ?? "Tanpa nomor HP"}</p>
                  {c.address && <p className="mt-0.5 truncate text-xs text-slate-400">{c.address}</p>}
                </div>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <button onClick={() => setModal({ mode: "edit", row: c })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Ubah">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
                    </svg>
                  </button>
                  <button onClick={() => setDeleting(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Hapus">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Sisa hutang</p>
                  <p className={`text-lg font-bold tabular-nums ${c.outstanding > 0 ? "text-slate-900" : "text-emerald-600"}`}>
                    {c.outstanding > 0 ? formatRupiah(c.outstanding) : "Lunas"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {c.overdueCount > 0 ? (
                    <Badge tone="rose">{c.overdueCount} nunggak</Badge>
                  ) : c.openCount > 0 ? (
                    <Badge tone="amber">{c.openCount} aktif</Badge>
                  ) : (
                    <Badge tone="emerald">Bersih</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CustomerFormModal
        open={modal !== null}
        onClose={() => setModal(null)}
        initial={modal?.mode === "edit" ? modal.row : undefined}
        onSubmit={handleSubmit}
        pending={isPending}
      />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title={`Hapus ${deleting?.name}?`}
        description="Semua catatan hutang dan pembayaran pelanggan ini juga akan dihapus. Tindakan ini tidak bisa dibatalkan."
      />
    </div>
  );
}

export function CustomerFormModal({
  open,
  onClose,
  initial,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<CustomerRow>;
  onSubmit: (input: CustomerInput) => void;
  pending?: boolean;
}) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      address: String(fd.get("address") ?? ""),
      notes: String(fd.get("notes") ?? ""),
    });
  }
  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? "Ubah Pelanggan" : "Tambah Pelanggan"} description="Data pelanggan yang berhutang di warung Anda.">
      <form key={initial?.id ?? "new"} onSubmit={submit} className="space-y-4">
        <Field label="Nama lengkap">
          <Input name="name" defaultValue={initial?.name ?? ""} placeholder="Bu Siti Aminah" required autoFocus />
        </Field>
        <Field label="Nomor WhatsApp" hint="untuk pengingat otomatis">
          <Input name="phone" defaultValue={initial?.phone ?? ""} placeholder="0812xxxxxxx" inputMode="tel" />
        </Field>
        <Field label="Alamat">
          <Input name="address" defaultValue={initial?.address ?? ""} placeholder="Jl. Melati No. 12" />
        </Field>
        <Field label="Catatan">
          <Textarea name="notes" defaultValue={initial?.notes ?? ""} placeholder="Misal: bayar tiap gajian tanggal 25" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" loading={pending}>
            {initial?.id ? "Simpan Perubahan" : "Tambah"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
