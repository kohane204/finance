"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getPusherClient } from "@/lib/pusher"
import { toast } from "sonner"

export function PusherProvider({ userId, role }: { userId?: string, role?: string }) {
  const router = useRouter()

  useEffect(() => {
    if (!userId) return

    // Enable debug logging for Pusher so we can see if it connects
    import("pusher-js").then(Pusher => {
       Pusher.default.logToConsole = true
    })

    const pusher = getPusherClient()
    if (!pusher) return

    const userChannelName = `user-${userId}`
    const userChannel = pusher.subscribe(userChannelName)
    
    userChannel.bind("invalidate", (data: { message?: string, type?: string }) => {
       console.log("🔥 Pusher trigger received for User!", data)
       if (data.message) {
         toast.info(data.message, {
           description: data.type === 'admin_action' ? 'Action by Administrator' : 'System Update'
         })
       }
       router.refresh()
    })

    let adminChannel: ReturnType<typeof pusher.subscribe> | null = null
    if (role === "admin") {
      adminChannel = pusher.subscribe("admin-dashboard")
      adminChannel.bind("invalidate", (data: { message?: string, type?: string }) => {
         console.log("🔥 Pusher trigger received for Admin!", data)
         if (data.message) {
           toast.success(data.message)
         }
         router.refresh()
      })
    }

    return () => {
       pusher.unsubscribe(userChannelName)
       userChannel.unbind("invalidate")
       if (adminChannel) {
         pusher.unsubscribe("admin-dashboard")
         adminChannel.unbind("invalidate")
       }
    }
  }, [userId, role, router])

  return null
}
