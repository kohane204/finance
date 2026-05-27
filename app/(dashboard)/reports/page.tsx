import { getUser, getTransactions, getManagedUserId, getAllTransactions, syncDailyReports, getDailyReports, syncMonthlyReports, getMonthlyReports } from "@/lib/data"
import { redirect } from "next/navigation"
import ReportsClient from "./client-page"

interface Transaction {
  id: string;
  amount: string | number;
  type: string;
  date: string | number | Date;
  categoryId?: string;
  notes?: string;
  categoryName?: string;
}

interface DailyReport {
  id: string;
  date: string;
  expectedCost: string;
  actualCost: string;
  saving: string;
}

interface MonthlyReport {
  id: string;
  month: number;
  year: number;
  totalSalary: string;
  actualExpense: string;
  savings: string;
  performance: string;
}

export default async function ReportsPage() {
  const user = await getUser()
  if (!user) return redirect("/login")

  const isAdmin = (user as { role?: string }).role === 'admin'
  const targetId = isAdmin ? await getManagedUserId() : user.id
  const isAllUsers = isAdmin && !targetId

  // Trigger sync for the specific user
  if (targetId) {
    await syncDailyReports(targetId)
    await syncMonthlyReports(targetId)
  }

  let dbTx: Transaction[] = []
  let dailyReportsData: DailyReport[] = []
  let monthlyReportsData: MonthlyReport[] = []

  if (isAllUsers) {
    dbTx = (await getAllTransactions()) as Transaction[]
  } else {
    dbTx = (await getTransactions(targetId || user.id)) as Transaction[]
    dailyReportsData = (await getDailyReports(targetId || user.id)) as DailyReport[]
    monthlyReportsData = (await getMonthlyReports(targetId || user.id)) as MonthlyReport[]
  }

  const transactions = (dbTx || []).map((t) => ({
      ...t,
      categoryId: t.categoryId || undefined,
      notes: t.notes || undefined,
      categoryName: t.categoryName || undefined
  })) as Transaction[]
  
  const monthlyData: Record<string, { income: number, expense: number }> = {}
  const yearlyData: Record<string, { income: number, expense: number }> = {}
  const categoryDataArr: Record<string, number> = {};

  transactions.forEach(t => {
      const dbDate = new Date(t.date)
      const monthName = dbDate.toLocaleString('default', { month: 'short' })
      const yearName = dbDate.getFullYear().toString()
      let cat = t.categoryId || "Other";
      
      const notesStr = t.notes || "";
      if (!t.categoryId && notesStr && notesStr.includes("Category:")) {
          cat = notesStr.split("Category:")[1].replace("(AI Scan)", "").trim();
      }

      if (!monthlyData[monthName]) monthlyData[monthName] = { income: 0, expense: 0 }
      if (!yearlyData[yearName]) yearlyData[yearName] = { income: 0, expense: 0 }
      
      const amt = Math.abs(Number(t.amount))
      if (Number(t.amount) < 0 || t.type === 'EXPENSE') {
          monthlyData[monthName].expense += amt
          yearlyData[yearName].expense += amt
          categoryDataArr[cat] = (categoryDataArr[cat] || 0) + amt
      } else {
          monthlyData[monthName].income += amt
          yearlyData[yearName].income += amt
      }
  })

  const formatMonthly = Object.keys(monthlyData).map(k => ({
      name: k,
      income: monthlyData[k].income,
      expense: monthlyData[k].expense
  }))

  const formatYearly = Object.keys(yearlyData).map(k => ({
      name: k,
      income: yearlyData[k].income,
      expense: yearlyData[k].expense
  }))



  return (
    <ReportsClient 
      dataMonthly={formatMonthly} 
      dataYearly={formatYearly}
      allTransactions={transactions}
      dailyReports={dailyReportsData}
      monthlyReports={monthlyReportsData}
    />
  )
}
