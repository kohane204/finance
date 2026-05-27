import { auth } from "@/auth"
import { getActivities, getManagedUserId } from "@/lib/data"
import { HistoryClientPage } from "./client-page"
import { redirect } from "next/navigation"

export default async function HistoryPage() {
  const session = await auth()
  if (!session || !session.user) {
    redirect("/login")
  }

  const userId = (await getManagedUserId()) || (session.user.id as string)
  const activities = await getActivities(userId)

  return <HistoryClientPage initialActivities={activities} />
}
