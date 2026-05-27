import { NextRequest, NextResponse } from "next/server"
import { db } from "@/schema"
import { financialCards, transactions } from "@/schema"
import { eq } from "drizzle-orm"
import { pusherServer } from "@/lib/pusher"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"

/**
 * WEBHOOK ENDPOINT FOR AUTOMATIC BANK SYNC
 * This endpoint can be hooked up to Casso.vn, PayOS, or any custom bank reader.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // 1. Security check (Optional but recommended in production)
    // const secureToken = req.headers.get("x-webhook-token")
    // if (secureToken !== process.env.WEBHOOK_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Payload structure based on typical Vietnamese Bank API (Casso)
    // data: Array of { amount, description, cusum_balance, bank_sub_acc_id }
    const txs = body.data || []
    
    for (const tx of txs) {
      const { amount, description, cusum_balance, bank_sub_acc_id } = tx
      
      // 2. Find the local account by Account Number
      const [acc] = await db.select().from(financialCards).where(eq(financialCards.accountNumber, bank_sub_acc_id.toString())).limit(1)
      
      if (acc) {
        const amountUsd = (amount / 26000).toString()
        const newBalanceUsd = (cusum_balance / 26000).toFixed(2)

        // 3. Update Balance
        await db.update(financialCards).set({ balance: newBalanceUsd }).where(eq(financialCards.id, acc.id))

        // 4. Log Transaction automatically
        await db.insert(transactions).values({
          id: uuidv4(),
          userId: acc.userId,
          accountId: acc.id,
          amount: amountUsd,
          type: amount < 0 ? "EXPENSE" : "INCOME",
          payee: "Cloud Bank Sync",
          notes: description || "Automatic sync via Webhook",
          date: new Date()
        })

        // 5. Notify the Dashboard via Pusher
        try {
          await pusherServer.trigger(`user-${acc.userId}`, "invalidate", {
            type: "transaction",
            message: `Bank Sync: ${amount > 0 ? "+" : ""}${amount.toLocaleString()} ₫ (${description})`,
            data: { accountId: acc.id, balance: newBalanceUsd }
          })
        } catch (e) {
          console.error("Pusher Webhook Error:", e)
        }
      }
    }

    revalidatePath("/")
    revalidatePath("/transactions")
    revalidatePath("/net-worth")

    return NextResponse.json({ success: true, processed: txs.length })
  } catch (e: unknown) {
    console.error("Webhook Internal Error:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Webhook error" }, { status: 500 })
  }
}
