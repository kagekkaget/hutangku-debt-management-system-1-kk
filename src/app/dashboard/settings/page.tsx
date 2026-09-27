import { requireUser } from "@/lib/auth";
import { waGatewayConfig } from "@/lib/wa";
import { PageHeader } from "@/components/page-header";
import { Badge, Card } from "@/components/ui";
import { ProfileForm, PasswordForm } from "./settings-forms";
import { db } from "@/db";
import { customers, debts, payments, reminderLogs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const cfg = waGatewayConfig();
  const cronSecretSet = Boolean(process.env.CRON_SECRET);

  const [[c], [d], [p], [r]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(customers).where(eq(customers.userId, user.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(debts).where(eq(debts.userId, user.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(payments).where(eq(payments.userId, user.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(reminderLogs).where(eq(reminderLogs.userId, user.id)),
  ]);

  return (
    <div>
      <PageHeader title="Pengaturan" description="Profil warung, keamanan akun, dan integrasi WhatsApp Gateway." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="font-semibold text-slate-900">Profil Warung</h2>
            <p className="mb-5 text-sm text-slate-500">Nama warung dipakai dalam pesan pengingat WhatsApp.</p>
            <ProfileForm user={{ name: user.name, storeName: user.storeName, phone: user.phone ?? "", email: user.email }} />
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-slate-900">Ubah Kata Sandi</h2>
            <p className="mb-5 text-sm text-slate-500">Gunakan kata sandi yang kuat dan mudah Anda ingat.</p>
            <PasswordForm />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">WhatsApp Gateway</h2>
              <Badge tone={cfg.configured ? "emerald" : "amber"}>{cfg.configured ? "Aktif" : "Simulasi"}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Integrasi dilakukan lewat environment variable (rahasia tidak disimpan di database).
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <Row k="WA_GATEWAY_PROVIDER" v={cfg.provider} />
              <Row k="WA_GATEWAY_URL" v={cfg.url ? maskUrl(cfg.url) : "belum diatur"} />
              <Row k="WA_GATEWAY_TOKEN" v={cfg.token ? "••••••••" : "belum diatur"} />
            </dl>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-medium text-slate-700">Provider yang didukung</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>
                  <code>fonnte</code> — URL <code>https://api.fonnte.com/send</code>
                </li>
                <li>
                  <code>wablas</code> — URL <code>https://&lt;domain&gt;.wablas.com/api/send-message</code>
                </li>
                <li>
                  <code>generic</code> — POST JSON <code>{"{ phone, message }"}</code> dengan Bearer token
                </li>
              </ul>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-slate-900">Pengingat Otomatis (Cron)</h2>
            <p className="mt-2 text-sm text-slate-500">
              Panggil endpoint berikut setiap hari (mis. via cron-job.org / Vercel Cron) untuk mengirim pengingat H-1 dan yang sudah jatuh tempo secara otomatis:
            </p>
            <code className="mt-3 block overflow-x-auto rounded-xl bg-slate-900 px-3 py-2 text-xs text-emerald-300">
              GET /api/cron/reminders
              <br />
              Authorization: Bearer $CRON_SECRET
            </code>
            <p className="mt-2 text-xs text-slate-500">
              CRON_SECRET: {cronSecretSet ? <Badge tone="emerald">terpasang</Badge> : <Badge tone="amber">belum diatur (endpoint terbuka)</Badge>}
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-slate-900">Data Anda</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              {[
                ["Pelanggan", c.n],
                ["Catatan hutang", d.n],
                ["Pembayaran", p.n],
                ["Pengingat", r.n],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="text-lg font-bold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-mono text-xs text-slate-500">{k}</dt>
      <dd className="truncate font-medium text-slate-800">{v}</dd>
    </div>
  );
}

function maskUrl(url: string) {
  try {
    const u = new URL(url);
    return u.host + u.pathname;
  } catch {
    return "diatur";
  }
}
