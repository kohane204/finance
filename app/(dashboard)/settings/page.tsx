import { getUser } from "@/lib/data"
import { redirect } from "next/navigation"
import SettingsClient from "./settings-client"

export default async function SettingsPage() {
  const user = await getUser()
  if (!user) return redirect("/login")

  return (
    <SettingsClient user={user} />
  )
}
