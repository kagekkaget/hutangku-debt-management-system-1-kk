# ☕ HutangKu — Aplikasi Pencatat Piutang Warung

**Open Source oleh MZF – 2026** · Lisensi MIT

Aplikasi web untuk warung/toko kecil (UMKM) mencatat hutang pelanggan, memantau jatuh tempo,
melihat laporan piutang aging, dan mengirim pengingat otomatis via WhatsApp API Gateway.

**Akun demo:** `demo@hutangku.id` / `demo1234` (data demo dibuat otomatis saat pertama kali dibuka).

---

## 📥 Download Source Code

Source code lengkap aplikasi ini tersedia untuk diunduh langsung dari dalam aplikasi:

- **Dari dalam aplikasi:** menu **Pengaturan → Source Code & Lisensi → Unduh Source Code Lengkap (.zip)**
- **Hasil build:** file `public/hutangku-source.zip` di-generate otomatis sebelum setiap build
  (npm script `prebuild`), atau jalankan manual:
  ```bash
  npm run pack
  ```
- **Alternatif:** clone repository ini langsung.

Arsip berisi seluruh source code (`src/`, `scripts/`, `drizzle/`, konfigurasi, dan dokumentasi).
File `.env` dan rahasia lain **tidak** disertakan.

---

## ✨ Fitur

- 🔐 **Login / registrasi** — sesi JWT httpOnly, password di-hash dengan bcrypt
- 📊 **Dashboard ringkasan** — total piutang, jatuh tempo, aging chart, penunggak terbesar
- 👥 **CRUD Pelanggan** + halaman detail riwayat hutang & pembayaran
- 🧾 **CRUD Piutang** — cicilan/pembayaran, status otomatis (belum bayar / sebagian / lunas / jatuh tempo)
- 💸 **Riwayat pembayaran** — bisa dibatalkan, sisa hutang dikembalikan otomatis
- 📈 **Laporan piutang aging** — belum tempo, 1–30, 31–60, 61–90, >90 hari + ekspor CSV
- 📲 **Pengingat WhatsApp** — kirim massal/satuan, pratinjau pesan, template kustom, riwayat log
- ⏰ **Endpoint cron** `GET /api/cron/reminders` untuk pengingat otomatis harian
- ☕ **Widget Trakteer** — dukung pengembangan tanpa berpindah halaman (nominal + QR code in-app)

## 🛠 Stack

- **Next.js 16** (App Router, Server Actions, Turbopack)
- **PostgreSQL** (Neon / database manapun) + **Drizzle ORM**
- **Tailwind CSS v4**
- **jose** (JWT) · **bcryptjs** (hashing) · **qrcode** (QR generator)

## 🚀 Instalasi & Menjalankan

```bash
# 1. Install dependency
npm install

# 2. Siapkan database (lihat bagian Database di bawah)
# 3. Salin & lengkapi environment variable
cp .env.example .env

# 4. Jalankan mode pengembangan
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Akun demo otomatis dibuat saat pertama kali login.

### Verifikasi

```bash
npm run typecheck   # cek tipe TypeScript
npm run lint        # ESLint
npm run build       # build produksi (+ auto-pack source code)
```

## 🗄 Database

Aplikasi membutuhkan database PostgreSQL. Skema Drizzle ada di `src/db/schema.ts` dan migrasi
SQL siap pakai di `drizzle/0000_init.sql`.

**Membuat schema (pilih salah satu):**

```bash
# Opsi A — drizzle-kit (butuh DATABASE_URL di environment)
DATABASE_URL="postgresql://..." npx drizzle-kit push --config=drizzle.config.json --force

# Opsi B — jalankan SQL migration langsung
psql "$DATABASE_URL" -f drizzle/0000_init.sql
```

**Tabel:**

| Tabel | Isi |
| --- | --- |
| `users` | akun, nama warung, template pesan pengingat |
| `customers` | data pelanggan (nama, HP, alamat, catatan) |
| `debts` | catatan piutang: jumlah, tanggal, jatuh tempo, status |
| `payments` | riwayat pembayaran/cicilan |
| `reminder_logs` | log pengiriman pengingat WhatsApp |

Data demo (12 pelanggan, 22 piutang, 11 pembayaran) dibuat otomatis saat pertama kali dibuka
jika tabel `users` masih kosong — lihat `src/db/seed.ts`.

## ⚙️ Environment Variable

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Connection string PostgreSQL (mis. Neon) |
| `AUTH_SECRET` | ✅ | Secret untuk menandatangani sesi JWT — gunakan string acak panjang |
| `WA_GATEWAY_PROVIDER` | – | `fonnte`, `wablas`, atau `generic` |
| `WA_GATEWAY_URL` | – | Endpoint kirim pesan gateway |
| `WA_GATEWAY_TOKEN` | – | Token/API key gateway |
| `CRON_SECRET` | – | Melindungi endpoint cron |

### WhatsApp Gateway

| Provider | Konfigurasi |
| --- | --- |
| `fonnte` | URL `https://api.fonnte.com/send` |
| `wablas` | URL `https://<domain>.wablas.com/api/send-message` |
| `generic` | POST JSON `{ phone, message }` dengan `Authorization: Bearer <token>` |

Tanpa konfigurasi gateway, pengiriman berjalan dalam **mode simulasi** (pesan dicatat di log, tidak dikirim).

## ☁️ Deploy ke Vercel

1. Push repository ini ke GitHub.
2. Import project di [vercel.com](https://vercel.com) (framework: Next.js).
3. Tambahkan environment variable (Settings → Environment Variables):
   - `DATABASE_URL` — connection string Neon Anda
   - `AUTH_SECRET` — string acak panjang
   - `CRON_SECRET` — disarankan diatur untuk melindungi endpoint cron
   - `WA_GATEWAY_*` — opsional
4. Deploy. Selesai.

### Pengingat otomatis (cron)

Setelah deploy, panggil endpoint ini setiap hari melalui Vercel Cron, cron-job.org, atau layanan serupa:

```
GET https://<domain-anda>/api/cron/reminders
Authorization: Bearer <CRON_SECRET>
```

Endpoint mengirim pengingat untuk piutang yang jatuh tempo besok/hari ini, serta yang sudah
jatuh tempo (sekali per 7 hari agar tidak spam).

## ☕ Dukung Pengembangan

Web app ini **gratis & bebas iklan**. Jika bermanfaat, dukung biaya server & pengembangan:

👉 **[trakteer.id/perpus_opera](https://trakteer.id/perpus_opera/)**

Klik tombol Trakteer di sudut kanan bawah layar untuk memilih nominal (mulai Rp6.000) dan
scan QR code langsung tanpa berpindah halaman.

## 📄 Lisensi

```
MIT License

Copyright (c) 2026 MZF

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

**Open Source oleh MZF – 2026** · Dibuat untuk UMKM Indonesia 🇮🇩
