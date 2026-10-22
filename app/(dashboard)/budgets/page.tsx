import React from "react"
import { getUser, getManagedUserId, getMonthlyBudget, getDailyBudgets, getCarryOver, getTransactions, getICTNow, getGoals, syncPiggyBankGoal } from "@/lib/data"
import { redirect } from "next/navigation"
import { getI18n } from "@/lib/i18n/server"
import { BudgetDashboard } from "@/components/budget-dashboard"

interface Transaction {
  id: string;
  amount: string;
  type: string;
  date: string | number | Date;
  payee?: string;
  name?: string;
  notes?: string;
}

interface DailyBudget {
  id: string;
  date: string;
  expectedCost: string;
}

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const { lang } = await getI18n()
  const user = await getUser()
  if (!user) return redirect("/login")

  const isAdmin = (user as { role?: string }).role === 'admin'
  const targetId = isAdmin ? await getManagedUserId() : user.id
  if (!targetId && isAdmin) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-primary/20 rounded-3xl bg-primary/5">
          <p className="text-muted-foreground font-semibold">Please select a specific user to manage budgets.</p>
       </div>
     )
  }

  const userId = targetId || user.id
  const params = await searchParams
  const { month: ictMonth, year: ictYear } = getICTNow()
  const month = params.month ? parseInt(params.month) : ictMonth
  const year = params.year ? parseInt(params.year) : ictYear

  // Sync PiggyBank so the live reserve reflects all past months + goal allocations
  if (!isAdmin || targetId) {
    await syncPiggyBankGoal(userId, lang as 'vi' | 'en')
  }

  // Fetch data for the dashboard
  const monthlyBudget = await getMonthlyBudget(userId, month, year)
  const carryOver = await getCarryOver(userId, month, year)

  const userGoals = await getGoals(userId)

  // Reserve calculations
  const totalGoalAllocations = userGoals
    .filter((g: { name: string }) => g.name !== 'Tiền heo đất (Piggy Bank)' && g.name !== 'Piggy Bank')
    .reduce((sum: number, g: { currentAmount: string }) => sum + (parseFloat(g.currentAmount) || 0), 0)

  // baseReserve is the TOTAL pool (before goal subtractions)
  // We prefer the manual entry for this month if it exists.
  const baseReserve = (carryOver > 0) ? carryOver : (monthlyBudget && parseFloat(monthlyBudget.reserveFunds as string) > 0
    ? parseFloat(monthlyBudget.reserveFunds as string)
    : 0)

  // Fetch all transactions for this month to calculate live savings and prepare display data
  const allTx = await getTransactions(userId, 2000)
  const monthTxRaw = (allTx as Transaction[]).filter((tx) => {
     const d = new Date(tx.date)
     return (d.getUTCMonth() + 1) === month && d.getUTCFullYear() === year
  })

  let currentIncome = 0
  let currentExpense = 0
  monthTxRaw.forEach(t => {
     const amt = parseFloat(t.amount)
     if (t.type === 'INCOME' || amt > 0) currentIncome += Math.abs(amt)
     else currentExpense += Math.abs(amt)
  })

  const currentSalary = monthlyBudget ? parseFloat(monthlyBudget.totalSalary as string) : 0
  const currentSavings = currentSalary - (currentExpense - currentIncome)

  // reserveFunds (the live balance) = baseReserve + currentMonthSavings - allocations
  const reserveFunds = Math.max(0, baseReserve + currentSavings - totalGoalAllocations)
  const fallbackCash = 0

  const dBudgets = (await getDailyBudgets(userId, month, year)) as DailyBudget[]

  const monthTx = monthTxRaw.map(t => ({
     ...t,
     date: new Date(t.date).toISOString().split('T')[0],
     name: t.payee || "Payment",
     payee: t.payee || undefined,
     notes: t.notes || ((t as { categoryName?: string }).categoryName ? `Category: ${(t as { categoryName?: string }).categoryName}` : undefined)
  }))

  const initialData = {
     monthlyBudgetId: monthlyBudget?.id || null,
     month,
     year,
     totalSalary: currentSalary,
     // Cash in hand: use saved value if month exists, else 0 (user enters it fresh each month)
     cashInHand: monthlyBudget ? parseFloat((monthlyBudget as { cashInHand?: string }).cashInHand || '0') : fallbackCash,
     // baseReserve is the total pot (before subtracting goals)
     baseReserve,
     // reserveFunds is the remaining pot (after subtracting goals)
     reserveFunds,
     // allocatedToGoals is the amount spent on other goals
     allocatedToGoals: totalGoalAllocations,
     carryOver,
     dailyBudgets: dBudgets.map((db) => {
        const d = new Date(db.date)
        return {
           date: d.toISOString().split('T')[0],
           expectedCost: db.expectedCost
        }
     }),
     transactions: monthTx,
  }

  return (
    <div className="w-full">
      <BudgetDashboard
        key={`${userId}-${month}-${year}`}
        userId={userId}
        initialData={initialData}
        lang={lang}
        userCreatedAt={user.createdAt}
      />
    </div>
  )
}
