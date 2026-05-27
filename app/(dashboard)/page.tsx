import { getUser, getAccounts, getTransactions, getGoals, getAdminStats, getDashboardStats, getManagedUserId, getMonthlyBudget, getLatestSalary } from "@/lib/data"
import DashboardClient, { DashboardData } from "./client-page"
import AdminDashboard from "./admin-client"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) return redirect("/login")
  
  const isAdmin = (user as { role?: string }).role === "admin"
  const managedId = await getManagedUserId()
  
  // Rule: Admin sees AdminDashboard ONLY if they are NOT managing a specific user.
  // If they ARE managing someone, they see that person's dashboard.
  if (isAdmin && !managedId) {
      const adminStats = await getAdminStats()
      return <AdminDashboard data={adminStats} />
  }

  // Target ID is the managed user (if admin) or the user themselves
  const targetUserId = managedId || user.id

  const [accounts, transactions, goals, stats] = await Promise.all([
     getAccounts(targetUserId),
     getTransactions(targetUserId, 10, 0),
     getGoals(targetUserId),
     getDashboardStats(targetUserId)
  ])

  const totalBalance = accounts.reduce((acc, a) => acc + parseFloat(a.balance as string), 0)
  
  const recentTransactions = transactions.map(t => ({
    id: t.id,
    amount: parseFloat(t.amount as string),
    status: (t as { status?: string }).status || "Completed",
    name: t.payee || "Payment",
    date: new Date(t.date as string | number | Date).toLocaleDateString(),
    type: (t as { type?: string }).type || (parseFloat(t.amount as string) > 0 ? "INCOME" : "EXPENSE")
  }))

  const piggyBankNameVi = "Tiền heo đất (Piggy Bank)"
  const piggyBankNameEn = "Piggy Bank"
  const piggyBankGoal = goals.find(g => g.name === piggyBankNameVi || g.name === piggyBankNameEn)
  const piggyBankBalance = piggyBankGoal ? parseFloat(piggyBankGoal.currentAmount || "0") : 0

  const regularGoals = goals.filter(g => g.name !== piggyBankNameVi && g.name !== piggyBankNameEn)

  const totalGoalsProgress = regularGoals.length > 0 
    ? (regularGoals.reduce((acc, g) => acc + (parseFloat(g.currentAmount as string) / parseFloat(g.targetAmount as string)), 0) / regularGoals.length) * 100
    : 0

  const now = new Date()
  const currentMonthBudget = await getMonthlyBudget(targetUserId, now.getMonth() + 1, now.getFullYear())
  let totalSalary = currentMonthBudget ? parseFloat(currentMonthBudget.totalSalary as string) : 0
  
  if (totalSalary === 0) {
    totalSalary = await getLatestSalary(targetUserId)
  }

  const dashboardData: DashboardData = {
    totalBalance,
    monthlyIncome: stats?.currentMonth.income || 0,
    monthlyExpenses: stats?.currentMonth.expense || 0,
    diff: {
      income: stats?.diff.income || 0,
      expense: stats?.diff.expense || 0,
      balance: 0 // Will be set below
    },
    activeGoalsCount: goals.filter(g => g.name !== piggyBankNameVi && g.name !== piggyBankNameEn).length,
    totalGoalsProgress,
    chartData: stats?.chartData || [],
    recentTransactions,
    piggyBankBalance,
    totalSalary: totalSalary || 0
  }

  // Calculate balance diff
  const currentMonthNet = dashboardData.monthlyIncome - dashboardData.monthlyExpenses
  const lastMonthBalance = totalBalance - currentMonthNet
  if (lastMonthBalance > 0) {
    dashboardData.diff!.balance = ((totalBalance - lastMonthBalance) / lastMonthBalance) * 100
  } else if (totalBalance > 0) {
    dashboardData.diff!.balance = 100
  }

  return <DashboardClient data={dashboardData} />
}
