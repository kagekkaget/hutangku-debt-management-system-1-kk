"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Button, Card, EmptyState, Modal, Textarea, useToast } from "@/components/ui";
import { cn, formatDate, formatDateTime, formatRupiah, renderTemplate } from "@/lib/utils";
import { sendReminders, updateReminderTemplate, type ReminderResult } from "./actions";

type Candidate = {
  id: number;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  customerId: number;
  customerName: string;
  customerPhone: string | null;
  daysLeft: number;
};

type Log = {
  id: number;
  phone: string;
  message: string;
  status: "sent" | "failed" | "simulated";
  response: string | null;
  createdAt: string;
  customerName: string | null;
};

export function RemindersClient({
  candidates,
  allOpen,
  logs,
  gateway,
  template,
  storeName,
}: {
  candidates: Candidate[];
  allOpen: Candidate[];
  logs: Log[];
  gateway: { configured: boolean; provider: string };
  template: string;
  storeName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [scope, setScope] = useState<"due" | "all">("due");
  const list = scope === "due" ? candidates : allOpen;
  const [selected, setSelected] = useState<Set<number>>(() => new Set(candidates.filter((c) => c.customerPhone).map((c) => c.id)));
  const [preview, setPreview] = useState<Candidate | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [tpl, setTpl] = useState(template);
  const [results, setResults] = useState<ReminderResult[] | null>(null);

  const selectable = list.filter((c) => c.customerPhone);
  const allSelected = selectable.length > 0 && selectable.every((c) => selected.has(c.id));

  const stats = useMemo(
    () => ({
      sent: logs.filter((l) => l.status === "sent").length,
      simulated: logs.filter((l) => l.status === "simulated").length,
      failed: logs.filter((l) => l.status === "failed").length,
    }),
    [logs],
  );

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectable.map((c) => c.id)));
  }

  function toggle(id: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function renderFor(c: Candidate) {
    return renderTemplate(tpl, {
      nama: c.customerName,
      warung: storeName,
      jumlah: formatRupiah(c.amount - c.paidAmount),
      keterangan: c.description,
      jatuh_tempo: formatDate(c.dueDate),
    });
  }

  function send(ids: number[]) {
    startTransition(async () => {
      const res = await sendReminders(ids);
      if (!res.ok) return toast(res.error, "error");
      setResults(res.data);
      const ok = res.data.filter((r) => r.status === "sent" || r.status === "simulated").length;
      toast(`${ok} dari ${res.data.length} pengingat diproses`, ok > 0 ? "success" : "error");
      setSelected(new Set());
      router.refresh();
    });
  }

  function saveTemplate() {
    startTransition(async () => {
      const res = await updateReminderTemplate(tpl);
      toast(res.ok ? "Template disimpan" : res.error, res.ok ? "success" : "error");
      if (res.ok) setTemplateOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Gateway status */}
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
          gateway.configured ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50",
        )}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{gateway.configured ? "🟢" : "🟡"}</span>
          <div>
            <p className={cn("font-semibold", gateway.configured ? "text-emerald-900" : "text-amber-900")}>
              {gateway.configured ? `WA Gateway aktif (${gateway.provider})` : "Mode simulasi — WA Gateway belum dikonfigurasi"}
            </p>
            <p className={cn("text-sm", gateway.configured ? "text-emerald-700" : "text-amber-800")}>
              {gateway.configured
                ? "Pesan akan dikirim langsung ke WhatsApp pelanggan."
                : "Pesan akan dicatat sebagai simulasi. Atur WA_GATEWAY_URL, WA_GATEWAY_TOKEN, dan WA_GATEWAY_PROVIDER (fonnte/wablas/generic) di environment untuk mengaktifkan pengiriman nyata."}
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setTemplateOpen(true)} className="shrink-0">
          ✏️ Ubah Template Pesan
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Candidates */}
        <Card className="overflow-hidden lg:col-span-3">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Perlu Diingatkan</h2>
              <p className="text-xs text-slate-500">Jatuh tempo ≤ 3 hari lagi atau sudah lewat</p>
            </div>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs">
              <button onClick={() => setScope("due")} className={cn("rounded-lg px-3 py-1.5 font-medium", scope === "due" ? "bg-white shadow-sm" : "text-slate-500")}>
                Segera ({candidates.length})
              </button>
              <button onClick={() => setScope("all")} className={cn("rounded-lg px-3 py-1.5 font-medium", scope === "all" ? "bg-white shadow-sm" : "text-slate-500")}>
                Semua aktif ({allOpen.length})
              </button>
            </div>
          </div>

          {list.length === 0 ? (
            <EmptyState icon="🎉" title="Tidak ada yang perlu diingatkan" description="Semua piutang masih jauh dari jatuh tempo." />
          ) : (
            <>
              <div className="flex items-center justify-between bg-slate-50/60 px-5 py-2.5 text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded accent-emerald-600" />
                  Pilih semua ({selectable.length})
                </label>
                <Button size="sm" onClick={() => send([...selected])} loading={isPending} disabled={selected.size === 0}>
                  📲 Kirim {selected.size > 0 ? `(${selected.size})` : ""}
                </Button>
              </div>
              <ul className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
                {list.map((c) => {
                  const disabled = !c.customerPhone;
                  return (
                    <li key={c.id} className={cn("flex items-center gap-3 px-5 py-3", disabled && "opacity-60")}>
                      <input type="checkbox" disabled={disabled} checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="h-4 w-4 rounded accent-emerald-600" />
                      <Avatar name={c.customerName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{c.customerName}</p>
                        <p className="truncate text-xs text-slate-500">
                          {c.description} · {c.customerPhone ?? "tanpa nomor WA"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{formatRupiah(c.amount - c.paidAmount)}</p>
                        <p className={cn("text-xs", c.daysLeft < 0 ? "font-medium text-rose-600" : c.daysLeft === 0 ? "text-amber-600" : "text-slate-500")}>
                          {c.daysLeft < 0 ? `telat ${-c.daysLeft} hari` : c.daysLeft === 0 ? "hari ini" : `${c.daysLeft} hari lagi`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setPreview(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Pratinjau pesan">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        <button onClick={() => send([c.id])} disabled={disabled || isPending} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40" title="Kirim sekarang">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        {/* Results + Log */}
        <div className="space-y-6 lg:col-span-2">
          {results && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Hasil Pengiriman</h3>
                <button onClick={() => setResults(null)} className="text-xs text-slate-400 hover:text-slate-600">
                  tutup
                </button>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {results.map((r) => (
                  <li key={r.debtId} className="flex items-center justify-between gap-2">
                    <span className="truncate text-slate-700">{r.customerName}</span>
                    <StatusChip status={r.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Riwayat Pengingat</h2>
              <div className="mt-1 flex gap-3 text-xs text-slate-500">
                <span>✅ {stats.sent} terkirim</span>
                <span>🧪 {stats.simulated} simulasi</span>
                <span>❌ {stats.failed} gagal</span>
              </div>
            </div>
            {logs.length === 0 ? (
              <EmptyState icon="📭" title="Belum ada riwayat" description="Pengingat yang Anda kirim akan tercatat di sini." />
            ) : (
              <ul className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
                {logs.map((l) => (
                  <li key={l.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">{l.customerName ?? l.phone}</p>
                      <StatusChip status={l.status} />
                    </div>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(l.createdAt)} · {l.phone}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{l.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Preview modal */}
      <Modal open={preview !== null} onClose={() => setPreview(null)} title="Pratinjau Pesan WA" description={preview ? `Ke ${preview.customerName} · ${preview.customerPhone ?? "-"}` : undefined} size="sm">
        {preview && (
          <>
            <div className="rounded-2xl rounded-tl-sm bg-[#dcf8c6] px-4 py-3 text-sm text-slate-800 shadow-sm whitespace-pre-wrap">{renderFor(preview)}</div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPreview(null)}>
                Tutup
              </Button>
              <Button
                onClick={() => {
                  send([preview.id]);
                  setPreview(null);
                }}
                disabled={!preview.customerPhone}
              >
                Kirim Sekarang
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Template modal */}
      <Modal open={templateOpen} onClose={() => setTemplateOpen(false)} title="Template Pesan Pengingat" description="Gunakan variabel di bawah — akan diganti otomatis saat dikirim.">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {["{nama}", "{warung}", "{jumlah}", "{keterangan}", "{jatuh_tempo}"].map((v) => (
            <button key={v} type="button" onClick={() => setTpl((t) => t + " " + v)} className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">
              {v}
            </button>
          ))}
        </div>
        <Textarea value={tpl} onChange={(e) => setTpl(e.target.value)} className="min-h-[140px]" />
        <p className="mt-3 text-xs font-medium text-slate-500">Contoh hasil:</p>
        <div className="mt-1 rounded-2xl rounded-tl-sm bg-[#dcf8c6] px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap">
          {renderTemplate(tpl, { nama: "Bu Siti", warung: storeName, jumlah: "Rp 145.000", keterangan: "Beras 10kg, minyak 2L", jatuh_tempo: formatDate(new Date()) })}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setTemplateOpen(false)}>
            Batal
          </Button>
          <Button onClick={saveTemplate} loading={isPending}>
            Simpan Template
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function StatusChip({ status }: { status: "sent" | "failed" | "simulated" | "skipped" }) {
  if (status === "sent") return <Badge tone="emerald">Terkirim</Badge>;
  if (status === "simulated") return <Badge tone="sky">Simulasi</Badge>;
  if (status === "skipped") return <Badge tone="slate">Dilewati</Badge>;
  return <Badge tone="rose">Gagal</Badge>;
}
