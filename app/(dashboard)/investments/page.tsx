import { getUser, getDashboardStats } from "@/lib/data"
import { redirect } from "next/navigation"
import InvestmentClient from "./investment-client"

export default async function InvestmentPage() {
  const user = await getUser()
  if (!user) return redirect("/login")

  const stats = await getDashboardStats(user.id)

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <InvestmentClient stats={stats} />
    </div>
  )
}
