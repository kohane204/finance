"use client"

import { useEffect, useRef } from "react"
import { syncDailyReportsAction, syncMonthlyReportsAction, checkTodayActivitiesAction, insertEveningReminderAction, checkLoansAction } from "@/app/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useI18n } from "@/lib/i18n/client"

export function RealtimeScheduler({ userId }: { userId?: string }) {
  const router = useRouter()
  const lastCheckedMinute = useRef<number>(-1)
  const { t } = useI18n()

  useEffect(() => {
    if (!userId) return

    const checkTime = async () => {
      const ictString = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "numeric",
        minute: "numeric",
        hour12: false
      }).format(new Date())

      const [currentHourText, currentMinuteText] = ictString.split(":")
      const currentHour = parseInt(currentHourText)
      const currentMinute = parseInt(currentMinuteText)
      const currentDateKey = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date())

      // Only check once per minute
      if (currentMinute === lastCheckedMinute.current) return
      lastCheckedMinute.current = currentMinute

      // 1. At 9 PM (21:00) ICT — show toast + insert DB notification (NO modal)
      if (currentHour >= 21) {
        const lastTriggeredDate = localStorage.getItem("last-9pm-trigger")

        if (lastTriggeredDate !== currentDateKey) {
          console.log("⏰ 9PM Reminder check...")

          const hasActivities = await checkTodayActivitiesAction()

          if (!hasActivities) {
            toast.warning(t("dailyNoActivities"), {
              duration: 10000,
            })
          } else {
            toast.info(t("dailyHasActivities"), {
              duration: 6000,
            })
          }

          // Insert DB notification so the bell badge updates
          await insertEveningReminderAction(hasActivities)

          // Dispatch event ONLY to update the isPast9PM flag (unlock + button for today)
          window.dispatchEvent(new CustomEvent("trigger-activity-modal", { detail: { isPast9PM: true, hasActivities } }))
          localStorage.setItem("last-9pm-trigger", currentDateKey)
        }
      }

      // 3. Periodic Loan check
      await checkLoansAction()

      // 2. At midnight (00:00) ICT — sync reports
      if (currentHour === 0 && currentMinute === 0) {
        const lastSyncDate = localStorage.getItem("last-0am-sync")
        if (lastSyncDate !== currentDateKey) {
          console.log("⏰ 00:00 - Syncing Reports...")
          try {
            await syncDailyReportsAction()
            await syncMonthlyReportsAction()
            toast.success(t("newMonthReport"))
            localStorage.setItem("last-0am-sync", currentDateKey)
            router.refresh()
          } catch (e) {
            console.error("Auto Sync Error:", e)
          }
        }
      }
    }

    // Run check every 15 seconds for snappier response
    const interval = setInterval(checkTime, 15000)
    checkTime() // Run immediately

    return () => clearInterval(interval)
  }, [userId, router, t])

  return null
}
