import { getUser, getBills, getBudgets } from "@/lib/data"

import { redirect } from "next/navigation"
import BillsClient from "./bills-client"

export default async function BillsPage() {
  const user = await getUser()
  if (!user) return redirect("/login")

  const bills = await getBills(user.id)
  const budgets = await getBudgets(user.id)

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <BillsClient initialBills={bills} budgets={budgets} />
    </div>
  )
}
