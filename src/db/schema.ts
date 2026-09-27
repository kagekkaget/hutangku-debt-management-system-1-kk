import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  timestamp,
  date,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const debtStatusEnum = pgEnum("debt_status", ["unpaid", "partial", "paid"]);
export const reminderStatusEnum = pgEnum("reminder_status", ["sent", "failed", "simulated"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  storeName: text("store_name").notNull().default("Warung Saya"),
  phone: text("phone"),
  reminderTemplate: text("reminder_template")
    .notNull()
    .default(
      "Halo {nama}, ini pengingat dari {warung}. Anda memiliki sisa hutang sebesar {jumlah} untuk \"{keterangan}\" yang jatuh tempo pada {jatuh_tempo}. Mohon segera dilunasi ya. Terima kasih 🙏",
    ),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("customers_user_idx").on(t.userId)],
);

export const debts = pgTable(
  "debts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    paidAmount: bigint("paid_amount", { mode: "number" }).notNull().default(0),
    status: debtStatusEnum("status").notNull().default("unpaid"),
    debtDate: date("debt_date").notNull(),
    dueDate: date("due_date").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("debts_user_idx").on(t.userId),
    index("debts_customer_idx").on(t.customerId),
    index("debts_due_idx").on(t.dueDate),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    debtId: integer("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    method: text("method").notNull().default("tunai"),
    note: text("note"),
    paidAt: date("paid_at").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_user_idx").on(t.userId), index("payments_debt_idx").on(t.debtId)],
);

export const reminderLogs = pgTable(
  "reminder_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    debtId: integer("debt_id").references(() => debts.id, { onDelete: "set null" }),
    phone: text("phone").notNull(),
    message: text("message").notNull(),
    status: reminderStatusEnum("status").notNull(),
    response: text("response"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reminder_logs_user_idx").on(t.userId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  customers: many(customers),
  debts: many(debts),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, { fields: [customers.userId], references: [users.id] }),
  debts: many(debts),
  payments: many(payments),
}));

export const debtsRelations = relations(debts, ({ one, many }) => ({
  customer: one(customers, { fields: [debts.customerId], references: [customers.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  debt: one(debts, { fields: [payments.debtId], references: [debts.id] }),
  customer: one(customers, { fields: [payments.customerId], references: [customers.id] }),
}));

export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type ReminderLog = typeof reminderLogs.$inferSelect;
export type DebtStatus = (typeof debtStatusEnum.enumValues)[number];
