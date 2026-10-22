"use client"

import { useState, useMemo } from "react"
import { useI18n } from "@/components/i18n-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Activity,
  Search,
  FileCode,
  Calendar,
  ChevronLeft,
  ChevronRight
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
  const [activities] = useState<ActivityRecord[]>(initialActivities)
  const [searchText, setSearchText] = useState("")
  const [selectedAction, setSelectedAction] = useState<string>("ALL")
  const [selectedEntity, setSelectedEntity] = useState<string>("ALL")
  const [inspectActivity, setInspectActivity] = useState<ActivityRecord | null>(null)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

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
      case "BILL": return <Calendar className="h-4 w-4" />
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
      case "BILL": return t("bills") || "Bill"
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

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const matchesSearch = searchText === "" || 
        activity.description.toLowerCase().includes(searchText.toLowerCase()) || 
        (activity.entityId && activity.entityId.toLowerCase().includes(searchText.toLowerCase()))
      
      const matchesAction = selectedAction === "ALL" || activity.action === selectedAction
      const matchesEntity = selectedEntity === "ALL" || activity.entityType === selectedEntity

      return matchesSearch && matchesAction && matchesEntity
    })
  }, [activities, searchText, selectedAction, selectedEntity])

  // Pagination calculations
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage)
  const displayedActivities = useMemo(() => {
    return filteredActivities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }, [filteredActivities, currentPage, itemsPerPage])

  // Try to parse metadata
  const parsedMetadata = useMemo(() => {
    if (!inspectActivity?.metadata) return null
    try {
      return JSON.parse(inspectActivity.metadata)
    } catch {
      return inspectActivity.metadata
    }
  }, [inspectActivity])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-gradient">
            <History className="h-8 w-8 text-primary shrink-0 animate-pulse" />
            {t("history") || "Lịch sử"}
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            {t("activityLogDesc") || "Nhật ký hoạt động chi tiết của hệ thống."}
          </p>
        </div>
      </div>

      {/* Filter Options Panel */}
      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          {/* Search bar */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search") || "Tìm kiếm chi tiết..."}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9 rounded-xl bg-muted/20 border-border/50 focus-visible:ring-primary/20"
            />
          </div>

          {/* Action Filter */}
          <div className="flex gap-2 w-full md:w-auto">
            <div className="flex-1 md:flex-none flex items-center gap-1.5 bg-muted/30 p-1 rounded-xl border border-border/50">
              {["ALL", "CREATE", "UPDATE", "DELETE"].map(act => (
                <button
                  key={act}
                  onClick={() => setSelectedAction(act)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedAction === act 
                      ? "bg-card text-foreground shadow-xs" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {act === "ALL" ? (t("allUsers") || "Tất cả") : getActionTranslation(act)}
                </button>
              ))}
            </div>
          </div>

          {/* Entity Filter */}
          <div className="w-full md:w-[180px]">
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full h-10 px-3 py-2 rounded-xl text-xs font-bold border border-border/50 bg-background/50 focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">{t("type") || "Hạng mục"} ({t("allUsers") || "Tất cả"})</option>
              <option value="TRANSACTION">{getEntityTranslation("TRANSACTION")}</option>
              <option value="BUDGET">{getEntityTranslation("BUDGET")}</option>
              <option value="GOAL">{getEntityTranslation("GOAL")}</option>
              <option value="CARD">{getEntityTranslation("CARD")}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden">
        <CardContent className="p-0">
          {filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-primary/5 p-4 rounded-full mb-4">
                <History className="h-10 w-10 text-primary/45" />
              </div>
              <p className="text-base font-bold text-foreground/80">{t("noActivities") || "Chưa có hoạt động nào được ghi lại."}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[120px] font-bold px-6 py-4">{t("actions") || "Thao tác"}</TableHead>
                    <TableHead className="w-[140px] font-bold">{t("type") || "Loại"}</TableHead>
                    <TableHead className="font-bold">{t("detail") || "Chi tiết"}</TableHead>
                    <TableHead className="text-right font-bold px-6">{t("date") || "Thời gian"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedActivities.map((activity) => (
                    <TableRow 
                      key={activity.id} 
                      onClick={() => activity.metadata && setInspectActivity(activity)}
                      className={`group hover:bg-muted/30 transition-all cursor-pointer ${
                        activity.metadata ? "hover:border-l-4 hover:border-l-primary" : ""
                      }`}
                    >
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-lg bg-background shadow-xs border border-border/40 group-hover:scale-105 transition-transform">
                            {getActionIcon(activity.action)}
                          </span>
                          <span className="font-bold text-xs">
                            {getActionTranslation(activity.action)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1.5 w-fit px-2.5 py-0.5 rounded-lg border-border/50 bg-background/50 font-bold text-[10px]">
                          {getEntityIcon(activity.entityType)}
                          {getEntityTranslation(activity.entityType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <p className="text-xs font-bold leading-relaxed text-foreground/80 group-hover:text-primary transition-colors">
                          {activity.description}
                        </p>
                        {activity.metadata && (
                           <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                             <FileCode className="size-3.5" />
                             <span>{t("viewDetails") || "Xem chi tiết metadata"}</span>
                           </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground font-semibold px-6">
                        {formatDate(activity.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination controls */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/40 bg-muted/10">
                <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                  <span>
                    Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredActivities.length)} của {filteredActivities.length}
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="h-8 px-2 rounded-lg border border-border/50 bg-background font-bold text-xs"
                  >
                    {[5, 10, 20, 50].map((num) => (
                      <option key={num} value={num}>
                        {num} / trang
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-lg border border-border/50 hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="text-xs font-bold px-2">
                    {currentPage} / {totalPages || 1}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded-lg border border-border/50 hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Metadata Inspector Sheet/Dialog */}
      <Dialog open={!!inspectActivity} onOpenChange={(open) => !open && setInspectActivity(null)}>
        <DialogContent className="sm:max-w-[460px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl ring-1 ring-border bg-card">
          <DialogHeader className="p-6 bg-muted/30 border-b border-border/40">
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <FileCode className="size-5 text-primary" />
              {t("detail") || "Chi tiết hoạt động"}
            </DialogTitle>
            <DialogDescription className="font-medium text-xs">
              {inspectActivity && getActionTranslation(inspectActivity.action)} • {inspectActivity && getEntityTranslation(inspectActivity.entityType)}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[50vh]">
            {inspectActivity && (
              <div className="space-y-4">
                {/* Description Box */}
                <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/10">
                  <p className="text-xs font-extrabold text-primary leading-relaxed">
                    {inspectActivity.description}
                  </p>
                </div>

                {/* General Info */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-muted/20 border border-border/30">
                    <span className="text-[10px] text-muted-foreground/80 font-bold block uppercase tracking-wider">ID thực thể</span>
                    <span className="font-mono font-bold text-foreground/80 truncate block mt-1">{inspectActivity.entityId || "N/A"}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-muted/20 border border-border/30">
                    <span className="text-[10px] text-muted-foreground/80 font-bold block uppercase tracking-wider">Thời gian</span>
                    <span className="font-semibold text-foreground/80 block mt-1 flex items-center gap-1">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      {formatDate(inspectActivity.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Metadata JSON Block */}
                {parsedMetadata && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Thông tin thay đổi</span>
                    <div className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-white/5 shadow-inner">
                      {typeof parsedMetadata === "object" ? (
                        <div className="space-y-1">
                          {Object.entries(parsedMetadata).map(([key, val]) => (
                            <div key={key} className="flex justify-between border-b border-white/5 pb-1 last:border-0 last:pb-0">
                              <span className="text-slate-400 font-bold">{key}:</span>
                              <span className="text-emerald-400 font-semibold">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap">{String(parsedMetadata)}</pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

