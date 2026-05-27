import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  numeric,
  boolean,
  date,
} from "drizzle-orm/pg-core"
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import type { AdapterAccountType } from "@auth/core/adapters"

const pool = new Pool({ connectionString: process.env.AUTH_DRIZZLE_URL!, max: 1 })

export const db = drizzle(pool)

// ====== Core NextAuth Schemas ======
export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  role: text("role").default("user").notNull(),
  
  // Settings
  currency: text("currency").default("USD").notNull(),
  language: text("language").default("en").notNull(),
  budgetAlerts: boolean("budgetAlerts").default(true).notNull(),
  monthlySummary: boolean("monthlySummary").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
})


export const accounts = pgTable(
  "account",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    {
      compoundKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ]
)

// ====== Finance Management Schemas ======

// Credit card info & balances
export const cards = pgTable("card", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Visa Vietcombank"
  type: text("type").notNull(), // e.g., "CREDIT_CARD", "DEBIT_CARD"
  balance: numeric("balance", { precision: 18, scale: 6 }).notNull().default('0'),

  currency: text("currency").notNull().default('VND'),
  color: text("color"),
  accountNumber: text("accountNumber"), // Card number
  bankId: text("bankId"), // Optional bank identifier (Vietcombank, MB, etc.)
  holderName: text("holderName"),
  expiryDate: text("expiryDate"),
  cvv: text("cvv"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
})

// Backward-compat aliases (all point to the same "card" table)
export const financialAccounts = cards
export const financialCards = cards

// Categories for transactions (Income/Expense)
export const categories = pgTable("category", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Food", "Salary", "Rent"
  type: text("type").notNull(), // "INCOME" or "EXPENSE"
  icon: text("icon"), // emoji or lucide icon name
  color: text("color"),
  parentId: text("parentId"), // Self-referencing not enforced via FK to allow simple soft relationships here
  createdAt: timestamp("createdAt").defaultNow().notNull(),
})

// Transactions
export const transactions = pgTable("transaction", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("accountId").references(() => cards.id, { onDelete: "cascade" }), // nullable = budget-origin tx have no card
  categoryId: text("categoryId").references(() => categories.id, { onDelete: "set null" }), // Optional category
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),

  type: text("type").notNull(), // "INCOME", "EXPENSE", "TRANSFER"
  date: timestamp("date").notNull(), // transaction date
  notes: text("notes"),
  payee: text("payee"),
  isRecurring: boolean("isRecurring").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
})

// Budgets for categories
export const budgets = pgTable("budget", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: text("categoryId").notNull().references(() => categories.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),

  period: text("period").notNull().default('MONTHLY'), // "MONTHLY", "YEARLY"
  startDate: date("startDate"), // Used if its a specific start-end budget
  endDate: date("endDate"), 
  createdAt: timestamp("createdAt").defaultNow().notNull(),
})

// Financial Goals (e.g., Save for a house, Vacation)
export const goals = pgTable("goal", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmount: numeric("targetAmount", { precision: 18, scale: 6 }).notNull(),
  currentAmount: numeric("currentAmount", { precision: 18, scale: 6 }).notNull().default('0'),

  deadline: date("deadline"),
  color: text("color"),
  icon: text("icon"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
})

// New Budget System
export const monthlyBudgets = pgTable("monthly_budget", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalSalary: numeric("totalSalary", { precision: 18, scale: 6 }).notNull().default('0'),
  cashInHand: numeric("cashInHand", { precision: 18, scale: 6 }).notNull().default('0'),
  reserveFunds: numeric("reserveFunds", { precision: 18, scale: 6 }).notNull().default('0'),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
})

export const dailyBudgets = pgTable("daily_budget", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  monthlyBudgetId: text("monthlyBudgetId").notNull().references(() => monthlyBudgets.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  expectedCost: numeric("expectedCost", { precision: 18, scale: 6 }).notNull().default('0'),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
})

export const dailyReports = pgTable("daily_report", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  expectedCost: numeric("expectedCost", { precision: 18, scale: 6 }).notNull().default('0'),
  actualCost: numeric("actualCost", { precision: 18, scale: 6 }).notNull().default('0'),
  saving: numeric("saving", { precision: 18, scale: 6 }).notNull().default('0'),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
})

export const monthlyReports = pgTable("monthly_report", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalSalary: numeric("totalSalary", { precision: 18, scale: 6 }).notNull().default('0'),
  actualExpense: numeric("actualExpense", { precision: 18, scale: 6 }).notNull().default('0'),
  savings: numeric("savings", { precision: 18, scale: 6 }).notNull().default('0'),
  performance: numeric("performance", { precision: 18, scale: 6 }).notNull().default('0'), // (salary - expense) / salary * 100
  createdAt: timestamp("createdAt").defaultNow().notNull(),
})

export const notifications = pgTable("notification", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default('INFO'), // 'INFO', 'SUCCESS', 'WARNING', 'REPORT'
  isRead: boolean("isRead").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
})

export const friends = pgTable("friend", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  friendId: text("friendId").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default('PENDING'), // 'PENDING', 'ACCEPTED', 'BLOCKED'
  createdAt: timestamp("createdAt").defaultNow().notNull(),
})

export const messages = pgTable("message", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  senderId: text("senderId").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: text("receiverId").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("isRead").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
})

export const loans = pgTable("loan", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  lenderId: text("lenderId").notNull().references(() => users.id, { onDelete: "cascade" }),
  borrowerId: text("borrowerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
  interestRate: numeric("interestRate", { precision: 18, scale: 6 }).notNull().default('0.1'),
  deadline: timestamp("deadline").notNull(),
  status: text("status").notNull().default('PENDING'), // 'PENDING', 'APPROVED', 'REPAID', 'OVERDUE', 'CANCELLED'
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
})

export const activities = pgTable("activity", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // e.g., "CREATE", "UPDATE", "DELETE"
  entityType: text("entityType").notNull(), // e.g., "TRANSACTION", "BUDGET", "GOAL", "CARD"
  entityId: text("entityId"),
  description: text("description").notNull(), // Human readable description
  metadata: text("metadata"), // Optional JSON string for extra info
  createdAt: timestamp("createdAt").defaultNow().notNull(),
})

// Bills and recurring payments
export const bills = pgTable("bill", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Netflix", "Rent", "Electric"
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
  dueDate: date("dueDate").notNull(), // Next due date
  frequency: text("frequency").notNull().default('MONTHLY'), // "MONTHLY", "YEARLY", "WEEKLY"
  categoryId: text("categoryId").references(() => categories.id, { onDelete: "set null" }),
  status: text("status").notNull().default('UNPAID'), // 'PAID', 'UNPAID', 'OVERDUE'
  lastPaidDate: timestamp("lastPaidDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
})
