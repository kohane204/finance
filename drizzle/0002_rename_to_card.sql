-- Migration: rename financial_account to card, make transaction.accountId nullable
-- Step 1: Create new "card" table with all columns (including newer ones not in original migration)
CREATE TABLE IF NOT EXISTS "card" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"balance" numeric(18, 6) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'VND' NOT NULL,
	"color" text,
	"accountNumber" text,
	"bankId" text,
	"holderName" text,
	"expiryDate" text,
	"cvv" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Step 2: Copy existing data from financial_account → card (if table exists)
INSERT INTO "card" ("id", "userId", "name", "type", "balance", "currency", "color", "createdAt", "updatedAt")
SELECT "id", "userId", "name", "type", "balance", "currency", "color", "createdAt", "updatedAt"
FROM "financial_account"
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

-- Step 3: Add FK on card → user
ALTER TABLE "card" ADD CONSTRAINT "card_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Step 4: Drop old FK on transaction → financial_account
ALTER TABLE "transaction" DROP CONSTRAINT IF EXISTS "transaction_accountId_financial_account_id_fk";
--> statement-breakpoint

-- Step 5: Make accountId nullable (budget transactions have no card)
ALTER TABLE "transaction" ALTER COLUMN "accountId" DROP NOT NULL;
--> statement-breakpoint

-- Step 6: Add new FK on transaction → card (nullable)
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_accountId_card_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Step 7: Copy extra columns to financial_account if they exist (for any code still referencing it)
-- (We keep financial_account as-is; new code uses "card" table)
