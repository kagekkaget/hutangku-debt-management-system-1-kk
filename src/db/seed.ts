import "server-only";
import { db } from "@/db";
import { users, customers, debts, payments, reminderLogs } from "@/db/schema";
import { count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { addDaysISO } from "@/lib/utils";

export const DEMO_EMAIL = "demo@hutangku.id";
export const DEMO_PASSWORD = "demo1234";

type SeedDebt = {
  customer: number;
  description: string;
  amount: number;
  daysAgo: number;
  termDays: number;
  payments?: Array<{ amount: number; daysAfter: number; method?: string }>;
};

const seedCustomers = [
  { name: "Bu Siti Aminah", phone: "081234567801", address: "Jl. Melati No. 12, RT 03/RW 05", notes: "Langganan sembako mingguan" },
  { name: "Pak Budi Santoso", phone: "081234567802", address: "Gang Mawar No. 4", notes: "Bayar tiap gajian tanggal 25" },
  { name: "Mbak Rina Wulandari", phone: "081234567803", address: "Kos Putri Anggrek, Kamar 7", notes: null },
  { name: "Pak Joko Prasetyo", phone: "081234567804", address: "Jl. Kenanga No. 8", notes: "Sering telat, ingatkan H-3" },
  { name: "Bu Dewi Lestari", phone: "081234567805", address: "Perum Griya Asri Blok C2", notes: null },
  { name: "Mas Agus Setiawan", phone: "081234567806", address: "Bengkel Agus, depan masjid", notes: "Ambil rokok & kopi harian" },
  { name: "Bu Haji Maryam", phone: "081234567807", address: "Jl. Raya Pasar No. 21", notes: "Pelanggan lama, terpercaya" },
  { name: "Pak Slamet Riyadi", phone: "081234567808", address: "Kampung Baru RT 01", notes: null },
  { name: "Mbak Fitri Handayani", phone: "081234567809", address: "Kontrakan Pak RT No. 3", notes: "Kirim WA setelah jam 5 sore" },
  { name: "Pak Hendra Gunawan", phone: "081234567810", address: "Warung Kopi Hendra", notes: "Belanja gas & galon" },
  { name: "Bu Yanti Kusuma", phone: "081234567811", address: "Jl. Dahlia No. 15", notes: null },
  { name: "Mas Dimas Pratama", phone: "081234567812", address: "Kos Pak Haji, lantai 2", notes: "Mahasiswa, bayar awal bulan" },
];

const seedDebts: SeedDebt[] = [
  { customer: 0, description: "Beras 10kg, minyak goreng 2L, gula 2kg", amount: 245000, daysAgo: 12, termDays: 14, payments: [{ amount: 100000, daysAfter: 5 }] },
  { customer: 0, description: "Telur 1kg, mie instan 1 dus", amount: 128000, daysAgo: 40, termDays: 14, payments: [{ amount: 128000, daysAfter: 10 }] },
  { customer: 1, description: "Rokok 2 slop, kopi sachet", amount: 320000, daysAgo: 20, termDays: 7 },
  { customer: 1, description: "Gas LPG 3kg x2", amount: 44000, daysAgo: 3, termDays: 10 },
  { customer: 2, description: "Sabun, shampoo, pasta gigi, detergen", amount: 87500, daysAgo: 5, termDays: 14 },
  { customer: 3, description: "Sembako bulanan", amount: 560000, daysAgo: 75, termDays: 30, payments: [{ amount: 150000, daysAfter: 20 }, { amount: 100000, daysAfter: 45, method: "transfer" }] },
  { customer: 3, description: "Pulsa listrik 100rb + rokok", amount: 135000, daysAgo: 35, termDays: 7 },
  { customer: 4, description: "Susu formula 2 kaleng", amount: 198000, daysAgo: 8, termDays: 14 },
  { customer: 4, description: "Popok bayi 1 pak besar", amount: 95000, daysAgo: 25, termDays: 14, payments: [{ amount: 95000, daysAfter: 12, method: "qris" }] },
  { customer: 5, description: "Kopi, rokok, gorengan (mingguan)", amount: 175000, daysAgo: 6, termDays: 7 },
  { customer: 5, description: "Kopi, rokok (minggu lalu)", amount: 160000, daysAgo: 13, termDays: 7, payments: [{ amount: 160000, daysAfter: 7 }] },
  { customer: 6, description: "Bahan kue: tepung 5kg, mentega, telur 3kg", amount: 275000, daysAgo: 2, termDays: 14 },
  { customer: 7, description: "Pupuk & obat tanaman", amount: 420000, daysAgo: 110, termDays: 30, payments: [{ amount: 120000, daysAfter: 60 }] },
  { customer: 8, description: "Makanan ringan & minuman", amount: 62000, daysAgo: 1, termDays: 14 },
  { customer: 9, description: "Galon isi ulang x10, gas 3kg x3", amount: 256000, daysAgo: 48, termDays: 14 },
  { customer: 9, description: "Galon isi ulang x8", amount: 160000, daysAgo: 18, termDays: 14, payments: [{ amount: 80000, daysAfter: 10 }] },
  { customer: 10, description: "Minyak goreng 5L, tepung, kecap", amount: 143000, daysAgo: 30, termDays: 30 },
  { customer: 11, description: "Mie instan 1 dus, kopi, roti", amount: 118000, daysAgo: 10, termDays: 21 },
  { customer: 11, description: "Pulsa 50rb + snack", amount: 58000, daysAgo: 55, termDays: 14, payments: [{ amount: 58000, daysAfter: 30 }] },
  { customer: 2, description: "Skincare & kebutuhan kos", amount: 210000, daysAgo: 65, termDays: 14 },
  { customer: 7, description: "Sembako lebaran", amount: 350000, daysAgo: 95, termDays: 30, payments: [{ amount: 350000, daysAfter: 40, method: "transfer" }] },
  { customer: 6, description: "Gula 10kg untuk pesanan kue", amount: 165000, daysAgo: 22, termDays: 14, payments: [{ amount: 165000, daysAfter: 13 }] },
];

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = seed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function seed() {
  const [{ value }] = await db.select({ value: count() }).from(users);
  if (value > 0) return;

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const [user] = await db
    .insert(users)
    .values({
      name: "Ibu Sari",
      email: DEMO_EMAIL,
      passwordHash,
      storeName: "Warung Berkah Sari",
      phone: "081299887766",
    })
    .returning();

  const insertedCustomers = await db
    .insert(customers)
    .values(seedCustomers.map((c) => ({ ...c, userId: user.id })))
    .returning();

  for (const d of seedDebts) {
    const customer = insertedCustomers[d.customer];
    const debtDate = addDaysISO(-d.daysAgo);
    const dueDate = addDaysISO(d.termDays, debtDate);
    const paidAmount = (d.payments ?? []).reduce((s, p) => s + p.amount, 0);
    const status = paidAmount >= d.amount ? "paid" : paidAmount > 0 ? "partial" : "unpaid";

    const [debt] = await db
      .insert(debts)
      .values({
        userId: user.id,
        customerId: customer.id,
        description: d.description,
        amount: d.amount,
        paidAmount,
        status,
        debtDate,
        dueDate,
        createdAt: new Date(debtDate + "T09:00:00"),
        updatedAt: new Date(debtDate + "T09:00:00"),
      })
      .returning();

    if (d.payments?.length) {
      await db.insert(payments).values(
        d.payments.map((p) => ({
          userId: user.id,
          debtId: debt.id,
          customerId: customer.id,
          amount: p.amount,
          method: p.method ?? "tunai",
          paidAt: addDaysISO(p.daysAfter, debtDate),
          createdAt: new Date(addDaysISO(p.daysAfter, debtDate) + "T15:00:00"),
        })),
      );
    }
  }

  await db.insert(reminderLogs).values([
    {
      userId: user.id,
      customerId: insertedCustomers[3].id,
      phone: insertedCustomers[3].phone!,
      message: "Halo Pak Joko Prasetyo, ini pengingat dari Warung Berkah Sari. Anda memiliki sisa hutang sebesar Rp 310.000 untuk \"Sembako bulanan\". Mohon segera dilunasi ya. Terima kasih 🙏",
      status: "simulated",
      response: "Demo: pesan disimulasikan",
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
    {
      userId: user.id,
      customerId: insertedCustomers[9].id,
      phone: insertedCustomers[9].phone!,
      message: "Halo Pak Hendra Gunawan, ini pengingat dari Warung Berkah Sari. Anda memiliki sisa hutang sebesar Rp 256.000 untuk \"Galon isi ulang x10, gas 3kg x3\". Mohon segera dilunasi ya. Terima kasih 🙏",
      status: "simulated",
      response: "Demo: pesan disimulasikan",
      createdAt: new Date(Date.now() - 1 * 86400000),
    },
  ]);
}
