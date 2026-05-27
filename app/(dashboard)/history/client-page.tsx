"use client"

import { useState } from "react"
import { useI18n } from "@/components/i18n-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  History, 
  PlusCircle, 
  RefreshCcw, 
  Trash2, 
  CreditCard, 
  Wallet, 
  Target, 
  User, 
  ArrowRightLeft,
  CircleHelp,
  Activity
} from "lucide-react"

interface ActivityRecord {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string | null
  description: string
  metadata: string | null
  createdAt: Date
}

interface HistoryClientPageProps {
  initialActivities: ActivityRecord[]
}

export function HistoryClientPage({ initialActivities }: HistoryClientPageProps) {
  const { t } = useI18n()
  const [activities] = useState(initialActivities)

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE": return <PlusCircle className="h-4 w-4 text-emerald-500" />
      case "UPDATE": return <RefreshCcw className="h-4 w-4 text-amber-500" />
      case "DELETE": return <Trash2 className="h-4 w-4 text-rose-500" />
      default: return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "TRANSACTION": return <ArrowRightLeft className="h-4 w-4" />
      case "BUDGET": return <Wallet className="h-4 w-4" />
      case "GOAL": return <Target className="h-4 w-4" />
      case "CARD": return <CreditCard className="h-4 w-4" />
      case "USER": return <User className="h-4 w-4" />
      default: return <CircleHelp className="h-4 w-4" />
    }
  }

  const getActionTranslation = (action: string) => {
    switch (action) {
      case "CREATE": return t("actionCreate") || "Created"
      case "UPDATE": return t("actionUpdate") || "Updated"
      case "DELETE": return t("actionDelete") || "Deleted"
      default: return action
    }
  }

  const getEntityTranslation = (entityType: string) => {
    switch (entityType) {
      case "TRANSACTION": return t("entityTransaction") || "Transaction"
      case "BUDGET": return t("entityBudget") || "Budget"
      case "GOAL": return t("entityGoal") || "Goal"
      case "CARD": return t("entityCard") || "Credit Card"
      default: return entityType
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date))
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            {t("history") || "Lịch sử"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("activityLog") || "Nhật ký hoạt động hệ thống"}
          </p>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t("latestActivitiesDesc") || "Các hoạt động mới nhất của bạn"}
          </CardTitle>
          <CardDescription>
            {t("activityLogDesc") || "Theo dõi các thay đổi và thao tác bạn đã thực hiện trên ứng dụng."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-muted/30 p-4 rounded-full mb-4">
                <History className="h-10 w-10 text-muted-foreground opacity-20" />
              </div>
              <p className="text-muted-foreground">{t("noActivities") || "Chưa có hoạt động nào được ghi lại."}</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[100px]">{t("actions") || "Thao tác"}</TableHead>
                    <TableHead>{t("type") || "Loại"}</TableHead>
                    <TableHead>{t("detail") || "Chi tiết"}</TableHead>
                    <TableHead className="text-right">{t("date") || "Thời gian"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-lg bg-background shadow-sm border group-hover:scale-110 transition-transform">
                            {getActionIcon(activity.action)}
                          </span>
                          <span className="font-medium text-sm hidden sm:inline">
                            {getActionTranslation(activity.action)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1.5 w-fit px-2.5 py-0.5">
                          {getEntityIcon(activity.entityType)}
                          {getEntityTranslation(activity.entityType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-sm font-medium leading-none truncated" title={activity.description}>
                          {activity.description}
                        </p>
                        {activity.metadata && (
                           <p className="text-[10px] text-muted-foreground mt-1 font-mono italic">
                              ID: {activity.entityId || "N/A"}
                           </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDate(activity.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

