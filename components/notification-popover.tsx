"use client"

import React, { useState } from "react"
import { Bell, Check, Info, AlertCircle, FileText, CheckCircle2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useI18n } from "./i18n-provider"
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

export function NotificationPopover({ 
  notifications: initialNotifications, 
  unreadCount: initialUnreadCount 
}: { 
  notifications: Notification[], 
  unreadCount: number 
}) {
  const { t } = useI18n()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [prevInitialNotifications, setPrevInitialNotifications] = useState<Notification[]>(initialNotifications)
  const [prevInitialUnreadCount, setPrevInitialUnreadCount] = useState(initialUnreadCount)

  // Sync state with props during render to avoid cascading renders
  if (initialNotifications !== prevInitialNotifications) {
    setNotifications(initialNotifications)
    setPrevInitialNotifications(initialNotifications)
  }
  if (initialUnreadCount !== prevInitialUnreadCount) {
    setUnreadCount(initialUnreadCount)
    setPrevInitialUnreadCount(initialUnreadCount)
  }



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
      case 'REPORT': return <FileText className="size-4 text-blue-500" />
      case 'SUCCESS': return <CheckCircle2 className="size-4 text-emerald-500" />
      case 'WARNING': return <AlertCircle className="size-4 text-amber-500" />
      default: return <Info className="size-4 text-slate-500" />
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full bg-muted/20 hover:bg-muted/40 transition-colors">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-rose-500 text-[10px] border-2 border-background animate-in zoom-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-2xl border-border/40 overflow-hidden rounded-2xl" align="end">
        <div className="flex items-center justify-between p-4 bg-muted/30 border-b border-border/50">
          <h4 className="font-bold text-sm tracking-tight">{t("notifications")}</h4>
          {unreadCount > 0 && (
             <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2 hover:bg-primary/10 hover:text-primary transition-all rounded-lg" onClick={handleMarkAllRead}>
               <Check className="size-3 mr-1" /> {t("markAllRead")}
             </Button>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground p-8 text-center animate-in fade-in duration-300">
              <div className="size-12 rounded-full bg-muted/20 flex items-center justify-center mb-3">
                 <Bell className="size-6 opacity-20" />
              </div>
              <p className="text-sm font-medium">{t("noNotifications")}</p>
              <p className="text-xs opacity-60 mt-1">{t("noNotificationsDesc")}</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "flex gap-3 p-4 border-b border-border/20 last:border-0 hover:bg-muted/30 transition-all cursor-pointer group relative overflow-hidden",
                    !n.isRead && "bg-primary/5"
                  )}
                  onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                >
                  {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                  <div className={cn("size-8 rounded-full flex items-center justify-center mt-0.5 shrink-0", 
                    n.isRead ? "bg-muted/50" : "bg-primary/20"
                  )}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <p className={cn("text-sm font-bold truncate pr-4 text-foreground/90", 
                      !n.isRead ? "text-primary" : "text-muted-foreground"
                    )}>{n.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-muted-foreground/60 mt-1 flex items-center font-medium">
                       {new Date(n.createdAt).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}
                       <span className="mx-1.5 opacity-20">•</span>
                       {new Date(n.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', month: 'short', day: '2-digit' })}
                    </span>
                  </div>
                  {!n.isRead && (
                    <div className="size-2 rounded-full bg-primary absolute right-4 top-5 ring-2 ring-primary/20" title="Unread" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-2 border-t border-border/40 bg-muted/10">
             <Button variant="ghost" className="w-full text-xs font-semibold h-8 rounded-lg text-muted-foreground hover:text-foreground" asChild>
                <a href="/settings">
                  {t("notificationSettings")}
                </a>
             </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
