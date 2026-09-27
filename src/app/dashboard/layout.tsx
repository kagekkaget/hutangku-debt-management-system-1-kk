import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { db } from "@/db";
import { debts } from "@/db/schema";
import { and, count, eq, lt, ne } from "drizzle-orm";
import { todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [{ value: overdueCount }] = await db
    .select({ value: count() })
    .from(debts)
    .where(and(eq(debts.userId, user.id), ne(debts.status, "paid"), lt(debts.dueDate, todayISO())));

  return (
    <div className="min-h-screen">
      <Sidebar user={{ name: user.name, storeName: user.storeName, email: user.email }} overdueCount={overdueCount} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
