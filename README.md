# HutangKu — Aplikasi Pencatat Piutang Warung

Aplikasi web untuk warung/toko kecil (UMKM) mencatat hutang pelanggan, memantau jatuh tempo,
melihat laporan piutang aging, dan mengirim pengingat otomatis via WhatsApp API Gateway.

**Akun demo:** `demo@hutangku.id` / `demo1234` (data demo dibuat otomatis saat pertama kali dibuka).

## Fitur
- 🔐 Login / registrasi (sesi JWT httpOnly, password bcrypt)
- 📊 Dashboard ringkasan: total piutang, jatuh tempo, aging chart, penunggak terbesar
- 👥 CRUD Pelanggan + halaman detail riwayat hutang & pembayaran
- 🧾 CRUD Piutang, cicilan/pembayaran, status otomatis (belum bayar / sebagian / lunas / jatuh tempo)
- 💸 Riwayat pembayaran (bisa dibatalkan → sisa hutang dikembalikan)
- 📈 Laporan piutang aging (belum tempo, 1–30, 31–60, 61–90, >90 hari) + ekspor CSV
- 📲 Pengingat WhatsApp: kirim massal/satuan, pratinjau, template pesan kustom, riwayat log
- ⏰ Endpoint cron `GET /api/cron/reminders` untuk pengingat otomatis harian

## WhatsApp Gateway
Atur environment variable berikut (lihat `.env.example`):

| Variabel | Keterangan |
| --- | --- |
| `WA_GATEWAY_PROVIDER` | `fonnte`, `wablas`, atau `generic` |
| `WA_GATEWAY_URL` | Endpoint kirim pesan gateway |
| `WA_GATEWAY_TOKEN` | Token/API key gateway |
| `CRON_SECRET` | Melindungi endpoint cron |

Tanpa konfigurasi, pengiriman berjalan dalam **mode simulasi** (pesan dicatat, tidak dikirim).

## Stack
Next.js (App Router, Server Actions) · PostgreSQL · Drizzle ORM · Tailwind CSS · jose · bcryptjs
