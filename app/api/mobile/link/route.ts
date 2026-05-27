import { NextRequest, NextResponse } from "next/server"
import { db, financialCards } from "@/schema"
import { eq, and } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, name, type, balance, accountNumber, bankId, holderName, expiryDate, cvv } = body

    if (!userId || !name || !accountNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check duplicate
    const existing = await db.select().from(financialCards).where(
      and(
        eq(financialCards.userId, userId),
        eq(financialCards.accountNumber, accountNumber)
      )
    ).limit(1)

    const { cookies: nextCookies } = await import("next/headers")
    const cookieStore = await nextCookies()
    const lang = (cookieStore.get("lang")?.value as "en" | "vi") || "vi"
    const { translations } = await import("@/lib/i18n/translations")
    const t = translations[lang]

    if (existing.length > 0) {
      return NextResponse.json({ error: t.accountAlreadyLinked || "This account has already been linked." }, { status: 409 })
    }

    const balanceInUsd = (parseFloat(balance) / 26000).toFixed(2)

    const accountId = uuidv4()
    await db.insert(financialCards).values({
      id: accountId,
      userId,
      name,
      type: type || "Credit Card",
      balance: balanceInUsd,
      accountNumber,
      bankId,
      holderName,
      expiryDate,
      cvv
    })

    // Force Next.js to revalidate the accounts page...
    const { revalidatePath } = await import("next/cache")
    revalidatePath("/net-worth")
    revalidatePath("/")

    // Trigger Pusher...
    try {
      const { pusherServer } = await import("@/lib/pusher")
      await pusherServer.trigger(`user-${userId}`, "invalidate", {
        type: "account",
        data: { id: accountId, name, accountNumber, balance: balanceInUsd, holderName, expiryDate },
        message: (t.accountLinkedSuccess as string).replace("{name}", name)
      })
    } catch (err) {
      console.error("Pusher error:", err)
    }

    return NextResponse.json({ success: true, id: accountId })
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e))
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
