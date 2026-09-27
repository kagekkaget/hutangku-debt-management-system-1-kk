import { db } from "@/db";
import { customers, debts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { asc, desc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { DebtsClient } from "./debts-client";

export const dynamic = "force-dynamic";

export default async function DebtsPage({ searchParams }: { searchParams: Promise<{ new?: string; customer?: string; status?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;

  const [rows, customerList] = await Promise.all([
    db
      .select({
        id: debts.id,
        customerId: debts.customerId,
        customerName: customers.name,
        customerPhone: customers.phone,
        description: debts.description,
        amount: debts.amount,
        paidAmount: debts.paidAmount,
        status: debts.status,
        debtDate: debts.debtDate,
        dueDate: debts.dueDate,
        notes: debts.notes,
      })
      .from(debts)
      .innerJoin(customers, eq(customers.id, debts.customerId))
      .where(eq(debts.userId, user.id))
      .orderBy(desc(debts.debtDate), desc(debts.id)),
    db
      .select({ id: customers.id, name: customers.name, phone: customers.phone })
      .from(customers)
      .where(eq(customers.userId, user.id))
      .orderBy(asc(customers.name)),
  ]);

  return (
    <div>
      <PageHeader title="Piutang" description="Semua catatan hutang pelanggan, cicilan, dan status pelunasan." />
      <DebtsClient
        initial={rows}
        customers={customerList}
        openNew={sp.new === "1"}
        initialCustomer={sp.customer ? Number(sp.customer) : undefined}
        initialStatus={sp.status}
      />
    </div>
  );
}
