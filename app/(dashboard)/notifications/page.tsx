import { auth } from "@/auth"
import { getNotifications, getUnreadNotificationsCount, getManagedUserId } from "@/lib/data"
import { NotificationsClientPage } from "./client-page"
import { redirect } from "next/navigation"

export default async function NotificationsPage() {
  const session = await auth()
  if (!session || !session.user) {
    redirect("/login")
  }

  const userId = (await getManagedUserId()) || (session.user.id as string)
  const notificationsData = await getNotifications(userId)
  const unreadCount = await getUnreadNotificationsCount(userId)

  return (
    <NotificationsClientPage 
      initialNotifications={notificationsData} 
      initialUnreadCount={unreadCount} 
    />
  )
}
