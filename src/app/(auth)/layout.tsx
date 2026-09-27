import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  await ensureSeeded();
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative">
          <Logo light />
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Catatan hutang pelanggan yang rapi, tak lagi hilang.
          </h1>
          <p className="mt-4 text-emerald-100">
            HutangKu membantu warung & toko kecil mencatat siapa berhutang berapa, memantau jatuh tempo,
            dan mengirim pengingat WhatsApp otomatis.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-emerald-50">
            {[
              "Catat piutang & cicilan pembayaran dalam hitungan detik",
              "Laporan piutang aging: tahu siapa yang paling lama nunggak",
              "Pengingat jatuh tempo otomatis via WhatsApp Gateway",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/30 text-xs">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-emerald-200/70">© {new Date().getFullYear()} HutangKu · Dibuat untuk UMKM Indonesia</p>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
