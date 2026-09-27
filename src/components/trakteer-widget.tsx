"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button, Modal } from "@/components/ui";
import { formatRupiah } from "@/lib/utils";

const TRAKTEER_URL = "https://trakteer.id/perpus_opera/";

const NOMINALS = [6000, 12000, 18000, 30000, 50000, 100000];
const STEP = 6000;

export function TrakteerWidget() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(NOMINALS[0]);
  const [custom, setCustom] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);

  const effective = custom.trim() ? snapToStep(Number(custom.replace(/\D/g, ""))) : amount;
  const qrLoading = open && !qr && !qrFailed;

  useEffect(() => {
    if (!open) return;
    let active = true;
    QRCode.toDataURL(TRAKTEER_URL, {
      width: 256,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1f2937", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setQr(url);
      })
      .catch(() => {
        if (active) setQrFailed(true);
      });
    return () => {
      active = false;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQrFailed(false);
          setOpen(true);
        }}
        className="group fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl bg-gradient-to-br from-[#ff613b] to-[#ff8a5b] px-4 py-3 text-left text-white shadow-lg shadow-[#ff613b]/30 ring-1 ring-white/25 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95 sm:max-w-sm"
        aria-label="Trakteer — dukung pengembangan web app ini"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xl">
          <span className="absolute inset-0 animate-ping rounded-xl bg-white/30 [animation-duration:2.5s]" />
          <span className="relative">☕</span>
        </span>
        <span className="text-sm font-semibold leading-tight drop-shadow-sm">
          Web app ini gratis &amp; bebas iklan.
          <br className="hidden sm:block" /> Kopi kecil, server tetap jalan
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Trakteer Kopi ☕" description="Pilih nominal traktiran — sepenuhnya untuk biaya server & pengembangan.">
        <div className="space-y-5">
          {/* Nominal chips */}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">Nominal traktiran (mulai Rp6.000 &amp; kelipatannya)</p>
            <div className="grid grid-cols-3 gap-2">
              {NOMINALS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setAmount(n);
                    setCustom("");
                  }}
                  className={
                    "rounded-xl border px-2 py-2.5 text-sm font-semibold tabular-nums transition " +
                    (effective === n && !custom.trim()
                      ? "border-[#ff613b] bg-[#fff1ec] text-[#ff613b] ring-1 ring-[#ff613b]/30"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50")
                  }
                >
                  {formatRupiah(n)}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Jumlah lain</span>
              <div className="flex flex-1 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCustom(String(snapToStep((Number(custom.replace(/\D/g, "")) || STEP) - STEP)))}
                  className="h-8 w-8 shrink-0 rounded-lg bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
                  aria-label="Kurangi"
                >
                  −
                </button>
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">Rp</span>
                  <input
                    inputMode="numeric"
                    value={custom ? Number(custom.replace(/\D/g, "")).toLocaleString("id-ID") : ""}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder={String(NOMINALS[0])}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 pl-8 text-sm tabular-nums focus:border-[#ff613b] focus:outline-none focus:ring-4 focus:ring-[#ff613b]/10"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCustom(String(snapToStep((Number(custom.replace(/\D/g, "")) || 0) + STEP)))}
                  className="h-8 w-8 shrink-0 rounded-lg bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
                  aria-label="Tambah"
                >
                  +
                </button>
              </div>
            </div>
            {custom.trim() && Number(custom.replace(/\D/g, "")) < STEP && (
              <p className="mt-1.5 text-xs text-rose-600">Traktiran minimal {formatRupiah(STEP)}, naik kelipatan {formatRupiah(STEP)}.</p>
            )}
          </div>

          {/* Selected amount summary */}
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[#fff1ec] to-[#ffe8df] px-4 py-3">
            <span className="text-sm font-medium text-[#a8442a]">Total traktiran</span>
            <span className="text-lg font-bold tabular-nums text-[#ff613b]">{formatRupiah(effective)}</span>
          </div>

          {/* QR code */}
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              {qrLoading ? (
                <div className="h-[200px] w-[200px] animate-pulse rounded-lg bg-slate-100" />
              ) : qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR code halaman Trakteer" width={200} height={200} className="h-[200px] w-[200px]" />
              ) : (
                <div className="flex h-[200px] w-[200px] items-center justify-center text-center text-xs text-slate-400">
                  QR code gagal dimuat. Gunakan tombol di bawah.
                </div>
              )}
            </div>
            <p className="text-center text-xs text-slate-500">
              Scan QR dengan kamera HP Anda, atau buka halaman Trakteer langsung — lalu masukkan nominal{" "}
              <span className="font-semibold text-slate-700">{formatRupiah(effective)}</span>.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <a href={TRAKTEER_URL} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button className="w-full bg-[#ff613b] hover:bg-[#e8542f]">☕ Trakteer sekarang</Button>
            </a>
            <p className="text-center text-[11px] text-slate-400">
              Terima kasih telah mendukung web app ini — {""}
              <a href={TRAKTEER_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-[#ff613b] hover:underline">
                trakteer.id/perpus_opera
              </a>
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}

function snapToStep(value: number) {
  if (!Number.isFinite(value) || value <= 0) return STEP;
  return Math.ceil(value / STEP) * STEP;
}
