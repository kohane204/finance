"use server"

import { db } from "@/schema"
import { transactions, monthlyBudgets, dailyBudgets, categories, cards, goals, budgets, notifications, friends, messages, loans, users, bills } from "@/schema"
import { eq, and, or, desc, ne } from "drizzle-orm"
import { auth, signIn, signOut } from "@/auth"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { syncPiggyBankGoal, syncDailyReports, syncMonthlyReports, getTodayStringICT, searchUsers, getICTNow } from "@/lib/data"
import { pusherServer } from "@/lib/pusher"
import { translations, type Language } from "@/lib/i18n/translations"
import { logActivity } from "@/lib/activities"

async function getT() {
  const cookieStore = await cookies()
  const lang = (cookieStore.get("lang")?.value || "vi") as Language
  return translations[lang]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error((await getT()).errUnauthorized)
  return session.user.id
}

async function getTargetUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user) throw new Error((await getT()).errUnauthorized)
  const isAdmin = (session.user as { role?: string }).role === "admin"
  if (isAdmin) {
    const cookieStore = await cookies()
    const managed = cookieStore.get("managedUserId")?.value
    if (managed) return managed
  }
  return session.user.id as string
}

async function checkBudgetAlert(userId: string, lang: Language) {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1).then(res => res[0])
  if (!user || user.budgetAlerts === false) return

  const { month: m, year: y } = getICTNow()

  const [mb] = await db.select().from(monthlyBudgets).where(and(eq(monthlyBudgets.userId, userId), eq(monthlyBudgets.month, m), eq(monthlyBudgets.year, y))).limit(1)
  if (!mb) return
  const salary = parseFloat(mb.totalSalary as string)
  if (salary <= 0) return

  const allTx = await db.select().from(transactions).where(eq(transactions.userId, userId))
  const monthTx = allTx.filter(t => {
     const d = new Date(new Date(t.date).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
     return (d.getMonth() + 1) === m && d.getFullYear() === y
  })

  let totalExpense = 0
  monthTx.forEach(t => {
     const amt = parseFloat(t.amount as string)
     if (t.type === 'EXPENSE' || amt < 0) totalExpense += Math.abs(amt)
     else if (t.type === 'INCOME' || amt > 0) totalExpense -= Math.abs(amt)
  })

  if (totalExpense >= salary * 0.8) {
     const t = translations[lang]
     const title = `${t.budgetAlerts} ${m}/${y}`
     const existingNotif = await db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.title, title))).limit(1)
     if (existingNotif.length === 0) {
        await db.insert(notifications).values({
           userId,
           title,
           message: t.budgetAlertMsg,
           type: 'WARNING',
           createdAt: new Date()
        })
        await pusherServer.trigger(`user-${userId}`, "invalidate", { type: 'notification', message: t.budgetAlertMsg })
     }
  }
}

// ─── Budget Actions (no account/card needed) ────────────────────────────────

/**
 * Save or update the monthly salary budget for a given month/year.
 * When applyToFuture=true it also updates all subsequent months.
 * When resetFuture=true it removes salary data for future months.
 */
export async function updateMonthlySalaryAction(formData: FormData) {
  const userId = await getTargetUserId()
  const month = parseInt(formData.get("month") as string)
  const year = parseInt(formData.get("year") as string)
  const salaryUsd = parseFloat(formData.get("salaryUsd") as string)
  const applyToFuture = formData.get("applyToFuture") === "true"
  const resetFuture = formData.get("resetFuture") === "true"

  if (isNaN(month) || isNaN(year) || isNaN(salaryUsd)) {
    throw new Error((await getT()).errInvalidSalary)
  }

  // Upsert this month
  const existing = await db.select().from(monthlyBudgets)
    .where(and(eq(monthlyBudgets.userId, userId), eq(monthlyBudgets.month, month), eq(monthlyBudgets.year, year)))
    .limit(1)

  const cashInHandUsd = parseFloat(formData.get("cashInHandUsd") as string) || 0
  const reserveFundsUsd = parseFloat(formData.get("reserveFundsUsd") as string) || 0

  if (existing.length > 0) {
    await db.update(monthlyBudgets)
      .set({ 
        totalSalary: salaryUsd.toString(), 
        cashInHand: cashInHandUsd.toString(),
        reserveFunds: reserveFundsUsd.toString(),
        updatedAt: new Date() 
      })
      .where(and(eq(monthlyBudgets.userId, userId), eq(monthlyBudgets.month, month), eq(monthlyBudgets.year, year)))
  } else {
    await db.insert(monthlyBudgets).values({
      userId,
      month,
      year,
      totalSalary: salaryUsd.toString(),
      cashInHand: cashInHandUsd.toString(),
      reserveFunds: reserveFundsUsd.toString(),
    })
  }

  if (applyToFuture) {
    // Apply same salary to all future months that already have a budget record
    const allBudgets = await db.select().from(monthlyBudgets).where(eq(monthlyBudgets.userId, userId))
    const futureBudgets = allBudgets.filter(mb =>
      mb.year > year || (mb.year === year && mb.month > month)
    )
    for (const mb of futureBudgets) {
      await db.update(monthlyBudgets)
        .set({ 
          totalSalary: salaryUsd.toString(), 
          updatedAt: new Date() 
        })
        .where(eq(monthlyBudgets.id, mb.id))
    }
  }

  if (resetFuture) {
    // Remove monthly budget records for future months
    const allBudgets = await db.select().from(monthlyBudgets).where(eq(monthlyBudgets.userId, userId))
    const futureBudgets = allBudgets.filter(mb =>
      mb.year > year || (mb.year === year && mb.month > month)
    )
    for (const mb of futureBudgets) {
      await db.delete(dailyBudgets).where(eq(dailyBudgets.monthlyBudgetId, mb.id))
      await db.delete(monthlyBudgets).where(eq(monthlyBudgets.id, mb.id))
    }
  }

  const t = await getT()
  await logActivity({
    userId,
    action: existing.length > 0 ? "UPDATE" : "CREATE",
    entityType: "BUDGET",
    entityId: existing.length > 0 ? existing[0].id : undefined,
    description: t.activityUpdatedSalary
      .replace("{month}", month.toString())
      .replace("{year}", year.toString())
      .replace("{amount}", salaryUsd.toString()),
    metadata: { month, year, salaryUsd, applyToFuture, resetFuture }
  })

  revalidatePath("/budgets")
  await pusherServer.trigger(`user-${userId}`, "invalidate", { type: 'budget_update' })
}

/**
 * Update the expected cost for a single day within a month.
 */
export async function updateDailyBudgetAction(formData: FormData) {
  const userId = await getTargetUserId()
  const date = formData.get("date") as string
  const amountDisplay = parseFloat(formData.get("amount") as string) || 0

  if (!date) throw new Error((await getT()).errDateRequired)

  // Determine the month/year from the date
  const [year, month] = date.split("-").map(Number)

  // Get or create monthly budget
  const mbRecord = await db.select().from(monthlyBudgets)
    .where(and(eq(monthlyBudgets.userId, userId), eq(monthlyBudgets.month, month), eq(monthlyBudgets.year, year)))
    .limit(1)

  if (mbRecord.length === 0) {
    throw new Error((await getT()).errSaveSalaryFirst)
  }

  const mbId = mbRecord[0].id

  // Detect language from cookie to convert display currency → USD
  const cookieStore = await cookies()
  const lang = cookieStore.get("lang")?.value || "en"
  const rate = lang === "vi" ? 26000 : 1
  const amountUsd = amountDisplay / rate

  // Upsert daily budget
  const existingDaily = await db.select().from(dailyBudgets)
    .where(and(eq(dailyBudgets.monthlyBudgetId, mbId), eq(dailyBudgets.date, date)))
    .limit(1)

  if (existingDaily.length > 0) {
    await db.update(dailyBudgets)
      .set({ expectedCost: amountUsd.toString() })
      .where(and(eq(dailyBudgets.monthlyBudgetId, mbId), eq(dailyBudgets.date, date)))
  } else {
    await db.insert(dailyBudgets).values({
      userId,
      monthlyBudgetId: mbId,
      date,
      expectedCost: amountUsd.toString(),
    })
  }

  revalidatePath("/budgets")
  await pusherServer.trigger(`user-${userId}`, "invalidate", { type: 'budget_update' })
}

/**
 * Bulk-update all daily budgets for a monthly budget.
 */
export async function bulkUpdateDailyBudgetsAction(
  monthlyBudgetId: string,
  data: { date: string; amount: number }[]
) {
  const userId = await getTargetUserId()

  // Detect language
  const cookieStore = await cookies()
  const lang = cookieStore.get("lang")?.value || "en"
  const rate = lang === "vi" ? 26000 : 1

  // Delete existing daily budgets for this month
  await db.delete(dailyBudgets).where(eq(dailyBudgets.monthlyBudgetId, monthlyBudgetId))

  // Re-insert all
  for (const entry of data) {
    const amountUsd = (entry.amount || 0) / rate
    await db.insert(dailyBudgets).values({
      userId,
      monthlyBudgetId,
      date: entry.date,
      expectedCost: amountUsd.toString(),
    })
  }

  revalidatePath("/budgets")
  await pusherServer.trigger(`user-${userId}`, "invalidate", { type: 'budget_update' })
}

/**
 * Add a daily spending activity (transaction) for the budget page.
 * Does NOT require a card/account — budget transactions are salary-based.
 */
export async function addTransactionAction(formData: FormData) {
  const userId = await getTargetUserId()
  const payee = (formData.get("payee") as string)?.trim()
  const amountRaw = parseFloat(formData.get("amount") as string)
  const category = (formData.get("category") as string)?.trim() || "General"
  const dateStr = formData.get("date") as string
  const accountId = formData.get("accountId") as string | null // optional for budget page
  const activityType = formData.get("activityType") as string || "EXPENSE"

  if (!payee) throw new Error((await getT()).errPayeeRequired)
  if (isNaN(amountRaw) || amountRaw <= 0) throw new Error((await getT()).errInvalidAmount)

  // Detect language to get rate
  const cookieStore = await cookies()
  const lang = cookieStore.get("lang")?.value || "en"
  const rate = lang === "vi" ? 26000 : 1

  const isIncome = activityType === "INCOME"

  // Store negative for expense, positive for income
  const baseUsd = Math.abs(amountRaw) / rate
  const amountUsd = isIncome ? baseUsd : -baseUsd
  const useReserves = formData.get("useReserves") === "true"

  // Check if cash + salary is enough
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  
  const [mb] = await db.select().from(monthlyBudgets)
    .where(and(eq(monthlyBudgets.userId, userId), eq(monthlyBudgets.month, currentMonth), eq(monthlyBudgets.year, currentYear)))
    .limit(1)

  if (!isIncome && mb) {
    const cash = parseFloat(mb.cashInHand as string) || 0
    const salary = parseFloat(mb.totalSalary as string) || 0
    const reserves = parseFloat(mb.reserveFunds as string) || 0
    const totalAvailable = cash + salary

    if (baseUsd > totalAvailable) {
      if (useReserves) {
        if (baseUsd > totalAvailable + reserves) {
          throw new Error((await getT()).errInsufficientReserves)
        }
        // Deduct from reserves first if cash+salary is fully exhausted
        // Logic: if totalAvailable covers partial, deduct totalAvailable from cash/salary then rest from reserves
        // For simplicity, let's just deduct from reserveFunds in the record
        const remainingReserves = (totalAvailable + reserves) - baseUsd
        // Also need to zero out cash/salary? 
        // User says "tiền hiện có + tổng lương sẽ tính cho chi phí thực tế"
        // Let's just update the reserveFunds
        await db.update(monthlyBudgets).set({ reserveFunds: remainingReserves.toString() }).where(eq(monthlyBudgets.id, mb.id))
      } else {
        // This should be caught by the client prompt, but safety check here
        throw new Error((await getT()).errPromptReserves)
      }
    } else {
      // Deduct from cashInHand
      const remainingCash = cash - baseUsd
      await db.update(monthlyBudgets).set({ cashInHand: remainingCash.toString() }).where(eq(monthlyBudgets.id, mb.id))
    }
  }
  
  if (accountId) {
    const selectedAccountArr = await db.select().from(cards).where(eq(cards.id, accountId)).limit(1)
    if (selectedAccountArr.length > 0) {
       const selectedAcc = selectedAccountArr[0]
       // baseUsd is absolute amount of the transaction. If it's income, it adds to balance; if expense, it deducts.
       const newBalance = (parseFloat(selectedAcc.balance as string) || 0) + (isIncome ? baseUsd : -baseUsd)
       await db.update(cards).set({ balance: newBalance.toString() }).where(eq(cards.id, accountId))
    }
  }

  const txDate = dateStr ? new Date(dateStr + "T12:00:00") : new Date()

  await db.insert(transactions).values({
    userId,
    accountId: accountId || null,
    amount: amountUsd.toString(),
    type: isIncome ? "INCOME" : "EXPENSE",
    date: txDate,
    payee,
    notes: `Category: ${category}`,
    isRecurring: false,
  })

  const t = await getT()
  await logActivity({
    userId,
    action: "CREATE",
    entityType: "TRANSACTION",
    description: t.activityAddedTransaction
      .replace("{payee}", payee)
      .replace("{amount}", Math.abs(amountRaw).toString()),
    metadata: { payee, amountRaw, category, date: txDate, type: isIncome ? "INCOME" : "EXPENSE" }
  })

  await syncPiggyBankGoal(userId)
  await syncDailyReports(userId)
  await checkBudgetAlert(userId, lang as Language)

  revalidatePath("/budgets")
  revalidatePath("/transactions")
  await pusherServer.trigger(`user-${userId}`, "invalidate", { type: 'transaction_update' })
}

/**
 * Delete a transaction by ID.
 */
export async function deleteTransactionAction(transactionId: string) {
  const userId = await getCurrentUserId()

  const existing = await db.select().from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .limit(1)

  if (existing.length === 0) throw new Error((await getT()).errTransactionNotFound)

  await db.delete(transactions).where(eq(transactions.id, transactionId))

  const t = await getT()
  await logActivity({
    userId,
    action: "DELETE",
    entityType: "TRANSACTION",
    entityId: transactionId,
    description: t.activityDeletedTransaction
      .replace("{payee}", existing[0].payee || "")
      .replace("{amount}", Math.abs(parseFloat(existing[0].amount as string) || 0).toString()),
  })

  await syncPiggyBankGoal(userId)
  await syncDailyReports(userId)

  revalidatePath("/budgets")
  revalidatePath("/transactions")
  await pusherServer.trigger(`user-${userId}`, "invalidate", { type: 'transaction_update' })
}

/**
 * Update an existing transaction by ID.
 */
export async function updateTransactionAction(formData: FormData) {
  const userId = await getTargetUserId()
  const transactionId = formData.get("transactionId") as string
  const payee = (formData.get("payee") as string)?.trim()
  const amountRaw = parseFloat(formData.get("amount") as string)
  const category = (formData.get("category") as string)?.trim() || "General"
  const dateStr = formData.get("date") as string
  const activityType = formData.get("activityType") as string || "EXPENSE"

  if (!transactionId) throw new Error((await getT()).errTransactionNotFound)
  if (!payee) throw new Error((await getT()).errPayeeRequired)
  if (isNaN(amountRaw) || amountRaw <= 0) throw new Error((await getT()).errInvalidAmount)

  const existing = await db.select().from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .limit(1)

  if (existing.length === 0) throw new Error((await getT()).errTransactionNotFound)

  const cookieStore = await cookies()
  const lang = cookieStore.get("lang")?.value || "en"
  const rate = lang === "vi" ? 26000 : 1

  const isIncome = activityType === "INCOME"
  const baseUsd = Math.abs(amountRaw) / rate
  const amountUsd = isIncome ? baseUsd : -baseUsd

  const txDate = dateStr ? new Date(dateStr + "T12:00:00") : new Date(existing[0].date)

  // Find or create category
  let categoryId = existing[0].categoryId
  if (category) {
    const existingCats = await db.select().from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.name, category)))
      .limit(1)
    if (existingCats.length > 0) {
      categoryId = existingCats[0].id
    } else {
      const newCat = await db.insert(categories).values({
        userId,
        id: crypto.randomUUID(),
        name: category,
        type: isIncome ? "INCOME" : "EXPENSE"
      }).returning({ id: categories.id })
      categoryId = newCat[0].id
    }
  }

  await db.update(transactions).set({
    payee,
    amount: amountUsd.toString(),
    type: isIncome ? "INCOME" : "EXPENSE",
    date: txDate,
    categoryId,
    notes: `Category: ${category}`,
    updatedAt: new Date()
  }).where(eq(transactions.id, transactionId))

  await syncPiggyBankGoal(userId)
  await syncDailyReports(userId)

  revalidatePath("/budgets")
  revalidatePath("/transactions")
  await pusherServer.trigger(`user-${userId}`, "invalidate", { type: 'transaction_update' })
}

/**
 * Delete ALL transactions for a specific date.
 */
export async function deleteAllTransactionsByDateAction(dateStr: string) {
  const userId = await getCurrentUserId()
  
  // Date comes in as YYYY-MM-DD. Need to match the exact day.
  // Our transactions are stored with txDate = new Date(dateStr + "T12:00:00")
  // Or at least on that date.
  const startOfDay = new Date(dateStr + "T00:00:00")
  const endOfDay = new Date(dateStr + "T23:59:59")
  
  const allTx = await db.select().from(transactions).where(eq(transactions.userId, userId))
  
  const toDelete = allTx.filter(tx => {
     const tDate = new Date(tx.date)
     return tDate >= startOfDay && tDate <= endOfDay
  })
  
  for (const tx of toDelete) {
     await db.delete(transactions).where(eq(transactions.id, tx.id))
  }
  
     await syncPiggyBankGoal(userId)
     await syncDailyReports(userId)
     revalidatePath("/budgets")
     revalidatePath("/transactions")
     await pusherServer.trigger(`user-${userId}`, "invalidate", { type: 'transaction_update' })
  }


export async function scanActivitiesAction(formData: FormData) {
  const userId = await getTargetUserId()
  const file = formData.get("file") as File | null

  if (!file) throw new Error((await getT()).errNoFileProvided)

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error((await getT()).errGeminiApiKeyMissing)

  // Convert file to base64
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")
  const mimeType = file.type || "image/jpeg"

  // Detect language
  const cookieStore = await cookies()
  const lang = (cookieStore.get("lang")?.value || "en") as Language
  const rate = lang === "vi" ? 26000 : 1

  const prompt = `You are a highly capable financial data extractor. Your task is to analyze this entire document and extract EVERY SINGLE expected cost (chi phí dự kiến) and actual activity (hoạt động thu/chi).

CRITICAL INSTRUCTIONS:
1. The document contains daily activities for an entire month (between 28 to 31 days depending on the month). You MUST extract ALL activities from the very first day to the very last day present in the document.
2. DO NOT STOP, summarize, or skip any days. Missing entries is completely unacceptable.
3. Keep generating until the entire document has been processed from start to finish. Do not let repetitive patterns stop you.
4. Classify each actual activity as either "EXPENSE" (chi) or "INCOME" (thu).
5. Extract daily expected costs (chi phí dự kiến) into the "expectedCosts" array.

Return ONLY a valid JSON object in this exact format (no markdown, no preamble):
{
  "expectedCosts": [
    { "date": "${new Date().getFullYear()}-03-01", "amount": 500000 }
  ],
  "entries": [
    { "payee": "Tên cửa hàng", "amount": 50000, "category": "Thực phẩm", "date": "${new Date().getFullYear()}-03-29", "type": "EXPENSE" },
    { "payee": "Lương", "amount": 3000000, "category": "Lương", "date": "${new Date().getFullYear()}-03-01", "type": "INCOME" }
  ]
}

Rules:
- amount: absolute positive number. (e.g., "45k" -> 45000).
- date: YYYY-MM-DD. Handle shorthand dates like "29/3" as being in current year (${new Date().getFullYear()}). NEVER return year 2024 if it's currently ${new Date().getFullYear()}.
- type: "EXPENSE" for spending, "INCOME" for money received.
- category & payee: Use VIETNAMESE language if the document is in Vietnamese or English.
- category: Determine the most appropriate and concise category name (e.g., Thực phẩm, Di chuyển, Mua sắm, Giải trí, Sức khỏe, Tiền ích, Hóa đơn, Nhà ở, Lương, Chuyển khoản, v.v. or automatically generate a suitable short name). Do NOT restrict yourself to a fixed list.
- If no expected costs exist in the document, return an empty array [] for expectedCosts.
- If no entries exist, return an empty array [] for entries.`

  // Call Gemini API
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64 } }
          ]
        }],
        generationConfig: { 
          temperature: 0.1, 
          maxOutputTokens: 65536,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              expectedCosts: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    date: { type: "STRING", description: "YYYY-MM-DD" },
                    amount: { type: "NUMBER" }
                  },
                  required: ["date", "amount"]
                }
              },
              entries: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    payee: { type: "STRING" },
                    amount: { type: "NUMBER" },
                    category: { type: "STRING" },
                    date: { type: "STRING", description: "YYYY-MM-DD" },
                    type: { type: "STRING" }
                  },
                  required: ["payee", "amount", "category", "date", "type"]
                }
              }
            },
            required: ["expectedCosts", "entries"]
          }
        }
      })
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API error: ${err}`)
  }

  const result = await response.json()

  // Check if the model stopped early due to token limits
  const finishReason = result?.candidates?.[0]?.finishReason
  if (finishReason && finishReason !== "STOP") {
    console.warn(`[scanActivities] Gemini finishReason=${finishReason}. Response may be truncated.`)
    if (finishReason === "MAX_TOKENS") {
      const t = translations[lang]
      throw new Error(t.overTokenLimit)
    }
  }

  let entries: { payee: string; amount: number; category: string; date: string; type?: "EXPENSE" | "INCOME" }[] = []
  let expectedCosts: { date: string; amount: number }[] = []

  try {
    const part = result?.candidates?.[0]?.content?.parts?.[0]
    if (part && typeof part === "object" && !part.text && (part.entries || part.expectedCosts)) {
      entries = part.entries || []
      expectedCosts = part.expectedCosts || []
    } else {
      const rawText: string = part?.text ?? ""
      let cleaned = rawText.replace(/```json\n?|\n?```/g, "").trim()
      if (!cleaned.startsWith("{")) {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
        cleaned = jsonMatch ? jsonMatch[0] : cleaned
      }
      if (!cleaned) return { count: 0, date: "" }
      try {
        const parsed = JSON.parse(cleaned)
        entries = parsed.entries || []
        expectedCosts = parsed.expectedCosts || []
      } catch {
        const lastBracePos = cleaned.lastIndexOf("}")
        if (lastBracePos !== -1) {
          let fixed = cleaned.substring(0, lastBracePos + 1)
          if (!fixed.startsWith("{")) fixed = "{" + fixed
          try {
            const parsed = JSON.parse(fixed)
            entries = parsed.entries || []
            expectedCosts = parsed.expectedCosts || []
          } catch {
            const entriesMatch = fixed.match(/"entries"\s*:\s*\[([\s\S]*?)\](?=[^\]]*$)/)
            if (entriesMatch) {
              try { entries = JSON.parse("[" + entriesMatch[1] + "]")} catch {}
            }
          }
        } else {
          return { count: 0, date: "" }
        }
      }
    }
  } catch (outerErr) {
    console.error("[scanActivities] Unexpected parse error:", outerErr)
    return { count: 0, date: "" }
  }

  if (entries.length === 0 && expectedCosts.length === 0) return { count: 0, date: "" }

  // Validate expected costs
  if (expectedCosts.length > 0) {
    const monthTotals: Record<string, number> = {}
    for (const ec of expectedCosts) {
      if (!ec.date || typeof ec.amount !== "number") continue
      const [year, month] = ec.date.split("-").map(Number)
      const key = `${year}-${month}`
      monthTotals[key] = (monthTotals[key] || 0) + ec.amount
    }

    for (const [key, totalAmount] of Object.entries(monthTotals)) {
      const [year, month] = key.split("-").map(Number)
      const mbRecord = await db.select().from(monthlyBudgets).where(and(eq(monthlyBudgets.userId, userId), eq(monthlyBudgets.month, month), eq(monthlyBudgets.year, year))).limit(1)
      if (mbRecord.length === 0) continue 
      const salary = parseFloat(mbRecord[0].totalSalary as string)
      const salaryDisplay = salary * rate
      if (totalAmount > salaryDisplay + 0.01) {
        const t = translations[lang]
        const fmt = (n: number) => new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", { style: "currency", currency: lang === "vi" ? "VND" : "USD" }).format(Math.round(n))
        throw new Error(t.exceedSalaryErrorDetailed.replace("{total}", fmt(totalAmount)).replace("{salary}", fmt(salaryDisplay)) + ` (${month}/${year})`)
      }
    }
  }

  // 9 PM Rule logic
  const todayStr = getTodayStringICT()
  const ictNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
  const currentHour = ictNow.getHours()
  const isPast9PM = currentHour >= 21

  // Insert expected costs
  for (const ec of expectedCosts) {
    if (!ec.date || typeof ec.amount !== "number") continue
    if (ec.date === todayStr && !isPast9PM) continue

    const [year, month] = ec.date.split("-").map(Number)
    const mbRecord = await db.select().from(monthlyBudgets).where(and(eq(monthlyBudgets.userId, userId), eq(monthlyBudgets.month, month), eq(monthlyBudgets.year, year))).limit(1)
    if (mbRecord.length === 0) continue 
    const mbId = mbRecord[0].id

    const ecUsd = ec.amount / rate
    const existingDaily = await db.select().from(dailyBudgets).where(and(eq(dailyBudgets.monthlyBudgetId, mbId), eq(dailyBudgets.date, ec.date))).limit(1)

    if (existingDaily.length > 0) {
      if (Math.abs(parseFloat(existingDaily[0].expectedCost as string) - ecUsd) > 0.001) {
        await db.update(dailyBudgets).set({ expectedCost: ecUsd.toString() }).where(and(eq(dailyBudgets.monthlyBudgetId, mbId), eq(dailyBudgets.date, ec.date)))
      }
    } else {
      await db.insert(dailyBudgets).values({ userId, monthlyBudgetId: mbId, date: ec.date, expectedCost: ecUsd.toString() })
    }
  }

  // Smarter Sync for Activities
  let insertedCount = 0
  let updatedCount = 0
  const uniqueDates = [...new Set(entries.map(e => e.date).filter(Boolean))]

  for (const dateStr of uniqueDates) {
    if (dateStr === todayStr && !isPast9PM) continue

    const startOfDay = new Date(dateStr + "T00:00:00")
    const endOfDay = new Date(dateStr + "T23:59:59")
    const allExisting = await db.select().from(transactions).where(eq(transactions.userId, userId))
    const dayExisting = allExisting.filter(tx => {
      const tDate = new Date(tx.date)
      return tDate >= startOfDay && tDate <= endOfDay
    })
    const dayEntries = entries.filter(e => e.date === dateStr)

    for (const entry of dayEntries) {
      const amountUsd = entry.type === "INCOME" ? (Math.abs(entry.amount) / rate) : -(Math.abs(entry.amount) / rate)
      const exactMatch = dayExisting.find(tx => tx.payee === entry.payee && tx.type === (entry.type || "EXPENSE") && Math.abs(parseFloat(tx.amount as string) - amountUsd) < 0.001)
      if (exactMatch) continue

      const fixMatch = dayExisting.find(tx => tx.payee === entry.payee && tx.type === (entry.type || "EXPENSE") && tx.notes?.includes("(AI Scan)"))
      if (fixMatch) {
        await db.update(transactions).set({ amount: amountUsd.toString(), notes: `Category: ${entry.category || "Other"} (AI Scan - Fixed)`, updatedAt: new Date() }).where(eq(transactions.id, fixMatch.id))
        updatedCount++
      } else {
        const txDate = new Date(dateStr + "T12:00:00")
        const todayMidnight = new Date()
        todayMidnight.setHours(23, 59, 59, 999)
        if (txDate > todayMidnight) continue

        // Try to find if category exists or create it
        let categoryId = null
        if (entry.category) {
          const existingCats = await db.select().from(categories).where(and(eq(categories.userId, userId), eq(categories.name, entry.category))).limit(1)
          if (existingCats.length > 0) {
            categoryId = existingCats[0].id
          } else {
            const newCat = await db.insert(categories).values({ userId, id: crypto.randomUUID(), name: entry.category, type: entry.type === "INCOME" ? "INCOME" : "EXPENSE" }).returning({ id: categories.id })
            categoryId = newCat[0].id
          }
        }

        await db.insert(transactions).values({ 
           userId, 
           accountId: null, 
           categoryId,
           amount: amountUsd.toString(), 
           type: entry.type === "INCOME" ? "INCOME" : "EXPENSE", 
           date: txDate, 
           payee: entry.payee, 
           notes: `Category: ${entry.category || "Other"} (AI Scan)`, 
           isRecurring: false 
        })
        insertedCount++
      }
    }
  }

  const t = translations[lang]

  await syncPiggyBankGoal(userId, lang)
  const syncMsg = t.syncReportsSuccess.replace("{inserted}", String(insertedCount)).replace("{updated}", String(updatedCount))
  await db.insert(notifications).values({ userId, title: t.aiScanComplete, message: syncMsg, type: 'REPORT', createdAt: new Date() })
  await pusherServer.trigger(`user-${userId}`, "invalidate", { type: 'report', message: syncMsg })

  revalidatePath("/reports")
  revalidatePath("/budgets")
  const displayDateStr = (entries[0]?.date ? new Date(entries[0].date) : new Date()).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })

  return { count: insertedCount + updatedCount, date: displayDateStr }
}

// ─── Card / Account Actions ──────────────────────────────────────────────────

export async function addAccountAction(formData: FormData) {
  const userId = await getTargetUserId()
  const name = (formData.get("name") as string)?.trim()
  const type = (formData.get("type") as string)?.trim() || "CREDIT_CARD"
  const currency = (formData.get("currency") as string)?.trim() || "VND"
  const balance = formData.get("balance") as string || "0"
  const color = formData.get("color") as string | null
  const accountNumber = formData.get("accountNumber") as string | null
  const bankId = formData.get("bankId") as string | null
  const holderName = formData.get("holderName") as string | null
  const expiryDate = formData.get("expiryDate") as string | null
  const cvv = formData.get("cvv") as string | null

  if (!name) throw new Error((await getT()).errCardNameRequired)

  await db.insert(cards).values({
    userId,
    name,
    type,
    currency,
    balance,
    color,
    accountNumber,
    bankId,
    holderName,
    expiryDate,
    cvv,
  })

  await logActivity({
    userId,
    action: "CREATE",
    entityType: "CARD",
    description: `Linked new card: ${name}`,
    metadata: { name, type, bankId }
  })

  revalidatePath("/net-worth")
}

export async function deleteAccountAction(cardId: string) {
  const userId = await getCurrentUserId()

  const existing = await db.select().from(cards)
    .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
    .limit(1)

  if (existing.length === 0) throw new Error((await getT()).errCardNotFound)

  await db.delete(cards).where(eq(cards.id, cardId))
  revalidatePath("/net-worth")
}

export async function addTransferAction(formData: FormData) {
  const userId = await getTargetUserId()
  const fromId = formData.get("fromAccountId") as string
  const toId = formData.get("toAccountId") as string
  const amountStr = formData.get("amount") as string
  const notes = formData.get("notes") as string | null

  if (!fromId || !toId || fromId === toId) throw new Error((await getT()).errInvalidTransferAccounts)
  const amount = parseFloat(amountStr)
  if (isNaN(amount) || amount <= 0) throw new Error((await getT()).errInvalidAmount)

  const cookieStore = await cookies()
  const lang = cookieStore.get("lang")?.value || "en"
  const rate = lang === "vi" ? 26000 : 1
  const amountUsd = amount / rate

  const now = new Date()

  // Debit from source
  await db.insert(transactions).values({
    userId, accountId: fromId, amount: (-amountUsd).toString(),
    type: "TRANSFER", date: now, payee: "Transfer Out", notes: notes || undefined,
  })
  // Credit to destination
  await db.insert(transactions).values({
    userId, accountId: toId, amount: amountUsd.toString(),
    type: "TRANSFER", date: now, payee: "Transfer In", notes: notes || undefined,
  })

  // Update balances
  const [from] = await db.select().from(cards).where(eq(cards.id, fromId)).limit(1)
  const [to] = await db.select().from(cards).where(eq(cards.id, toId)).limit(1)
  if (from) {
    await db.update(cards).set({ balance: (parseFloat(from.balance as string) - amountUsd).toString() }).where(eq(cards.id, fromId))
  }
  if (to) {
    await db.update(cards).set({ balance: (parseFloat(to.balance as string) + amountUsd).toString() }).where(eq(cards.id, toId))
  }

  revalidatePath("/net-worth")
  revalidatePath("/transactions")
}

// ─── Goal Actions ────────────────────────────────────────────────────────────

export async function addGoalAction(formData: FormData) {
  const userId = await getTargetUserId()
  const name = (formData.get("name") as string)?.trim()
  const targetAmount = parseFloat(formData.get("targetAmount") as string)
  const deadline = formData.get("deadline") as string | null
  const color = formData.get("color") as string | null
  const icon = formData.get("icon") as string | null

  if (!name) throw new Error((await getT()).errGoalNameRequired)
  if (isNaN(targetAmount) || targetAmount <= 0) throw new Error((await getT()).errInvalidTargetAmount)

  const cookieStore = await cookies()
  const lang = cookieStore.get("lang")?.value || "en"
  const rate = lang === "vi" ? 26000 : 1
  const amountUsd = targetAmount / rate

  const [newGoal] = await db.insert(goals).values({
    userId, name, targetAmount: amountUsd.toString(),
    currentAmount: "0", deadline: deadline || undefined,
    color, icon,
  }).returning({ id: goals.id })

  const t = await getT()
  await logActivity({
    userId,
    action: "CREATE",
    entityType: "GOAL",
    entityId: newGoal.id,
    description: t.activityCreatedGoal
      .replace("{name}", name)
      .replace("{amount}", targetAmount.toString()),
    metadata: { name, targetAmount, deadline }
  })

  await syncPiggyBankGoal(userId, lang as Language)
  revalidatePath("/goals")
}

export async function updateGoalProgressAction(formData: FormData) {
  const goalId = formData.get("goalId") as string
  const contribution = parseFloat(formData.get("amount") as string)

  const userId = await getCurrentUserId()
  const cookieStore = await cookies()
  const lang = cookieStore.get("lang")?.value || "en"
  const rate = lang === "vi" ? 26000 : 1
  const contributionUsd = contribution / rate

  const [goal] = await db.select().from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId))).limit(1)
  if (!goal) throw new Error((await getT()).errGoalNotFound)

  const allGoalsToValidate = await db.select().from(goals).where(eq(goals.userId, userId))
  const piggyBankNameVi = "Tiền heo đất (Piggy Bank)"
  const piggyBankNameEn = "Piggy Bank"
  const piggyBankGoal = allGoalsToValidate.find(g => g.name === piggyBankNameVi || g.name === piggyBankNameEn)
  const piggyBankBalance = piggyBankGoal ? parseFloat(piggyBankGoal.currentAmount as string) : 0

  // If user tries to add more than they have in the piggy bank (reserves)
  if (contributionUsd > piggyBankBalance) {
     throw new Error((await getT()).errInsufficientReserves || "Insufficient reserves")
  }

  const newAmount = Math.max(0, Math.min(
    parseFloat(goal.currentAmount as string) + contributionUsd,
    parseFloat(goal.targetAmount as string)
  ))
  await db.update(goals).set({ currentAmount: newAmount.toString(), updatedAt: new Date() }).where(eq(goals.id, goalId))
  
  await syncPiggyBankGoal(userId, lang as Language)
  revalidatePath("/goals")
}



export async function deleteGoalAction(goalId: string) {
  const userId = await getCurrentUserId()
  const [goal] = await db.select().from(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId))).limit(1)
  if (!goal) throw new Error((await getT()).errGoalNotFound)
  const t = await getT()

  // Actually delete the goal from the database
  await db.delete(goals).where(eq(goals.id, goalId))

  await logActivity({
    userId,
    action: "DELETE",
    entityType: "GOAL",
    entityId: goalId,
    description: t.activityDeletedGoal.replace("{name}", goal.name),
  })

  const cookieStore = await cookies()
  const lang = cookieStore.get("lang")?.value || "en"
  await syncPiggyBankGoal(userId, lang as Language)
  revalidatePath("/goals")
}

export async function completeGoalWithPiggyBankAction(goalId: string) {
  const userId = await getCurrentUserId()
  const [goal] = await db.select().from(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId))).limit(1)
  if (!goal) throw new Error((await getT()).errGoalNotFound)

  const allGoalsToValidate = await db.select().from(goals).where(eq(goals.userId, userId))
  const piggyBankNameVi = "Tiền heo đất (Piggy Bank)"
  const piggyBankNameEn = "Piggy Bank"
  const piggyBankGoal = allGoalsToValidate.find(g => g.name === piggyBankNameVi || g.name === piggyBankNameEn)
  const piggyBankBalance = piggyBankGoal ? parseFloat(piggyBankGoal.currentAmount as string) : 0

  const neededAmount = parseFloat(goal.targetAmount as string) - parseFloat(goal.currentAmount as string)

  if (neededAmount > piggyBankBalance) {
     throw new Error((await getT()).errInsufficientReserves || "Insufficient reserves to complete goal")
  }

  // Mark as complete by setting currentAmount = targetAmount
  await db.update(goals).set({ currentAmount: goal.targetAmount, updatedAt: new Date() }).where(eq(goals.id, goalId))
  
  const t = await getT()
  await logActivity({
    userId,
    action: "UPDATE",
    entityType: "GOAL",
    entityId: goalId,
    description: t.activityGoalCompleted.replace("{name}", goal.name),
  })

  const cookieStore = await cookies()
  const lang = cookieStore.get("lang")?.value || "en"
  await syncPiggyBankGoal(userId, lang as Language)
  revalidatePath("/goals")
}

// ─── Budget (category) Actions ───────────────────────────────────────────────

export async function addBudgetAction(formData: FormData) {
  const userId = await getTargetUserId()
  const categoryName = (formData.get("category") as string)?.trim() || "General"
  const amount = parseFloat(formData.get("amount") as string)
  const period = (formData.get("period") as string) || "MONTHLY"

  if (isNaN(amount) || amount <= 0) throw new Error((await getT()).errInvalidAmount)

  const cookieStore = await cookies()
  const lang = cookieStore.get("lang")?.value || "en"
  const rate = lang === "vi" ? 26000 : 1
  const amountUsd = amount / rate

  // Find or create category
  let [cat] = await db.select().from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.name, categoryName))).limit(1)

  if (!cat) {
    const [newCat] = await db.insert(categories).values({
      userId, name: categoryName, type: "EXPENSE",
    }).returning()
    cat = newCat
  }

  await db.insert(budgets).values({
    userId, categoryId: cat.id, amount: amountUsd.toString(), period,
  })

  revalidatePath("/reports")
}

// ─── Auth and User Management Actions ──────────────────────────────────────────

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", { ...Object.fromEntries(formData), redirectTo: "/" });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
       throw error;
    }
    // AuthError
    throw new Error("Invalid credentials");
  }
}

export async function loginWithGoogleAction() {
  await signIn("google", { redirectTo: "/" });
}

export async function loginWithGithubAction() {
  await signIn("github", { redirectTo: "/" });
}

export async function registerAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password || !name) {
    throw new Error("Missing fields");
  }

  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser.length > 0) {
    throw new Error("Email already exists");
  }

  const bcrypt = (await import("bcryptjs")).default;
  const hashed = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    email,
    password: hashed,
    name,
    role: "user"
  });

  // Automatically log them in after registration
  await signIn("credentials", { email, password });
}

export async function logoutAction() {
  await signOut()
}

export async function setManagedUserAction(userId: string | null) {
  const cookieStore = await cookies()
  if (userId) {
    cookieStore.set("managedUserId", userId)
  } else {
    cookieStore.delete("managedUserId")
  }
}

export async function updateAccountBalanceAction(accountId: string, balance: string) {
  const userId = await getTargetUserId()
  const val = parseFloat(balance)
  if (isNaN(val)) throw new Error((await getT()).errInvalidBalance)
  
  await db.update(cards).set({ balance: val.toString(), updatedAt: new Date() }).where(and(eq(cards.id, accountId), eq(cards.userId, userId)))
  revalidatePath("/net-worth")
}

export async function markNotificationAsReadAction(notificationId: string) {
  const userId = await getCurrentUserId()
  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
  
  revalidatePath("/")
  await pusherServer.trigger(`user-${userId}`, "invalidate", { type: 'notification_read' })
}

export async function markAllNotificationsAsReadAction() {
  const userId = await getCurrentUserId()
  await db.update(notifications).set({ isRead: true })
    .where(eq(notifications.userId, userId))

  revalidatePath("/")
  await pusherServer.trigger(`user-${userId}`, "invalidate", { type: 'notification_read' })
}

export async function syncDailyReportsAction() {
  const userId = await getCurrentUserId()
  const cookieStore = await cookies()
  const lang = (cookieStore.get("lang")?.value || "vi") as Language
  const { createdCount, updatedCount } = await syncDailyReports(userId, lang)

  const t = translations[lang as keyof typeof translations]

  const message = createdCount > 0
    ? t.reportCreated.replace("{count}", String(createdCount)) + (updatedCount > 0 ? " " + t.reportUpdated.replace("{count}", String(updatedCount)) : "")
    : updatedCount > 0
      ? t.reportUpdated.replace("{count}", String(updatedCount))
      : t.syncComplete

  // Always insert a notification so the bell reflects the manual sync result
  await db.insert(notifications).values({
    userId,
    title: t.aiScanComplete,
    message,
    type: 'REPORT',
    createdAt: new Date()
  })

  // Trigger pusher to refresh all tabs for this user
  await pusherServer.trigger(`user-${userId}`, "invalidate", {
     type: 'report',
     message: message
  })
  
  revalidatePath("/reports")
}

export async function syncMonthlyReportsAction() {
  const userId = await getCurrentUserId()
  const cookieStore = await cookies()
  const lang = (cookieStore.get("lang")?.value || "vi") as Language
  await syncMonthlyReports(userId, lang)
  
  const t = translations[lang]

  await pusherServer.trigger(`user-${userId}`, "invalidate", {
     type: 'report',
     message: t.newMonthReport
  })
  
  revalidatePath("/reports")
}

export async function checkTodayActivitiesAction() {
  const userId = await getCurrentUserId()
  
  const ictTodayStr = new Intl.DateTimeFormat("en-CA", {
     timeZone: "Asia/Ho_Chi_Minh",
     year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date())

  const allTx = await db.select().from(transactions).where(eq(transactions.userId, userId))
  const todayTx = allTx.filter(t => {
     // Transaction date to YYYY-MM-DD in UTC (since we store T12:00:00)
     const dStr = new Date(t.date).toISOString().split('T')[0]
     return dStr === ictTodayStr
  })

  return todayTx.length > 0
}

/**
 * Insert an evening reminder notification (called at 9 PM ICT by the realtime scheduler).
 * Avoids duplicate: only inserts once per day.
 */
export async function insertEveningReminderAction(hasActivities: boolean) {
  const userId = await getCurrentUserId()

  const ictTodayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date())

  const cookieStore = await cookies()
  const lang = (cookieStore.get("lang")?.value || "vi") as Language
  const t = translations[lang]

  const title = t.dailyReminderTitle
  const dateFormatted = ictTodayStr.split('-').reverse().join('/')
  const message = hasActivities
    ? `[${dateFormatted}] ${t.dailyHasActivities}`
    : `[${dateFormatted}] ${t.dailyNoActivities}`

  // Prevent duplicate: only insert if no reminder today
  const existing = await db.select().from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.title, title)))
    .limit(10)

  const alreadyToday = existing.some(n => {
    const d = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date(n.createdAt))
    return d === ictTodayStr
  })

  if (!alreadyToday) {
    await db.insert(notifications).values({
      userId,
      title,
      message,
      type: hasActivities ? 'SUCCESS' : 'WARNING',
      createdAt: new Date()
    })

    await pusherServer.trigger(`user-${userId}`, "invalidate", {
      type: 'reminder',
      message: hasActivities
        ? t.dailyHasActivities
        : t.dailyNoActivities
    })
  }
}

export async function checkLoansAction() {
  const userId = await getCurrentUserId()
  const now = new Date()

  const overdueLoans = await db.select().from(loans)
    .where(and(
      eq(loans.borrowerId, userId),
      eq(loans.status, 'APPROVED')
    ))

  for (const loan of overdueLoans) {
    if (new Date(loan.deadline || '') < now) {
      const currentAmount = parseFloat(loan.amount as string)
      const newAmount = currentAmount * 1.1 // 10% interest
      
      await db.update(loans).set({ 
        status: 'OVERDUE', 
        amount: newAmount.toString(),
        updatedAt: new Date()
      }).where(eq(loans.id, loan.id))

      const t = translations[((await cookies()).get("lang")?.value || "vi") as Language]

      await db.insert(notifications).values({
        userId,
        title: t.overdue.toUpperCase(),
        message: `${t.overdue}! ${t.interest}. ${t.amount}: ${newAmount.toFixed(2)} USD`,
        type: 'ERROR'
      })
      
      await pusherServer.trigger(`user-${userId}`, "invalidate", { type: 'loan_update' })
    }
  }
}

export async function searchUsersAction(query: string) {
  const currentUserId = await getCurrentUserId()
  const usersFound = await searchUsers(query, currentUserId)
  return usersFound
}

export async function updateUserAction(formData: FormData) {
  const userId = await getCurrentUserId()
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const currency = formData.get("currency") as string
  const budgetAlerts = formData.get("budgetAlerts") === "true"
  const monthlySummary = formData.get("monthlySummary") === "true"

  await db.update(users).set({
    name,
    email,
    currency,
    budgetAlerts,
    monthlySummary,
  }).where(eq(users.id, userId))

  revalidatePath("/settings")
  return { success: true }
}

export async function createBillAction(formData: FormData) {
  const userId = await getTargetUserId()
  const name = (formData.get("name") as string)?.trim()
  const amountRaw = parseFloat(formData.get("amount") as string)
  const dueDate = formData.get("dueDate") as string
  const frequency = formData.get("frequency") as string || "MONTHLY"
  const categoryId = formData.get("categoryId") as string | null

  if (!name || isNaN(amountRaw) || !dueDate) {
    throw new Error("Missing required bill information.")
  }

  const cookieStore = await cookies()
  const lang = cookieStore.get("lang")?.value || "en"
  const rate = lang === "vi" ? 26000 : 1
  const amountUsd = amountRaw / rate

  await db.insert(bills).values({
    userId,
    name,
    amount: amountUsd.toString(),
    dueDate,
    frequency,
    categoryId: categoryId || null,
    status: 'UNPAID'
  })

  revalidatePath("/bills")
  await pusherServer.trigger(`user-${userId}`, "invalidate", { type: 'bill_update' })
}

export async function deleteBillAction(billId: string) {
  const userId = await getTargetUserId()
  await db.delete(bills).where(and(eq(bills.id, billId), eq(bills.userId, userId)))
  revalidatePath("/bills")
  await pusherServer.trigger(`user-${userId}`, "invalidate", { type: 'bill_update' })
}

export async function markBillAsPaidAction(billId: string) {
  const userId = await getTargetUserId()
  
  const [bill] = await db.select().from(bills).where(and(eq(bills.id, billId), eq(bills.userId, userId))).limit(1)
  if (!bill) throw new Error("Bill not found.")

  const amountUsd = parseFloat(bill.amount as string)
  
  // Create a transaction for this payment
  await db.insert(transactions).values({
    userId,
    amount: (-amountUsd).toString(),
    type: "EXPENSE",
    date: new Date(),
    payee: `Bill Payment: ${bill.name}`,
    notes: `Recurring ${bill.frequency} payment`,
    isRecurring: true
  })

  // Update bill status and set next due date based on frequency
  const currentDueDate = new Date(bill.dueDate)
  let nextDueDate = new Date(currentDueDate)

  if (bill.frequency === "MONTHLY") {
    nextDueDate.setMonth(nextDueDate.getMonth() + 1)
  } else if (bill.frequency === "YEARLY") {
    nextDueDate.setFullYear(nextDueDate.getFullYear() + 1)
  } else if (bill.frequency === "WEEKLY") {
    nextDueDate.setDate(nextDueDate.getDate() + 7)
  }

  await db.update(bills).set({
    status: 'UNPAID', // Reset to unpaid for the next cycle
    dueDate: nextDueDate.toISOString().split('T')[0],
    lastPaidDate: new Date(),
    updatedAt: new Date()
  }).where(eq(bills.id, billId))

  revalidatePath("/bills")
  revalidatePath("/transactions")
  revalidatePath("/budgets")
  await pusherServer.trigger(`user-${userId}`, "invalidate", { type: 'bill_update' })
}
