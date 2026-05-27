import { getUser, getAccounts, getGoals, getLoans, getDashboardStats } from "@/lib/data"
import { redirect } from "next/navigation"
import NetWorthClient from "./net-worth-client"

export default async function NetWorthPage() {
  const user = await getUser()
  if (!user) return redirect("/login")

  const accounts = await getAccounts(user.id)
  const goals = await getGoals(user.id)
  const loans = await getLoans(user.id)
  const stats = await getDashboardStats(user.id)

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <NetWorthClient 
        accounts={accounts} 
        goals={goals} 
        loans={loans} 
        stats={stats} 
      />
    </div>
  )
}
