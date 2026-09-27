export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactRupiah(amount: number) {
  if (Math.abs(amount) >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)} M`;
  if (Math.abs(amount) >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)} jt`;
  if (Math.abs(amount) >= 1_000) return `Rp ${Math.round(amount / 1_000)} rb`;
  return formatRupiah(amount);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value + (value.length === 10 ? "T00:00:00" : "")) : value;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function addDaysISO(days: number, from?: string) {
  const base = from ? new Date(from + "T00:00:00") : new Date();
  base.setDate(base.getDate() + days);
  const tz = base.getTimezoneOffset() * 60000;
  return new Date(base.getTime() - tz).toISOString().slice(0, 10);
}

/** Days between today and due date (negative = overdue) */
export function daysUntil(dateISO: string) {
  const today = new Date(todayISO() + "T00:00:00").getTime();
  const target = new Date(dateISO + "T00:00:00").getTime();
  return Math.round((target - today) / 86400000);
}

export type AgingBucket = "current" | "1-30" | "31-60" | "61-90" | "90+";

export function agingBucket(dueDateISO: string): AgingBucket {
  const overdue = -daysUntil(dueDateISO);
  if (overdue <= 0) return "current";
  if (overdue <= 30) return "1-30";
  if (overdue <= 60) return "31-60";
  if (overdue <= 90) return "61-90";
  return "90+";
}

export const AGING_LABELS: Record<AgingBucket, string> = {
  current: "Belum Jatuh Tempo",
  "1-30": "Telat 1–30 hari",
  "31-60": "Telat 31–60 hari",
  "61-90": "Telat 61–90 hari",
  "90+": "Telat > 90 hari",
};

export function normalizePhone(phone: string) {
  let p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "62" + p.slice(1);
  return p;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}
