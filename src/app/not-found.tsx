import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <p className="text-7xl">🧾</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-slate-500">Catatan yang Anda cari mungkin sudah dihapus.</p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
