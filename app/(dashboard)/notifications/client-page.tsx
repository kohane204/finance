"use client"

import React, { useState } from "react"
import { useI18n } from "@/components/i18n-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Bell, 
  Check, 
  Info, 
  AlertCircle, 
  FileText, 
  CheckCircle2,
  Filter,
  Eye
} from "lucide-react"
import { markNotificationAsReadAction, markAllNotificationsAsReadAction } from "@/app/actions"
import { cn } from "@/lib/utils"

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: Date
}

interface NotificationsClientPageProps {
  initialNotifications: Notification[]
  initialUnreadCount: number
}

export function NotificationsClientPage({ 
  initialNotifications, 
  initialUnreadCount 
}: NotificationsClientPageProps) {
  const { t } = useI18n()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [filterType, setFilterType] = useState<string>("ALL") // ALL, INFO, SUCCESS, WARNING, REPORT
  const [statusTab, setStatusTab] = useState<"ALL" | "UNREAD">("ALL")

  const handleMarkAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    await markNotificationAsReadAction(id)
  }

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
    await markAllNotificationsAsReadAction()
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'REPORT': return <FileText className="size-5 text-blue-500" />
      case 'SUCCESS': return <CheckCircle2 className="size-5 text-emerald-500" />
      case 'WARNING': return <AlertCircle className="size-5 text-amber-500" />
      default: return <Info className="size-5 text-slate-500" />
    }
  }

  const getCardBg = (type: string, isRead: boolean) => {
    if (isRead) return "bg-card/50 hover:bg-card/80"
    switch (type) {
      case 'WARNING': return "bg-amber-500/5 hover:bg-amber-500/8 border-l-4 border-l-amber-500"
      case 'SUCCESS': return "bg-emerald-500/5 hover:bg-emerald-500/8 border-l-4 border-l-emerald-500"
      case 'REPORT': return "bg-blue-500/5 hover:bg-blue-500/8 border-l-4 border-l-blue-500"
      default: return "bg-primary/5 hover:bg-primary/8 border-l-4 border-l-primary"
    }
  }

  const filteredNotifications = notifications.filter(n => {
    const matchesStatus = statusTab === "ALL" || !n.isRead
    const matchesType = filterType === "ALL" || n.type === filterType
    return matchesStatus && matchesType
  })

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-gradient">
            <Bell className="h-8 w-8 text-primary shrink-0" />
            {t("notifications") || "Thông báo"}
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            {t("notifDesc") || "Xem và lọc tất cả các thông báo tài chính của bạn."}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button 
            onClick={handleMarkAllRead} 
            className="rounded-xl font-bold bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform shrink-0"
          >
            <Check className="size-4 mr-2" />
            {t("markAllRead") || "Đánh dấu tất cả đã đọc"}
          </Button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Side: Filter Options */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Filter className="size-4" /> {t("filter") || "Bộ lọc"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-3 pt-0">
              {/* Status Tab Toggle */}
              <div className="grid grid-cols-2 p-1 bg-muted/40 rounded-xl mb-2">
                <button
                  onClick={() => setStatusTab("ALL")}
                  className={cn(
                    "py-1.5 text-xs font-bold rounded-lg transition-all",
                    statusTab === "ALL" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("allUsers") || "Tất cả"}
                </button>
                <button
                  onClick={() => setStatusTab("UNREAD")}
                  className={cn(
                    "py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                    statusTab === "UNREAD" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{t("pending") || "Chưa đọc"}</span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="h-4 px-1 text-[9px] min-w-4 flex items-center justify-center rounded-full">
                      {unreadCount}
                    </Badge>
                  )}
                </button>
              </div>

              {/* Type Filters */}
              {[
                { label: t("allUsers") || "Tất cả", value: "ALL" },
                { label: t("reports") || "Báo cáo", value: "REPORT" },
                { label: t("completed") || "Thành công", value: "SUCCESS" },
                { label: t("overLimitStatus") || "Cảnh báo", value: "WARNING" },
                { label: t("defaultCategory") || "Thông tin", value: "INFO" }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterType(opt.value)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-muted/40",
                    filterType === opt.value 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Notification List */}
        <div className="md:col-span-3">
          <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden">
            <CardContent className="p-4">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="size-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                    <Bell className="size-8 text-primary/45" />
                  </div>
                  <p className="text-base font-bold text-foreground/80">{t("noNotifications") || "Chưa có thông báo nào"}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">{t("noNotificationsDesc") || "Những thông báo mới nhất sẽ hiện ở đây."}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-2xl border border-border/40 transition-all duration-300 relative group",
                        getCardBg(n.type, n.isRead)
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        "size-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-background",
                        !n.isRead && "ring-1 ring-primary/20"
                      )}>
                        {getIcon(n.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className={cn(
                            "text-sm font-extrabold tracking-tight",
                            n.isRead ? "text-foreground/70" : "text-primary"
                          )}>
                            {n.title}
                          </h3>
                          {!n.isRead && (
                            <Badge className="bg-primary hover:bg-primary/95 text-[9px] font-bold h-4 py-0 px-1 rounded-sm animate-pulse">
                              NEW
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium mt-1 leading-relaxed">
                          {n.message}
                        </p>
                        
                        <div className="text-[10px] text-muted-foreground/60 font-semibold mt-2.5 flex items-center gap-1.5">
                          <span>
                            {new Date(n.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="opacity-30">•</span>
                          <span>
                            {new Date(n.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons (only show if unread) */}
                      {!n.isRead && (
                        <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleMarkAsRead(n.id)}
                            title={t("markAsPaid") || "Đánh dấu đã đọc"}
                            className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary"
                          >
                            <Eye className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
