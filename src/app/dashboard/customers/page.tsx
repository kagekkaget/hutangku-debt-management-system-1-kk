import { db } from "@/db";
import { customers, debts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { CustomersClient } from "./customers-client";
import { todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const user = await requireUser();

  const rows = await db
    .select({
      id: customers.id,
      userId: customers.userId,
      name: customers.name,
      phone: customers.phone,
      address: customers.address,
      notes: customers.notes,
      createdAt: customers.createdAt,
      outstanding: sql<number>`coalesce(sum(case when ${debts.status} <> 'paid' then ${debts.amount} - ${debts.paidAmount} else 0 end), 0)::bigint`,
      openCount: sql<number>`count(case when ${debts.status} <> 'paid' then 1 end)::int`,
      overdueCount: sql<number>`count(case when ${debts.status} <> 'paid' and ${debts.dueDate} < ${todayISO()} then 1 end)::int`,
    })
    .from(customers)
    .leftJoin(debts, and(eq(debts.customerId, customers.id), ne(debts.status, "paid")))
    .where(eq(customers.userId, user.id))
    .groupBy(customers.id)
    .orderBy(desc(customers.createdAt));

  const data = rows
    .map((r) => ({ ...r, outstanding: Number(r.outstanding), createdAt: r.createdAt.toISOString() }))
    .sort((a, b) => b.outstanding - a.outstanding || b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <PageHeader title="Pelanggan" description={`${data.length} pelanggan terdaftar di ${user.storeName}.`} />
      <CustomersClient initial={data} />
    </div>
  );
}
