import { db } from "@/db";
import { customers, debts, reminderLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, desc, eq, ne } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { RemindersClient } from "./reminders-client";
import { waGatewayConfig } from "@/lib/wa";
import { daysUntil } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const user = await requireUser();
  const cfg = waGatewayConfig();

  const [openDebts, logs] = await Promise.all([
    db
      .select({
        id: debts.id,
        description: debts.description,
        amount: debts.amount,
        paidAmount: debts.paidAmount,
        dueDate: debts.dueDate,
        customerId: customers.id,
        customerName: customers.name,
        customerPhone: customers.phone,
      })
      .from(debts)
      .innerJoin(customers, eq(customers.id, debts.customerId))
      .where(and(eq(debts.userId, user.id), ne(debts.status, "paid")))
      .orderBy(debts.dueDate),
    db
      .select({
        id: reminderLogs.id,
        phone: reminderLogs.phone,
        message: reminderLogs.message,
        status: reminderLogs.status,
        response: reminderLogs.response,
        createdAt: reminderLogs.createdAt,
        customerName: customers.name,
      })
      .from(reminderLogs)
      .leftJoin(customers, eq(customers.id, reminderLogs.customerId))
      .where(eq(reminderLogs.userId, user.id))
      .orderBy(desc(reminderLogs.createdAt))
      .limit(50),
  ]);

  const candidates = openDebts
    .filter((d) => daysUntil(d.dueDate) <= 3)
    .map((d) => ({ ...d, daysLeft: daysUntil(d.dueDate) }));

  return (
    <div>
      <PageHeader
        title="Pengingat WhatsApp"
        description="Kirim pengingat jatuh tempo ke pelanggan secara otomatis melalui WhatsApp API Gateway."
      />
      <RemindersClient
        candidates={candidates}
        allOpen={openDebts.map((d) => ({ ...d, daysLeft: daysUntil(d.dueDate) }))}
        logs={logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))}
        gateway={{ configured: cfg.configured, provider: cfg.provider }}
        template={user.reminderTemplate}
        storeName={user.storeName}
      />
    </div>
  );
}
