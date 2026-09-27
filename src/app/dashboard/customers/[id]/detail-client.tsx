"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfirmDialog, Modal, useToast } from "@/components/ui";
import { DebtFormModal, PaymentModal, type CustomerOption, type DebtLike } from "@/components/debt-forms";
import { CustomerFormModal } from "../customers-client";
import { createDebt, addPayment, type DebtInput, type PaymentInput } from "../../debts/actions";
import { deleteCustomer, updateCustomer, type CustomerInput } from "../actions";
import { sendReminders } from "../../reminders/actions";
import { formatRupiah } from "@/lib/utils";

export function CustomerDetailClient({
  customer,
  customers,
  debts,
  hasOverdue,
}: {
  customer: { id: number; name: string; phone: string | null; address: string | null; notes: string | null };
  customers: CustomerOption[];
  debts: DebtLike[];
  hasOverdue: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [debtOpen, setDebtOpen] = useState(false);
  const [payPick, setPayPick] = useState(false);
  const [paying, setPaying] = useState<DebtLike | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const openDebts = debts.filter((d) => d.status !== "paid");

  function handleDebt(input: DebtInput) {
    setDebtOpen(false);
    startTransition(async () => {
      const res = await createDebt(input);
      toast(res.ok ? "Hutang dicatat" : res.error, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  function handlePayment(input: PaymentInput) {
    setPaying(null);
    startTransition(async () => {
      const res = await addPayment(input);
      toast(res.ok ? `Pembayaran ${formatRupiah(input.amount)} dicatat` : res.error, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  function handleEdit(input: CustomerInput) {
    setEditOpen(false);
    startTransition(async () => {
      const res = await updateCustomer(customer.id, input);
      toast(res.ok ? "Data pelanggan diperbarui" : res.error, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  function handleDelete() {
    setDeleteOpen(false);
    startTransition(async () => {
      const res = await deleteCustomer(customer.id);
      if (res.ok) {
        toast("Pelanggan dihapus");
        router.push("/dashboard/customers");
      } else toast(res.error, "error");
    });
  }

  function handleRemind() {
    startTransition(async () => {
      const res = await sendReminders(openDebts.map((d) => d.id));
      if (!res.ok) return toast(res.error, "error");
      const sent = res.data.filter((r) => r.status === "sent").length;
      const sim = res.data.filter((r) => r.status === "simulated").length;
      const failed = res.data.filter((r) => r.status === "failed" || r.status === "skipped").length;
      toast(
        sent + sim > 0 ? `${sent + sim} pengingat ${sim > 0 ? "disimulasikan" : "terkirim"}${failed ? `, ${failed} gagal` : ""}` : "Tidak ada pengingat terkirim",
        failed > 0 && sent + sim === 0 ? "error" : "success",
      );
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDebtOpen(true)}>+ Catat Hutang</Button>
        {openDebts.length > 0 && (
          <Button variant="success" onClick={() => (openDebts.length === 1 ? setPaying(openDebts[0]) : setPayPick(true))}>
            Bayar
          </Button>
        )}
        {openDebts.length > 0 && customer.phone && (
          <Button variant={hasOverdue ? "danger" : "secondary"} onClick={handleRemind} loading={isPending}>
            📲 Ingatkan via WA
          </Button>
        )}
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          Ubah
        </Button>
        <Button variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => setDeleteOpen(true)}>
          Hapus
        </Button>
      </div>

      <DebtFormModal open={debtOpen} onClose={() => setDebtOpen(false)} customers={customers} defaultCustomerId={customer.id} onSubmit={handleDebt} pending={isPending} />
      <PaymentModal open={paying !== null} onClose={() => setPaying(null)} debt={paying} onSubmit={handlePayment} pending={isPending} />
      <CustomerFormModal open={editOpen} onClose={() => setEditOpen(false)} initial={customer} onSubmit={handleEdit} pending={isPending} />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={`Hapus ${customer.name}?`}
        description="Semua catatan hutang dan pembayaran pelanggan ini akan ikut terhapus."
      />
      <Modal open={payPick} onClose={() => setPayPick(false)} title="Pilih hutang yang dibayar" size="sm">
        <ul className="space-y-2">
          {openDebts.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => {
                  setPayPick(false);
                  setPaying(d);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm transition hover:border-emerald-400 hover:bg-emerald-50"
              >
                <span className="truncate text-slate-800">{d.description}</span>
                <span className="ml-3 shrink-0 font-semibold text-slate-900">{formatRupiah(d.amount - d.paidAmount)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
