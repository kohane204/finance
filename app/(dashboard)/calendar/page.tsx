import React from "react"
import { getUser, getManagedUserId, getMonthlyBudget, getDailyBudgets, getTransactions, getCarryOver, getICTNow } from "@/lib/data"
import { redirect } from "next/navigation"
import { getI18n } from "@/lib/i18n/server"
import { CalendarDashboard } from "@/components/calendar-dashboard"

interface Transaction {
  id: string;
  amount: string;
  type: string;
  date: string | number | Date;
  payee?: string;
  notes?: string;
}

interface DailyBudget {
  id: string;
  date: string;
  expectedCost: string;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const { lang } = await getI18n()
  const user = await getUser()
  if (!user) return redirect("/login")

  const isAdmin = (user as { role?: string }).role === 'admin'
  const targetId = isAdmin ? await getManagedUserId() : user.id
  
  if (!targetId && isAdmin) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-primary/20 rounded-3xl bg-primary/5">
           <p className="text-muted-foreground font-semibold">Please select a specific user to view calendar.</p>
        </div>
      )
  }

  const userId = targetId || user.id
  const params = await searchParams
  const { month: ictMonth, year: ictYear } = getICTNow()
  const month = params.month ? parseInt(params.month) : ictMonth
  const year = params.year ? parseInt(params.year) : ictYear

  // Fetch Monthly Budget
  const monthlyBudget = await getMonthlyBudget(userId, month, year)
  const carryOver = await getCarryOver(userId, month, year)
  
  const dBudgets = (await getDailyBudgets(userId, month, year)) as DailyBudget[]

  // Fetch transactions for this month
  const allTx = await getTransactions(userId, 500)
  const monthTx = (allTx as Transaction[]).filter((tx) => {
     const d = new Date(tx.date)
     return (d.getMonth() + 1) === month && d.getFullYear() === year
  }).map(t => ({
     ...t,
     date: new Date(t.date).toISOString().split('T')[0],
  }))

  const initialData = {
     monthlyBudgetId: monthlyBudget?.id || null,
     month,
     year,
     totalSalary: monthlyBudget ? parseFloat(monthlyBudget.totalSalary as string) : 0,
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

  const userWithDates = user as { id: string; createdAt: string | number | Date }
  const userCreatedAt = new Date(userWithDates.createdAt)

  return (
    <div className="w-full">
      <CalendarDashboard 
        key={`${userId}-${month}-${year}`}
        initialData={initialData} 
        userCreatedAt={userCreatedAt}
        lang={lang} 
      />
    </div>
  )
}
