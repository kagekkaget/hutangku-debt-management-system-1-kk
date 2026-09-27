"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { addDaysISO, formatRupiah, todayISO } from "@/lib/utils";
import type { DebtInput, PaymentInput } from "@/app/dashboard/debts/actions";

export type CustomerOption = { id: number; name: string; phone?: string | null };

export type DebtLike = {
  id: number;
  customerId: number;
  customerName: string;
  description: string;
  amount: number;
  paidAmount: number;
  status: "unpaid" | "partial" | "paid";
  debtDate: string;
  dueDate: string;
  notes: string | null;
};

/** Formats digits to Indonesian thousand separators while typing */
function useMoneyInput(initial = 0) {
  const [raw, setRaw] = useState(initial ? String(initial) : "");
  const display = raw ? Number(raw).toLocaleString("id-ID") : "";
  const onChange = (v: string) => setRaw(v.replace(/\D/g, ""));
  return { value: Number(raw || 0), display, onChange, reset: (n = 0) => setRaw(n ? String(n) : "") };
}

export function DebtFormModal({
  open,
  onClose,
  customers,
  initial,
  defaultCustomerId,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  customers: CustomerOption[];
  initial?: DebtLike;
  defaultCustomerId?: number;
  onSubmit: (input: DebtInput) => void;
  pending?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={initial ? "Ubah Catatan Hutang" : "Catat Hutang Baru"} description="Catat barang yang diambil pelanggan dan kapan harus dibayar.">
      <DebtFormInner key={initial?.id ?? `new-${defaultCustomerId ?? 0}`} customers={customers} initial={initial} defaultCustomerId={defaultCustomerId} onSubmit={onSubmit} onClose={onClose} pending={pending} />
    </Modal>
  );
}

function DebtFormInner({
  customers,
  initial,
  defaultCustomerId,
  onSubmit,
  onClose,
  pending,
}: {
  customers: CustomerOption[];
  initial?: DebtLike;
  defaultCustomerId?: number;
  onSubmit: (input: DebtInput) => void;
  onClose: () => void;
  pending?: boolean;
}) {
  const money = useMoneyInput(initial?.amount ?? 0);
  const [debtDate, setDebtDate] = useState(initial?.debtDate ?? todayISO());
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? addDaysISO(14));

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      customerId: Number(fd.get("customerId")),
      description: String(fd.get("description") ?? ""),
      amount: money.value,
      debtDate,
      dueDate,
      notes: String(fd.get("notes") ?? ""),
    });
  }

  const quickTerms = [
    { label: "7 hari", days: 7 },
    { label: "14 hari", days: 14 },
    { label: "30 hari", days: 30 },
  ];

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Pelanggan">
        <Select name="customerId" defaultValue={initial?.customerId ?? defaultCustomerId ?? ""} required>
          <option value="" disabled>
            Pilih pelanggan…
          </option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Keterangan / barang">
        <Input name="description" defaultValue={initial?.description ?? ""} placeholder="Beras 5kg, minyak 2L, gula 1kg" required autoFocus />
      </Field>
      <Field label="Jumlah (Rp)" hint={initial ? `sudah dibayar ${formatRupiah(initial.paidAmount)}` : undefined}>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">Rp</span>
          <Input value={money.display} onChange={(e) => money.onChange(e.target.value)} placeholder="0" inputMode="numeric" className="pl-10 text-lg font-semibold" required />
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal hutang">
          <Input type="date" value={debtDate} onChange={(e) => setDebtDate(e.target.value)} required />
        </Field>
        <Field label="Jatuh tempo">
          <Input type="date" value={dueDate} min={debtDate} onChange={(e) => setDueDate(e.target.value)} required />
          <div className="mt-2 flex gap-1.5">
            {quickTerms.map((t) => (
              <button
                key={t.days}
                type="button"
                onClick={() => setDueDate(addDaysISO(t.days, debtDate))}
                className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
              >
                +{t.label}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <Field label="Catatan (opsional)">
        <Textarea name="notes" defaultValue={initial?.notes ?? ""} placeholder="Info tambahan…" className="min-h-[64px]" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" loading={pending}>
          {initial ? "Simpan Perubahan" : "Simpan Hutang"}
        </Button>
      </div>
    </form>
  );
}

export function PaymentModal({
  open,
  onClose,
  debt,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  debt: DebtLike | null;
  onSubmit: (input: PaymentInput) => void;
  pending?: boolean;
}) {
  return (
    <Modal open={open && debt !== null} onClose={onClose} title="Catat Pembayaran" description={debt ? `${debt.customerName} · ${debt.description}` : undefined} size="sm">
      {debt && <PaymentInner key={debt.id} debt={debt} onSubmit={onSubmit} onClose={onClose} pending={pending} />}
    </Modal>
  );
}

function PaymentInner({ debt, onSubmit, onClose, pending }: { debt: DebtLike; onSubmit: (input: PaymentInput) => void; onClose: () => void; pending?: boolean }) {
  const remaining = debt.amount - debt.paidAmount;
  const money = useMoneyInput(remaining);
  const [paidAt, setPaidAt] = useState(todayISO());
  const over = money.value > remaining;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      debtId: debt.id,
      amount: money.value,
      method: String(fd.get("method") ?? "tunai"),
      paidAt,
      note: String(fd.get("note") ?? ""),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl bg-slate-50 p-3 text-sm">
        <div className="flex justify-between text-slate-500">
          <span>Total hutang</span>
          <span className="font-medium text-slate-900">{formatRupiah(debt.amount)}</span>
        </div>
        <div className="mt-1 flex justify-between text-slate-500">
          <span>Sudah dibayar</span>
          <span className="font-medium text-emerald-600">{formatRupiah(debt.paidAmount)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2">
          <span className="font-medium text-slate-700">Sisa</span>
          <span className="font-bold text-slate-900">{formatRupiah(remaining)}</span>
        </div>
      </div>
      <Field label="Jumlah dibayar (Rp)" error={over ? "Melebihi sisa hutang" : undefined}>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">Rp</span>
          <Input value={money.display} onChange={(e) => money.onChange(e.target.value)} inputMode="numeric" className="pl-10 text-lg font-semibold" required autoFocus />
        </div>
        <div className="mt-2 flex gap-1.5">
          <button type="button" onClick={() => money.reset(remaining)} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
            Lunasi semua
          </button>
          <button type="button" onClick={() => money.reset(Math.round(remaining / 2))} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200">
            Setengah
          </button>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Metode">
          <Select name="method" defaultValue="tunai">
            <option value="tunai">Tunai</option>
            <option value="transfer">Transfer</option>
            <option value="qris">QRIS</option>
            <option value="lainnya">Lainnya</option>
          </Select>
        </Field>
        <Field label="Tanggal">
          <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
        </Field>
      </div>
      <Field label="Catatan (opsional)">
        <Input name="note" placeholder="Misal: titip lewat anaknya" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" variant="success" loading={pending} disabled={over || money.value <= 0}>
          Simpan Pembayaran
        </Button>
      </div>
    </form>
  );
}
