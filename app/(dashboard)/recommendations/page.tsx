import { getUser, getDashboardStats, getBudgets, getGoals, getManagedUserId } from "@/lib/data"
import { redirect } from "next/navigation"
import RecommendationsClient from "./recommendations-client"

export default async function RecommendationsPage() {
  const user = await getUser()
  if (!user) return redirect("/login")

  const isAdmin = (user as { role?: string }).role === "admin"
  const targetId = isAdmin ? await getManagedUserId() : user.id
  const userId = targetId || user.id

  const [stats, budgets, goals] = await Promise.all([
    getDashboardStats(userId),
    getBudgets(userId),
    getGoals(userId)
  ])

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <RecommendationsClient stats={stats} budgets={budgets} goals={goals} />
    </div>
  )
}
