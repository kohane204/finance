import { db } from "@/schema"
import { transactions, financialCards } from "@/schema"
import { eq } from "drizzle-orm"
import { pusherServer } from "@/lib/pusher"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { accountNumber, amount, description, bankId } = data

    if (!accountNumber || !amount) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Find account by number
    const [acc] = await db.select().from(financialCards).where(eq(financialCards.accountNumber, accountNumber)).limit(1)
    if (!acc) {
        return NextResponse.json({ error: "Account not found in system" }, { status: 404 })
    }

    const amt = parseFloat(amount)
    
    // Create transaction (Income/Expense pair)
    const [tx] = await db.insert(transactions).values({
        userId: acc.userId,
        accountId: acc.id,
        amount: amt.toString(),
        type: amt > 0 ? "INCOME" : "EXPENSE",
        date: new Date(),
        payee: bankId || "Bank Sync",
        notes: description || "In-app balance change detected via webhook."
    }).returning()

    // Update account balance
    const newBal = (parseFloat(acc.balance as string) + amt).toString()
    await db.update(financialCards).set({ balance: newBal }).where(eq(financialCards.id, acc.id))

    // Real-time notify via Pusher
    await pusherServer.trigger(`user-${acc.userId}`, "invalidate", { 
        message: `🔔 ${bankId}: ${amt > 0 ? '+' : ''}${amt.toLocaleString()} - ${description}`,
        type: "transaction" 
    })
    
    // Also notify on the admin dashboard for monitoring
    await pusherServer.trigger("admin-dashboard", "invalidate", { 
        message: `Bank Webhook: User ${acc.userId} balance updated.`
    })

    return NextResponse.json({ success: true, transactionId: tx.id })

  } catch (error: unknown) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
