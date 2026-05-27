import { db } from "@/schema"
import { users, financialAccounts, goals, budgets, transactions, categories, monthlyBudgets, dailyBudgets, dailyReports, monthlyReports, notifications, friends, messages, loans, activities, bills } from "@/schema"
import { eq, desc, and, lte, getTableColumns, or, ne, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

/**
 * Robust database data access layer with fallback support.
 * If the connection to PostgreSQL fails (e.g., config error), it falls back to empty arrays or seed.
 */

import { auth } from "@/auth"
import { cookies } from "next/headers"
import { translations, Language } from "@/lib/i18n/translations"

/**
 * Get current date string in ICT (Vietnam) timezone (YYYY-MM-DD)
 */
export function getTodayStringICT() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", 
    month: "2-digit", 
    day: "2-digit"
  }).format(new Date())
}

export function getICTNow() {
  const d = new Date()
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit"
  }).format(d)
  const [year, month] = s.split("-").map(Number)
  return { month, year }
}


export async function getUser() {
  const session = await auth()
  if (!session || !session.user) {
    // Return null so we can check it gracefully
    return null
  }
  
  try {
    const allUsers = await db.select().from(users).where(eq(users.id, session.user.id as string))
    if (allUsers.length > 0) return allUsers[0]
    return null
  } catch (e) {
    console.error("Database connection failed for user", e)
    return null
  }
}

export async function getManagedUserId() {
  const sessionUser = await getUser();
  if (!sessionUser) return null;
  // Regular user: always their own id
  if (sessionUser.role !== 'admin') return sessionUser.id;
  // Admin: read cookie. If no cookie → return null (means "all users")
  const cookieStore = await cookies();
  const managedId = cookieStore.get("managedUserId")?.value;
  return managedId || null;
}

export async function getAllUsers() {
  try {
    const list = await db.select().from(users)
    return list;
  } catch (e) {
    console.error("Failed to get all users", e);
    return [];
  }
}

export async function getUserById(userId: string) {
  try {
    const result = await db.select().from(users).where(eq(users.id, userId))
    return result[0] || null;
  } catch (e) {
    console.error("Failed to get user by id", e);
    return null;
  }
}

export async function getAccounts(userId: string) {
  try {
    const accs = await db.select().from(financialAccounts).where(eq(financialAccounts.userId, userId))
    return accs
  } catch (e) {
    console.error("Database connection failed for accounts", e)
    return []
  }
}

export async function getGoals(userId: string) {
  try {
    const userGoals = await db.select().from(goals).where(eq(goals.userId, userId))
    return userGoals
  } catch (e) {
    console.error("Database connection failed for goals", e)
    return []
  }
}

export async function getBudgets(userId: string) {
  try {
    const budgetList = await db
      .select({
        budget: budgets,
        category: categories
      })
      .from(budgets)
      .where(eq(budgets.userId, userId))
      .leftJoin(categories, eq(budgets.categoryId, categories.id))

    const userTransactions = await db.select().from(transactions).where(eq(transactions.userId, userId))

    const enrichedBudgets = budgetList.map(item => {
      const now = new Date()
      const b = item.budget
      const cat = item.category
      const isDaily = b.period.toLowerCase() === 'daily'
      
      const filteredTx = userTransactions.filter(t => {
        const tDate = new Date(t.date as string | number | Date)
        if (isDaily) {
          return tDate.toDateString() === now.toDateString() && t.categoryId === b.categoryId
        } else {
          return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear() && t.categoryId === b.categoryId
        }
      })

       const spent = filteredTx
         .filter(t => parseFloat(t.amount as string) < 0)
         .reduce((acc, t) => acc + Math.abs(parseFloat(t.amount as string)), 0)
       return { ...b, categoryName: cat?.name || "General", spent }
    })

    return enrichedBudgets
  } catch (e) {
    console.error("Failed to get budgets", e)
    return []
  }
}

export async function getTransactions(userId: string, limit: number = 50, offset: number = 0) {
  try {
    const list = await db.select({
      ...getTableColumns(transactions),
      categoryName: categories.name
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date))
    .limit(limit)
    .offset(offset)
    return list
  } catch (e) {
    console.error("Database connection failed for transactions", e)
    return []
  }
}

export async function getLatestSalary(userId: string) {
  try {
    const list = await db.select().from(monthlyBudgets)
      .where(eq(monthlyBudgets.userId, userId))
      .orderBy(desc(monthlyBudgets.year), desc(monthlyBudgets.month))
    
    const valid = list.find(m => parseFloat(m.totalSalary as string) > 0)
    return valid ? parseFloat(valid.totalSalary as string) : 0
  } catch { return 0 }
}

export async function getTransactionCount(userId?: string) {
  try {
    const filter = userId ? eq(transactions.userId, userId) : undefined
    const result = await db.select({ id: transactions.id }).from(transactions).where(filter)
    return result.length
  } catch { return 0 }
}

export async function getDashboardStats(userId: string) {
  try {
    const now = new Date()
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const allUserTransactions = await db.select().from(transactions).where(eq(transactions.userId, userId))
    
    // Grouping by monthly periods
    const currentMonthTx = allUserTransactions.filter(t => new Date(t.date as string | number | Date) >= firstDayCurrentMonth)
    const lastMonthTx = allUserTransactions.filter(t => {
      const d = new Date(t.date as string | number | Date)
      return d >= firstDayLastMonth && d <= lastDayLastMonth
    })

    const calculateTotals = (txs: { amount: string | number; type: string }[]) => {
      let income = 0; let expense = 0
      txs.forEach(t => {
        const amt = typeof t.amount === 'string' ? parseFloat(t.amount) : Number(t.amount)
        if (amt > 0 || t.type === 'INCOME') income += Math.abs(amt)
        else expense += Math.abs(amt)
      })
      return { income, expense }
    }

    const currentTotals = calculateTotals(currentMonthTx)
    const lastTotals = calculateTotals(lastMonthTx)

    // Calculate percentages
    const calcDiff = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0
      return ((curr - prev) / prev) * 100
    }

    // Generate chart data for last 30 days
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const last30DaysTx = allUserTransactions.filter(t => new Date(t.date as string | number | Date) >= thirtyDaysAgo)
    
    const chartMap = new Map<string, { income: number; expense: number }>()
    for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        chartMap.set(d.toISOString().split('T')[0], { income: 0, expense: 0 })
    }

    last30DaysTx.forEach(t => {
        const dateKey = new Date(t.date as string | number | Date).toISOString().split('T')[0]
        if (chartMap.has(dateKey)) {
            const entry = chartMap.get(dateKey)!
            const amt = parseFloat(t.amount)
            if (amt > 0 || t.type === 'INCOME') entry.income += Math.abs(amt)
            else entry.expense += Math.abs(amt)
        }
    })

    const chartData = Array.from(chartMap.entries())
        .map(([date, vals]) => ({ 
            date: date.split('-').slice(1).join('/'), // MM/DD
            fullDate: date,
            ...vals 
        }))
        .sort((a, b) => a.fullDate.localeCompare(b.fullDate))

    return {
      currentMonth: currentTotals,
      lastMonth: lastTotals,
      diff: {
        income: calcDiff(currentTotals.income, lastTotals.income),
        expense: calcDiff(currentTotals.expense, lastTotals.expense)
      },
      chartData
    }
  } catch (e) {
    console.error("Failed to get dashboard stats", e)
    return null
  }
}

export async function getAllGoals() {
  try {
    const list = await db
      .select({
        goal: goals,
        user: { name: users.name, email: users.email }
      })
      .from(goals)
      .leftJoin(users, eq(goals.userId, users.id))
      .orderBy(desc(goals.createdAt))
    return list.map(item => ({ ...item.goal, user: item.user }))
  } catch { return [] }
}

export async function getAllBudgets() {
  try {
    const list = await db
      .select({
        budget: budgets,
        category: categories,
        user: { name: users.name, email: users.email }
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .leftJoin(users, eq(budgets.userId, users.id))
    
    // For "All Users", calculating spent for each is expensive but we do it for parity
    const allTx = await db.select().from(transactions)

    return list.map(item => {
      const now = new Date()
      const isDaily = item.budget.period.toLowerCase() === 'daily'
      
      const filteredTx = allTx.filter((t: { date: string | number | Date; userId: string; categoryId: string | null; amount: string | number }) => {
        const tDate = new Date(t.date)
        const isMatch = t.userId === item.budget.userId && t.categoryId === item.budget.categoryId
        if (!isMatch) return false

        if (isDaily) return tDate.toDateString() === now.toDateString()
        return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear()
      })

      const spent = filteredTx.reduce((acc, t) => acc + Math.abs(parseFloat(t.amount)), 0)
      return { ...item.budget, categoryName: item.category?.name || "General", user: item.user, spent }
    })
  } catch { return [] }
}

export async function getAllAccounts() {
  try {
    const list = await db
      .select({
        account: financialAccounts,
        user: { name: users.name, email: users.email }
      })
      .from(financialAccounts)
      .leftJoin(users, eq(financialAccounts.userId, users.id))
    return list.map(item => ({ ...item.account, user: item.user }))
  } catch { return [] }
}

export async function getAllTransactions(limit: number = 1000, offset: number = 0) {
  try {
    const list = await db
      .select({
        ...getTableColumns(transactions),
        categoryName: categories.name,
        user: { name: users.name, email: users.email }
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .orderBy(desc(transactions.date))
      .limit(limit)
      .offset(offset)
    return list
  } catch { return [] }
}

export async function getAdminStats() {
  try {
    const allUsers = await db.select().from(users)
    const allAccounts = await db.select().from(financialAccounts)
    
    // Join transactions with users to show who did what on the dashboard
    const activityList = await db
      .select({
        transaction: transactions,
        user: { name: users.name, email: users.email }
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.date))
      .limit(10)

    const totalTransactionsResult = await db.select().from(transactions)
    const totalTransactions = totalTransactionsResult.length

    const totalSystemValue = allAccounts.reduce((acc, a) => acc + parseFloat(a.balance as string), 0)
    
    const allRawTransactions = await db.select({ amount: transactions.amount }).from(transactions)
    const totalTransactionVolume = allRawTransactions.reduce((acc, t) => acc + Math.abs(parseFloat(t.amount as string)), 0)

    const sortedUsers = [...allUsers].reverse()

    // NEW: Volume by user for chart
    const volumeByUserMap = new Map<string, number>()
    allRawTransactions.forEach((t: { amount: string | number; userId?: string | null }) => {
        const uid = t.userId || 'unknown'
        volumeByUserMap.set(uid, (volumeByUserMap.get(uid) || 0) + Math.abs(typeof t.amount === 'string' ? parseFloat(t.amount) : Number(t.amount)))
    })
    
    const volumeByUserData = allUsers.map(u => ({
        name: u.name || u.email || 'User',
        volume: volumeByUserMap.get(u.id) || 0
    })).sort((a, b) => b.volume - a.volume).slice(0, 5)

    return {
      totalUsers: allUsers.length,
      totalTransactions,
      totalSystemValue,
      totalTransactionVolume,
      recentSystemActivity: activityList.map(item => ({ ...item.transaction, user: item.user })),
      usersList: sortedUsers.slice(0, 5),
      volumeByUserData
    }
  } catch (e) {
    console.error("Admin stats failed", e)
    return {
      totalUsers: 0,
      totalTransactions: 0,
      totalSystemValue: 0,
      totalTransactionVolume: 0,
      recentSystemActivity: [],
      usersList: [],
      volumeByUserData: []
    }
  }
}

export async function getMonthlyBudget(userId: string, month: number, year: number) {
  try {
    const result = await db.select().from(monthlyBudgets)
      .where(and(eq(monthlyBudgets.userId, userId), eq(monthlyBudgets.month, month), eq(monthlyBudgets.year, year)))
      .limit(1)
    return result[0] || null
  } catch (e) {
    console.error("Failed to get monthly budget", e)
    return null
  }
}

export async function getDailyBudgets(userId: string, month: number, year: number) {
  try {
    const list = await db.select().from(dailyBudgets)
      .where(and(
        eq(dailyBudgets.userId, userId),
        sql`EXTRACT(MONTH FROM ${dailyBudgets.date}) = ${month}`,
        sql`EXTRACT(YEAR FROM ${dailyBudgets.date}) = ${year}`
      ))
      .orderBy(dailyBudgets.date)
    return list
  } catch (e) {
    console.error("Failed to get daily budgets", e)
    return []
  }
}

/**
 * Calculates carry-over balance from all previous months.
 * CarryOver_M = sum(Salary_{m < M}) - sum(ActualCosts_{m < M})
 */
export async function getCarryOver(userId: string, targetMonth: number, targetYear: number) {
  try {
     const allMb = await db.select().from(monthlyBudgets).where(eq(monthlyBudgets.userId, userId))
     const previousBudgets = allMb.filter(mb => 
        mb.year < targetYear || (mb.year === targetYear && mb.month < targetMonth)
     )
     
     if (previousBudgets.length === 0) return 0
     
     // Find the most recent month with a manual reserveFunds entry to use as a starting seed
     const manualReserveBudgets = previousBudgets.filter(mb => parseFloat(mb.reserveFunds as string) > 0)
     manualReserveBudgets.sort((a, b) => b.year - a.year || b.month - a.month)
     
     const latestManual = manualReserveBudgets[0]
     let carryOverBase = 0
     let startMonth = 0
     let startYear = 0
     
     if (latestManual) {
        carryOverBase = parseFloat(latestManual.reserveFunds as string)
        startMonth = latestManual.month
        startYear = latestManual.year
     }
     
     const allTx = await db.select().from(transactions).where(eq(transactions.userId, userId))
     
     let totalBalance = carryOverBase
     for (const mb of previousBudgets) {
        // Only sum savings from the month of the manual seed onwards
        if (latestManual && (mb.year < startYear || (mb.year === startYear && mb.month < startMonth))) {
           continue
        }
        
        const monthTx = allTx.filter(tx => {
           const d = new Date(new Date(tx.date).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
           return (d.getMonth() + 1) === mb.month && d.getFullYear() === mb.year
        })
        
        let actualExpenses = 0
        monthTx.forEach(t => {
           const amt = parseFloat(t.amount)
           if (t.type === 'EXPENSE' || amt < 0) actualExpenses += Math.abs(amt)
           else if (t.type === 'INCOME' || amt > 0) actualExpenses -= Math.abs(amt)
        })
        
        const salary = parseFloat(mb.totalSalary as string) || 0
        totalBalance += (salary - actualExpenses)
     }
     return totalBalance
  } catch (e) {
    console.error("Failed to calculate carry over", e)
    return 0
  }
}

export async function syncPiggyBankGoal(userId: string, lang: Language = "vi") {
  try {
    const piggyBankName = lang === "vi" ? "Tiền heo đất (Piggy Bank)" : "Piggy Bank"
    const { month: currentM, year: currentY } = getICTNow()

    const allMonths = await db.select().from(monthlyBudgets).where(eq(monthlyBudgets.userId, userId))
    const currentMonthBudget = allMonths.find(mb => mb.month === currentM && mb.year === currentY)

    let baseReserve = 0
    
    // If the user manually entered a reserve limit for THIS month, use it as the base
    if (currentMonthBudget && parseFloat(currentMonthBudget.reserveFunds as string) > 0) {
       baseReserve = parseFloat(currentMonthBudget.reserveFunds as string)
    } else {
       // Otherwise, start with carry-over from all previous months
       baseReserve = await getCarryOver(userId, currentM, currentY)
    }

    // Add current month's savings to the live reserve pool
    const allTx = await db.select().from(transactions).where(eq(transactions.userId, userId))
    const currentMonthTx = allTx.filter(t => {
       const d = new Date(t.date as string | number | Date)
       return d.getFullYear() === currentY && (d.getMonth() + 1) === currentM
    })

    let currentIncome = 0
    let currentExpense = 0
    currentMonthTx.forEach(t => {
       const amt = parseFloat(t.amount as string)
       if (t.type === 'INCOME' || amt > 0) currentIncome += Math.abs(amt)
       else currentExpense += Math.abs(amt)
    })

    const currentSalary = currentMonthBudget ? parseFloat(currentMonthBudget.totalSalary as string) : 0
    const currentSavings = currentSalary - (currentExpense - currentIncome)
    
    // The total live pool includes the starting reserve + whatever we saved so far this month
    const totalLivePool = baseReserve + currentSavings

    // Subtract amounts already allocated to OTHER goals
    const allGoals = await db.select().from(goals).where(eq(goals.userId, userId))
    let allocatedToGoals = 0
    for (const g of allGoals) {
       if (g.name !== "Tiền heo đất (Piggy Bank)" && g.name !== "Piggy Bank") {
          allocatedToGoals += parseFloat(g.currentAmount as string) || 0
       }
    }

    const remainingPiggyBank = Math.max(0, totalLivePool - allocatedToGoals)

    // Upsert Piggy Bank Goal
    const existingGoal = allGoals.find(g => g.name === piggyBankName || g.name === "Tiền heo đất (Piggy Bank)" || g.name === "Piggy Bank")
    // Target amount is the total potential pool (base limit + savings)
    const targetAmount = Math.max(totalLivePool, remainingPiggyBank, 0.01)
    
    if (existingGoal) {
       await db.update(goals).set({
          currentAmount: remainingPiggyBank.toFixed(6),
          targetAmount: targetAmount.toFixed(6),
          updatedAt: new Date()
       }).where(eq(goals.id, existingGoal.id))
    } else {
       await db.insert(goals).values({
          userId,
          name: piggyBankName,
          targetAmount: targetAmount.toFixed(6),
          currentAmount: remainingPiggyBank.toFixed(6),
          icon: "bg-pink-500",
          color: "bg-pink-100/50"
       })
    }
  } catch (e) {
    console.error("Failed to sync Piggy bank", e)
  }
}


export async function getDailyActivities(userId: string, dateStr: string) {
  try {
    const targetDate = new Date(dateStr)
    
    const list = await db.select().from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        // Simplistic check for date parity in JS since we use timestamp in schema
      ))
    
    // More robust backend date filtering
    return list.filter(t => {
      const d = new Date(t.date as string | number | Date)
      return d.toDateString() === targetDate.toDateString()
    })
  } catch { return [] }
}

export async function syncDailyReports(userId: string, lang: Language = "vi"): Promise<{ createdCount: number; updatedCount: number }> {
  const t = translations[lang]
  let createdCount = 0
  let updatedCount = 0
  try {
    const todayStr = getTodayStringICT()
    
    const budgetsToReport = await db.select().from(dailyBudgets)
      .where(eq(dailyBudgets.userId, userId))
    
    const pastBudgets = budgetsToReport.filter(b => b.date < todayStr)

    if (pastBudgets.length === 0) return { createdCount, updatedCount }

    const allTx = await db.select().from(transactions).where(eq(transactions.userId, userId))

    for (const budget of pastBudgets) {
      const bDateStart = new Date(budget.date + "T00:00:00")
      const bDateEnd = new Date(budget.date + "T23:59:59")
      
      const dayTransactions = allTx.filter(t => {
        const tDate = new Date(t.date as string | number | Date)
        return tDate >= bDateStart && tDate <= bDateEnd
      })

      // Only create/update report if there are activities for this day
      if (dayTransactions.length === 0) {
        // Notify user they missed a day (only for past days, not today before 9 PM)
        const notifTitle = t.missingActivityTitle
        const notifMsg = t.missingActivityMsg.replace("{date}", budget.date)
        
        const ictNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
        const currentHour = ictNow.getHours()
        const shouldNotify = budget.date !== todayStr || currentHour >= 21

        if (shouldNotify) {
            const existingNotif = await db.select().from(notifications).where(and(
               eq(notifications.userId, userId),
               eq(notifications.title, notifTitle),
               eq(notifications.message, notifMsg)
            )).limit(1)

            if (existingNotif.length === 0) {
               await db.insert(notifications).values({
                  userId,
                  title: notifTitle,
                  message: notifMsg,
                  type: 'WARNING',
                  createdAt: new Date()
               })
            }
        }
        
        // If a report exists but now has 0 activities (e.g. deleted), update it
        const existingReport = await db.select().from(dailyReports).where(and(eq(dailyReports.userId, userId), eq(dailyReports.date, budget.date))).limit(1)
        if (existingReport.length > 0 && parseFloat(existingReport[0].actualCost as string) !== 0) {
            const expected = parseFloat(budget.expectedCost as string)
            await db.update(dailyReports).set({
                actualCost: "0",
                saving: expected.toString()
            }).where(eq(dailyReports.id, existingReport[0].id))
            updatedCount++
        }
        continue
      }

      let actualCost = 0
      dayTransactions.forEach(t => {
        const amt = parseFloat(t.amount as string)
        if (t.type === 'EXPENSE' || amt < 0) {
           actualCost += Math.abs(amt)
        } else if (t.type === 'INCOME' || amt > 0) {
           actualCost -= Math.abs(amt)
        }
      })

      const expected = parseFloat(budget.expectedCost as string)
      const saving = expected - actualCost

      // Upsert report
      const existing = await db.select().from(dailyReports).where(and(eq(dailyReports.userId, userId), eq(dailyReports.date, budget.date))).limit(1)
      
      if (existing.length > 0) {
        // Always update to keep data fresh
        const existingActualCost = parseFloat(existing[0].actualCost as string) || 0
        const existingExpected = parseFloat(existing[0].expectedCost as string) || 0
        if (Math.abs(existingActualCost - actualCost) > 0.001 || Math.abs(existingExpected - expected) > 0.001) {
            await db.update(dailyReports).set({
                actualCost: actualCost.toString(),
                saving: saving.toString(),
                expectedCost: expected.toString()
            }).where(eq(dailyReports.id, existing[0].id))
            updatedCount++
        }
      } else {
        await db.insert(dailyReports).values({
            userId,
            date: budget.date,
            expectedCost: expected.toString(),
            actualCost: actualCost.toString(),
            saving: saving.toString(),
            createdAt: new Date()
        })
        createdCount++
      }
    }
  } catch (e) {
    console.error("Failed to sync daily reports", e)
  }
  return { createdCount, updatedCount }
}

export async function syncMonthlyReports(userId: string, lang: Language = "vi") {
  try {
    const t = translations[lang]
    const todayStr = getTodayStringICT()
    const [currentY, currentM] = todayStr.split("-").map(Number)
    
    const allMonthlyBudgets = await db.select().from(monthlyBudgets).where(eq(monthlyBudgets.userId, userId))
    const existingReports = await db.select().from(monthlyReports).where(eq(monthlyReports.userId, userId))
    
    const reportedKeys = new Set(existingReports.map(r => `${r.year}-${r.month}`))
    const allTx = await db.select().from(transactions).where(eq(transactions.userId, userId))

    for (const mb of allMonthlyBudgets) {
       const isFinished = currentY > mb.year || (currentY === mb.year && currentM > mb.month)

       const key = `${mb.year}-${mb.month}`
       
       if (isFinished && !reportedKeys.has(key)) {
          // One final check to prevent race conditions
          const check = await db.select().from(monthlyReports).where(and(eq(monthlyReports.userId, userId), eq(monthlyReports.month, mb.month), eq(monthlyReports.year, mb.year))).limit(1)
          if (check.length > 0) continue

          const monthTx = allTx.filter(t => {
             const d = new Date(t.date as string | number | Date)
             return d.getFullYear() === mb.year && (d.getMonth() + 1) === mb.month
          })

          let totalExpense = 0
          monthTx.forEach(t => {
             const amt = parseFloat(t.amount as string)
             if (t.type === 'EXPENSE' || amt < 0) {
                totalExpense += Math.abs(amt)
             } else if (t.type === 'INCOME' || amt > 0) {
                totalExpense -= Math.abs(amt)
             }
          })

          const salary = parseFloat(mb.totalSalary as string)
          const savings = salary - totalExpense
          const performance = salary > 0 ? (savings / salary) * 100 : 0

          await db.insert(monthlyReports).values({
             userId,
             month: mb.month,
             year: mb.year,
             totalSalary: salary.toString(),
             actualExpense: totalExpense.toString(),
             savings: savings.toString(),
             performance: performance.toString()
          })
          
          // Only notify if user enabled it and not already notified recently
          const user = await db.select().from(users).where(eq(users.id, userId)).limit(1).then(res => res[0])
          const title = `${t.monthlyReport} ${mb.month}/${mb.year}`
          const recentNotif = await db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.title, title))).limit(1)
          
          if (recentNotif.length === 0 && user?.monthlySummary !== false) {
             await db.insert(notifications).values({
                userId,
                title,
                message: t.monthlySummaryMsg.replace("{month}", String(mb.month)),
                type: 'REPORT',
                createdAt: new Date()
             })
          }
       }
    }
  } catch (e) {
    console.error("Failed to sync monthly reports", e)
  }
}

export async function getDailyReports(userId: string) {
  try {
     const list = await db.select().from(dailyReports)
       .where(eq(dailyReports.userId, userId))
       .orderBy(desc(dailyReports.date))
     
     // Deduplicate existing entries by date
     const seen = new Set<string>()
     return list.filter(r => {
        if (seen.has(r.date)) return false
        seen.add(r.date)
        return true
     })
  } catch { return [] }
}

export async function getMonthlyReports(userId: string) {
  try {
     const list = await db.select().from(monthlyReports)
       .where(eq(monthlyReports.userId, userId))
       .orderBy(desc(monthlyReports.year), desc(monthlyReports.month))
     
     // Deduplicate existing entries by month-year
     const seen = new Set<string>()
     return list.filter(r => {
        const key = `${r.year}-${r.month}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
     })
  } catch { return [] }
}

export async function getNotifications(userId: string) {
  try {
     const list = await db.select().from(notifications)
       .where(eq(notifications.userId, userId))
       .orderBy(desc(notifications.createdAt))
       .limit(100)
     return list
  } catch { return [] }
}

export async function getUnreadNotificationsCount(userId: string) {
  try {
     const result = await db.select({ count: notifications.id })
       .from(notifications)
       .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
     return result.length
  } catch { return 0 }
}

export async function getFriends(userId: string) {
  try {
    const list = await db
      .select({
        friendship: friends,
        user: { id: users.id, name: users.name, email: users.email, image: users.image }
      })
      .from(friends)
      .innerJoin(users, eq(friends.friendId, users.id))
      .where(and(eq(friends.userId, userId), eq(friends.status, 'ACCEPTED')))
    
    // Also get outgoing friendships where I am the friendId
    const list2 = await db
      .select({
        friendship: friends,
        user: { id: users.id, name: users.name, email: users.email, image: users.image }
      })
      .from(friends)
      .innerJoin(users, eq(friends.userId, users.id))
      .where(and(eq(friends.friendId, userId), eq(friends.status, 'ACCEPTED')))

    return [...list.map(i => ({ ...i.user, friendshipId: i.friendship.id })), ...list2.map(i => ({ ...i.user, friendshipId: i.friendship.id }))]
  } catch (e) {
    console.error("Failed to get friends", e)
    return []
  }
}

export async function getFriendRequests(userId: string) {
  try {
    const list = await db
      .select({
        friendship: friends,
        user: { id: users.id, name: users.name, email: users.email, image: users.image }
      })
      .from(friends)
      .innerJoin(users, eq(friends.userId, users.id))
      .where(and(eq(friends.friendId, userId), eq(friends.status, 'PENDING')))
    return list.map(i => ({ ...i.user, friendshipId: i.friendship.id }))
  } catch (e) {
    console.error("Failed to get friend requests", e)
    return []
  }
}

export async function getMessages(userId: string, friendId: string) {
  try {
    const list = await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, friendId)),
          and(eq(messages.senderId, friendId), eq(messages.receiverId, userId))
        )
      )
      .orderBy(messages.createdAt)
    return list
  } catch (e) {
    console.error("Failed to get messages", e)
    return []
  }
}

export async function getLoans(userId: string) {
  try {
    const lender = alias(users, "lender")
    const borrower = alias(users, "borrower")
    
    const allLoans = await db
      .select({
        id: loans.id,
        amount: loans.amount,
        interestRate: loans.interestRate,
        deadline: loans.deadline,
        status: loans.status,
        lenderId: loans.lenderId,
        borrowerId: loans.borrowerId,
        lender: { name: lender.name, image: lender.image },
        borrower: { name: borrower.name, image: borrower.image },
        createdAt: loans.createdAt
      })
      .from(loans)
      .leftJoin(lender, eq(loans.lenderId, lender.id))
      .leftJoin(borrower, eq(loans.borrowerId, borrower.id))
      .where(or(eq(loans.lenderId, userId), eq(loans.borrowerId, userId)))
      .orderBy(desc(loans.createdAt))
      
    return allLoans
  } catch (e) {
    console.error("Failed to get loans", e)
    return []
  }
}

export async function searchUsers(query: string, currentUserId: string) {
  try {
    // Basic search by name or email
    const list = await db.select().from(users).where(and(
      ne(users.id, currentUserId),
      or(
        // ilike is better but let's stick to standard drizzle
        eq(users.name, query),
        eq(users.email, query)
      )
    ))
    return list
  } catch { return [] }
}

export async function getActivities(userId: string, limit: number = 50) {
  try {
    const list = await db.select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt))
      .limit(limit)
    return list
  } catch (e) {
    console.error("Failed to get activities", e)
    return []
  }
}

export async function getBills(userId: string) {
  try {
    const list = await db
      .select({
        bill: bills,
        category: categories
      })
      .from(bills)
      .leftJoin(categories, eq(bills.categoryId, categories.id))
      .where(eq(bills.userId, userId))
      .orderBy(bills.dueDate)
    return list.map(item => ({ ...item.bill, categoryName: item.category?.name || "General" }))
  } catch (e) {
    console.error("Failed to get bills", e)
    return []
  }
}

export async function getUpcomingBills(userId: string, limit: number = 5) {
  try {
    const today = getTodayStringICT()
    const list = await db
      .select()
      .from(bills)
      .where(and(eq(bills.userId, userId), lte(bills.dueDate, today), eq(bills.status, 'UNPAID')))
      .orderBy(bills.dueDate)
      .limit(limit)
    return list
  } catch { return [] }
}


