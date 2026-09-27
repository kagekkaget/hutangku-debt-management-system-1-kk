import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ToastProvider } from "@/components/ui";
import { TrakteerWidget } from "@/components/trakteer-widget";

export const metadata: Metadata = {
  title: "HutangKu — Pencatat Piutang Warung",
  description: "Catat piutang pelanggan warung, pantau jatuh tempo, dan kirim pengingat WhatsApp otomatis.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <ToastProvider>
          {children}
          <TrakteerWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
