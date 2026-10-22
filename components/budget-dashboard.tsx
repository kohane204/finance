"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Info,
  Save,
  Activity,
  CalendarDays,
  RefreshCcw,
  Trash2,
  Loader2,
  Sparkles,
  AlertCircle
} from "lucide-react"

import { useRouter } from "next/navigation"




import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { updateMonthlySalaryAction, updateDailyBudgetAction, bulkUpdateDailyBudgetsAction, addTransactionAction, deleteTransactionAction, scanActivitiesAction, deleteAllTransactionsByDateAction } from "@/app/actions"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/i18n-provider"
import { Language } from "@/lib/i18n/translations"

interface BudgetDashboardProps {
  userId: string
  initialData: {
    monthlyBudgetId: string | null
    month: number
    year: number
    totalSalary: number
    cashInHand: number
    baseReserve: number
    reserveFunds: number
    allocatedToGoals: number
    carryOver: number
    dailyBudgets: { date: string; expectedCost: string }[]
    transactions: { id: string; date: string; amount: string; type: string; name: string; payee?: string; notes?: string }[]
  }
  lang: Language
  userCreatedAt: Date
}


export function BudgetDashboard({ initialData, lang, userCreatedAt }: BudgetDashboardProps) {
  const { t, formatCurrency } = useI18n()
  const router = useRouter()
  const rate = lang === "vi" ? 26000 : 1

  // Helper: round to nearest VND (integer), then divide back for formatCurrency
  // This prevents floating-point .999 artifacts
  const roundDisplay = (usdValue: number) => {
    if (rate > 1) {
      return Math.round(usdValue * rate) / rate
    }
    return Math.round(usdValue * 100) / 100
  }

  const currentMonth = initialData.month
  const currentYear = initialData.year
  
  // Clean initialization with rounding
  const initialSalVal = (initialData.totalSalary || 0) * rate
  const initialSalaryInput = rate > 1 ? Math.round(initialSalVal).toString() : (Math.round(initialSalVal * 100) / 100).toString()

  const [salaryInput, setSalaryInput] = useState(initialSalaryInput)
  
  const initialCashVal = (initialData.cashInHand || 0) * rate
  const initialCashInput = rate > 1 ? Math.round(initialCashVal).toString() : (Math.round(initialCashVal * 100) / 100).toString()
  const [cashInput, setCashInput] = useState(initialCashInput)

  const initialReserveVal = (initialData.baseReserve || 0) * rate
  const initialReserveInput = rate > 1 ? Math.round(initialReserveVal).toString() : (Math.round(initialReserveVal * 100) / 100).toString()
  const [reserveInput, setReserveInput] = useState(initialReserveInput)

  const [loading, setLoading] = useState(false)
  const [isReserveConfirmOpen, setIsReserveConfirmOpen] = useState(false)
  const [pendingActivityData, setPendingActivityData] = useState<FormData | null>(null)
  
  // Local state for daily expected costs as strings to allow editing "0" and formatting
  const [dailyAllocations, setDailyAllocations] = useState<Record<string, string>>({})

  
  // Modal states
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [isRecurringPromptOpen, setIsRecurringPromptOpen] = useState(false)
  const [salaryApplyMode, setSalaryApplyMode] = useState<"once" | "fixed">("once")
  const [isDistributed, setIsDistributed] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isPast9PM, setIsPast9PM] = useState(() => {
    const ictNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
    return ictNow.getHours() >= 21
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [activityType, setActivityType] = useState<"EXPENSE" | "INCOME">("EXPENSE")
  const fileInputRef = useRef<HTMLInputElement>(null)


  
  const today = new Date()
  today.setHours(0,0,0,0)


  // Initialize daily allocations from DB
  useEffect(() => {
    const allocations: Record<string, string> = {}
    initialData.dailyBudgets.forEach(db => {
      const val = parseFloat(db.expectedCost) * rate
      allocations[db.date] = String(rate > 1 ? Math.round(val) : Math.round(val * 100) / 100)
    })
    setDailyAllocations(allocations)
    const salVal = (initialData.totalSalary || 0) * rate
    setSalaryInput(String(rate > 1 ? Math.round(salVal) : Math.round(salVal * 100) / 100))
    const cashVal = (initialData.cashInHand || 0) * rate
    setCashInput(String(rate > 1 ? Math.round(cashVal) : Math.round(cashVal * 100) / 100))
    const resVal = (initialData.baseReserve || 0) * rate
    setReserveInput(String(rate > 1 ? Math.round(resVal) : Math.round(resVal * 100) / 100))
  }, [initialData.dailyBudgets, initialData.totalSalary, initialData.cashInHand, initialData.baseReserve, rate])

  // Helper to get local mapping YYYY-MM-DD
  const formatDateLocal = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Update isPast9PM flag when the global watcher fires (no longer auto-opens modal)
  useEffect(() => {
    const handlePast9PMFlag = (event?: Event) => {
      const customEvent = event as CustomEvent<{ isPast9PM: boolean }>
      if (customEvent?.detail?.isPast9PM) {
        setIsPast9PM(true)
      }
    }

    window.addEventListener("trigger-activity-modal", handlePast9PMFlag as EventListener)
    return () => window.removeEventListener("trigger-activity-modal", handlePast9PMFlag as EventListener)
  }, [])




  // Get days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate()
  }, [currentMonth, currentYear])

  const dates = useMemo(() => {
    const arr = []
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentYear, currentMonth - 1, i)
        arr.push(formatDateLocal(date))
    }
    return arr
  }, [currentMonth, currentYear, daysInMonth])


  // Calculate net actual costs per day from transactions (Expenses - Income)
  const dailyNetCosts = useMemo(() => {
    const netCosts: Record<string, number> = {}
    initialData.transactions.forEach(tx => {
       const dateStr = formatDateLocal(new Date(tx.date))
       const amountUsd = parseFloat(tx.amount)
       // amountUsd is negative for expenses, positive for income in actions.ts
       // We want "Cost", so Expense (+) and Income (-)
       netCosts[dateStr] = (netCosts[dateStr] || 0) + (-amountUsd)
    })
    return netCosts
  }, [initialData.transactions])



  const transactionsForSelectedDate = useMemo(() => {
    if (!selectedDate) return []
    return initialData.transactions.filter(tx => formatDateLocal(new Date(tx.date)) === selectedDate)
  }, [initialData.transactions, selectedDate])


  const chartData = useMemo(() => {
    return dates.map(date => {
       const d = parseInt(date.split('-')[2])
       const expected = parseFloat(dailyAllocations[date] || "0")
       const netCostRaw = dailyNetCosts[date] || 0
       // Keep in original currency for display
       const netCost = netCostRaw * rate
       
       return {
         day: d,
         date: date,
         [t('expectedCost')]: Number(expected),
         [t('actualCost')]: netCost
       }
    })
  }, [dates, dailyAllocations, dailyNetCosts, t, rate])


  const totalExpected = useMemo(() => {
    return Object.values(dailyAllocations).reduce((acc, val) => acc + (parseFloat(val) || 0), 0)
  }, [dailyAllocations])

  const totalNetCost = useMemo(() => {
    return Object.values(dailyNetCosts).reduce((acc, val) => acc + (val || 0), 0)
  }, [dailyNetCosts])
  
  const salaryValue = parseFloat(salaryInput) || 0
  const cashValue = (initialData.cashInHand || 0) * rate
  const totalNetCostValue = totalNetCost * rate
  const currentBalanceValue = salaryValue + cashValue - totalNetCostValue

  const isLastDayOfMonth = useMemo(() => {
    const now = new Date()
    const lastDay = new Date(currentYear, currentMonth, 0).getDate()
    return now.getDate() === lastDay && now.getMonth() + 1 === currentMonth && now.getFullYear() === currentYear
  }, [currentMonth, currentYear])

  // A past month = any month that has already fully finished
  const isPastMonth = useMemo(() => {
    const now = new Date()
    const nowM = now.getMonth() + 1
    const nowY = now.getFullYear()
    return currentYear < nowY || (currentYear === nowY && currentMonth < nowM)
  }, [currentMonth, currentYear])

  // For past months always show actual savings; for current month only show on last day
  const remainingSavings = (isPastMonth || isLastDayOfMonth) ? (salaryValue - totalNetCostValue) : 0


  const isFutureMonth = useMemo(() => {
    const now = new Date()
    const target = new Date(currentYear, currentMonth - 1, 1)
    const current = new Date(now.getFullYear(), now.getMonth(), 1)
    return target > current
  }, [currentMonth, currentYear])

  const handleSalaryUpdate = async (applyToFuture: boolean = false) => {
    setLoading(true)
    const formData = new FormData()
    formData.set("month", currentMonth.toString())
    formData.set("year", currentYear.toString())
    formData.set("salary", salaryInput)
    // Pre-calculate USD to avoid server-side rate detection issues
    formData.set("salaryUsd", (parseFloat(salaryInput) / rate).toString())
    formData.set("cashInHandUsd", (parseFloat(cashInput) / rate).toString())
    formData.set("reserveFundsUsd", (parseFloat(reserveInput) / rate).toString())
    formData.set("applyToFuture", applyToFuture.toString())
    // Automatically reset future if updating only for this month
    formData.set("resetFuture", (!applyToFuture).toString())
    
    try {
      await updateMonthlySalaryAction(formData)
      toast.success(t("saveSuccess"))
      setIsRecurringPromptOpen(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      // Small timeout to ensure onOpenChange doesn't trigger revert before state is fully refreshed
      setTimeout(() => setLoading(false), 200)
    }
  }


  const revertSalary = () => {
    const salVal = (initialData.totalSalary || 0) * rate
    setSalaryInput(String(rate > 1 ? Math.round(salVal) : Math.round(salVal * 100) / 100))
    const allocations: Record<string, string> = {}
    initialData.dailyBudgets.forEach(db => {
       const val = parseFloat(db.expectedCost) * rate
       allocations[db.date] = String(rate > 1 ? Math.round(val) : Math.round(val * 100) / 100)
    })
    setDailyAllocations(allocations)
    setIsRecurringPromptOpen(false)
    setIsDistributed(false)
  }


  // Auto-adjust last day if salary changes and we have daily data
  const handleSalaryChange = (newSalaryStr: string) => {
    setSalaryInput(newSalaryStr)
    const newSal = parseFloat(newSalaryStr) || 0
    
    // If we have daily allocations, adjust the last day so they sum up to the new salary
    if (Object.keys(dailyAllocations).length > 0) {
       const othersExpected = Object.entries(dailyAllocations)
          .filter(([date]) => date !== dates[dates.length - 1])
          .reduce((acc, [, val]) => acc + (parseFloat(val) || 0), 0)
       
       const lastDay = dates[dates.length - 1]
       const neededForLastDay = Math.max(0, newSal - othersExpected)
       setDailyAllocations({
          ...dailyAllocations,
          [lastDay]: String(rate > 1 ? Math.round(neededForLastDay) : Math.round(neededForLastDay * 100) / 100)
       })
    }
  }

  const handleFullSave = async () => {
    setLoading(true)
    try {
       const mbId = initialData.monthlyBudgetId
       
       if (!mbId) {
          toast.error(t("saveSalaryFirst"))
          setLoading(false)
          return
       }
       
       const currentMonthData = Object.entries(dailyAllocations)
          .filter(([date]) => date.startsWith(`${currentYear}-${currentMonth.toString().padStart(2, '0')}`))
          .map(([date, amount]) => ({ date, amount: parseFloat(amount) || 0 }))
       
       await bulkUpdateDailyBudgetsAction(mbId, currentMonthData)
       toast.success(t("saveSuccess"))
       setIsDistributed(false)
    } catch (e: unknown) {
       toast.error(e instanceof Error ? e.message : String(e))
    } finally {
       setLoading(false)
    }
  }


  const distributeEvenly = () => {
    const dailyRaw = salaryValue / daysInMonth
    // Round based on rate/currency
    const daily = rate > 1 ? Math.floor(dailyRaw) : Math.round(dailyRaw * 100) / 100
    
    const nextAllocations = { ...dailyAllocations }
    let totalAssigned = 0
    
    // Distribute to all but last day
    for (let i = 0; i < dates.length - 1; i++) {
       const date = dates[i]
       nextAllocations[date] = String(daily)
       totalAssigned += daily
    }
    
    // Last day gets the remainder to ensure exact match with salaryValue
    const lastDate = dates[dates.length - 1]
    const remainder = salaryValue - totalAssigned
    nextAllocations[lastDate] = String(rate > 1 ? Math.round(remainder) : Math.round(remainder * 100) / 100)
    
    setDailyAllocations(nextAllocations)
    setIsDistributed(true)
  }

  // Calculate unallocated budget buffer
  const unallocatedBuffer = salaryValue - totalExpected

  const handleMoveToReserves = async () => {
    if (unallocatedBuffer <= 0) return
    setLoading(true)
    const newReserveVal = (parseFloat(reserveInput) || 0) + unallocatedBuffer
    const newReserveUsd = newReserveVal / rate
    
    const formData = new FormData()
    formData.set("month", currentMonth.toString())
    formData.set("year", currentYear.toString())
    formData.set("salary", salaryInput)
    formData.set("salaryUsd", (parseFloat(salaryInput) / rate).toString())
    formData.set("cashInHandUsd", (parseFloat(cashInput) / rate).toString())
    formData.set("reserveFundsUsd", newReserveUsd.toString())
    formData.set("applyToFuture", "false")
    formData.set("resetFuture", "false")
    
    try {
      await updateMonthlySalaryAction(formData)
      setReserveInput(String(rate > 1 ? Math.round(newReserveVal) : Math.round(newReserveVal * 100) / 100))
      toast.success(t("saveSuccess"))
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // Navigation restrictions
  const userStartMonth = new Date(userCreatedAt).getUTCMonth() + 1
  const userStartYear = new Date(userCreatedAt).getUTCFullYear()
  const isFirstMonth = currentMonth === userStartMonth && currentYear === userStartYear

  const navigateMonth = (m: number, y: number) => {
    // Soft navigation using Next.js router
    router.push(`/budgets?month=${m}&year=${y}`, { scroll: false })
  }


  const handlePrevMonth = () => {
    if (isFirstMonth) return
    let m = currentMonth - 1
    let y = currentYear
    if (m < 1) {
      m = 12
      y--
    }
    navigateMonth(m, y)
  }

  const handleNextMonth = () => {
    let m = currentMonth + 1
    let y = currentYear
    if (m > 12) {
      m = 1
      y++
    }
    navigateMonth(m, y)
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gradient">
            {t("budgets")}
          </h1>

          <p className="text-muted-foreground font-medium">
             {t("month")} {currentMonth.toString().padStart(2, '0')}, {currentYear}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-xl border border-border/50">
          </div>

          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-primary/10 shadow-sm overflow-hidden">
            <Button variant="ghost" size="icon" disabled={isFirstMonth} className="h-8 w-8 hover:bg-primary/10 disabled:opacity-30 rounded-lg" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 font-black text-[12px] min-w-[100px] text-center tracking-tight">
               {currentMonth.toString().padStart(2, '0')} / {currentYear}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 rounded-lg" onClick={handleNextMonth}>
               <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Warning and Allocator Banners */}
      {totalExpected > salaryValue + 0.1 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 font-extrabold text-sm flex items-center gap-2 shadow-xs animate-pulse">
          <AlertCircle className="size-4 shrink-0 animate-bounce" />
          <span>
            {t("overBudgetWarning")
              .replace("{total}", formatCurrency(totalExpected / rate))
              .replace("{salary}", formatCurrency(salaryValue / rate))}
          </span>
        </div>
      )}

      {unallocatedBuffer > 0.01 && !isFutureMonth && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 font-bold text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Info className="size-4 shrink-0 text-indigo-500" />
            <span>
              {lang === "vi" 
                ? `Bạn còn ${formatCurrency(unallocatedBuffer / rate)} chưa phân bổ trong ngân sách tháng này.`
                : `You have ${formatCurrency(unallocatedBuffer / rate)} unallocated buffer left in this month's budget.`}
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={distributeEvenly} 
              className="rounded-lg h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold flex-1 sm:flex-initial"
            >
              {t("distributeEvenly") || "Phân bổ đều"}
            </Button>
            <Button 
              size="sm" 
              onClick={handleMoveToReserves} 
              disabled={loading}
              className="rounded-lg h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex-1 sm:flex-initial"
            >
              {lang === "vi" ? "Chuyển vào quỹ dự trữ" : "Put in reserve"}
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards Section - Input Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 ring-1 ring-indigo-500/20">
          <CardHeader className="pb-2">
             <CardDescription className="text-indigo-600/80 font-semibold uppercase text-xs tracking-wider">{t("totalSalary")}</CardDescription>
              <CardTitle className="text-2xl font-black text-indigo-700">
                 <div className="flex items-center gap-2 group mt-1">
                    <Input 
                       type="number" 
                       value={salaryInput === "0" ? "" : salaryInput} 
                       placeholder="0"
                       onChange={(e) => handleSalaryChange(e.target.value)}
                       onBlur={() => {
                          if (parseFloat(salaryInput) !== (initialData.totalSalary || 0) * rate) {
                             setIsRecurringPromptOpen(true)
                          }
                       }}
                       onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                             e.preventDefault() 
                             if (parseFloat(salaryInput) !== (initialData.totalSalary || 0) * rate) {
                                setSalaryApplyMode("once")
                                setIsRecurringPromptOpen(true)
                             }
                          }
                       }}

                       className="h-10 font-black text-xl bg-white/5 border border-white/10 focus-visible:ring-primary/30 p-2 w-full shadow-inner rounded-xl"
                    />
                 </div>
              </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-[10px] text-indigo-500 flex items-center gap-1 font-medium bg-indigo-500/10 w-fit px-2 py-0.5 rounded-full whitespace-nowrap">
                <Info className="h-3 w-3" /> {t("editSalary")}
             </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 ring-1 ring-blue-500/20">
          <CardHeader className="pb-2">
             <CardDescription className="text-blue-600/80 font-semibold uppercase text-xs tracking-wider">{t("cashInHand")}</CardDescription>
              <CardTitle className="text-2xl font-black text-blue-700">
                 <div className="flex items-center gap-2 group mt-1">
                    <Input 
                       type="number" 
                       value={cashInput === "0" ? "" : cashInput} 
                       placeholder="0"
                       onChange={(e) => setCashInput(e.target.value)}
                       onBlur={async () => {
                          const currentVal = (initialData.cashInHand || 0) * rate
                          if (Math.abs(parseFloat(cashInput) - currentVal) > 0.1) {
                            await handleSalaryUpdate(false)
                          }
                       }}
                       className="h-10 font-black text-xl bg-white/5 border border-white/10 focus-visible:ring-primary/30 p-2 w-full shadow-inner rounded-xl"
                    />
                 </div>
              </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-[10px] text-blue-500 flex items-center gap-1 font-medium bg-blue-500/10 w-fit px-2 py-0.5 rounded-full whitespace-nowrap">
                <Info className="h-3 w-3" /> {t("editSalary")}
             </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 ring-1 ring-amber-500/20">
          <CardHeader className="pb-2">
             <CardDescription className="text-amber-600/80 font-semibold uppercase text-xs tracking-wider">{t("reserveFunds")}</CardDescription>
              <CardTitle className="text-2xl font-black text-amber-700 mt-1">
                 {formatCurrency(roundDisplay((parseFloat(reserveInput) / rate - (initialData.allocatedToGoals || 0)) + (salaryValue - totalNetCostValue) / rate))}
              </CardTitle>
          </CardHeader>
          <CardContent>
              <div className="flex flex-col gap-3">
                 <div className="flex items-center justify-between gap-2 bg-transparent border border-amber-500/30 rounded-xl px-0 h-10 transition-all focus-within:border-amber-500/60">
                    <Input 
                       type="number" 
                       value={reserveInput === "0" ? "" : reserveInput} 
                       placeholder="0"
                       onChange={(e) => setReserveInput(e.target.value)}
                       onBlur={async () => {
                          const currentVal = (initialData.baseReserve || 0) * rate
                          if (Math.abs(parseFloat(reserveInput) - currentVal) > 0.1) {
                            await handleSalaryUpdate(false)
                          }
                       }}
                       className="h-full bg-transparent border-none focus-visible:ring-0 px-2 font-black text-base w-full"
                    />
                    <span className="text-amber-600/60 font-black text-[10px] uppercase tracking-widest whitespace-nowrap shrink-0 pr-2">{t("limit")}</span>
                 </div>
                 <div className="text-[10px] text-amber-500 flex items-center gap-1.5 font-bold px-3 py-1.5 bg-amber-500/5 rounded-xl w-full border border-amber-500/10">
                    <div className="flex justify-between w-full items-center">
                       <div className="flex items-center gap-1.5">
                          <Info className="h-3 w-3 shrink-0" /> 
                          <span>{t("allocated")}</span>
                       </div>
                       <b className="text-amber-700">{formatCurrency(roundDisplay(initialData.allocatedToGoals))}</b>
                    </div>
                 </div>
              </div>
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-slate-500/10 to-slate-600/5 ring-1 ring-slate-500/20">
           <CardHeader className="pb-2">
              <CardDescription className="text-slate-600/80 font-semibold uppercase text-xs tracking-wider">{t("savingsExtra")}</CardDescription>
               <CardTitle className="text-2xl font-black text-slate-700">{formatCurrency(roundDisplay(remainingSavings / rate))}</CardTitle>
           </CardHeader>
           <CardContent>
              <div className={cn("text-xs flex items-center gap-1 font-bold px-2 py-0.5 rounded-full w-fit whitespace-nowrap", remainingSavings >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")}>
                 {remainingSavings >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {(!isPastMonth && !isLastDayOfMonth) ? t("calculatingAtMonthEnd") : (remainingSavings >= 0 ? t("surplus") : t("deficit"))}
              </div>
           </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-rose-500/10 to-rose-600/5 ring-1 ring-rose-500/20">
           <CardHeader className="pb-2">
                <CardDescription className="text-rose-600/80 font-semibold uppercase text-xs tracking-wider">{t("actualCost")}</CardDescription>
                <CardTitle className="text-2xl font-black text-rose-700">{formatCurrency(roundDisplay(totalNetCostValue / rate))}</CardTitle>
           </CardHeader>
           <CardContent>
              <div className="text-xs text-rose-500 flex items-center gap-1 font-medium bg-rose-500/10 w-fit px-2 py-0.5 rounded-full whitespace-nowrap">
                 <Activity className="h-3 w-3" /> {t("totalExpenses")}
              </div>
           </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br bg-emerald-600 ring-2 ring-emerald-400 shadow-emerald-500/20 transform scale-105 z-10">
           <CardHeader className="pb-2 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10">
                 <TrendingUp className="h-24 w-24 text-white" />
              </div>
              <CardDescription className="text-white/80 font-bold uppercase text-xs tracking-wider">{t("currentBalance")}</CardDescription>
               <CardTitle className="text-2xl font-black text-white">{formatCurrency(roundDisplay(currentBalanceValue / rate))}</CardTitle>
           </CardHeader>
           <CardContent>
              <div className="text-xs text-white flex items-center gap-1 font-medium bg-white/20 backdrop-blur-sm w-fit px-3 py-1 rounded-full whitespace-nowrap">
                 <Calendar className="h-3 w-3" /> {t("availableNow")}
              </div>
           </CardContent>
        </Card>

        {/* Difference card removed as per request */}
      </div>

      {/* Chart Section */}
      <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-border">
         <CardHeader className="flex flex-row items-center justify-between">
            <div>
               <CardTitle>{t("financialTrend")}</CardTitle>
                <CardDescription>{t("financialTrend")}: {t("expectedCost")} vs {t("actualCost")}</CardDescription>
            </div>
            <div className="flex gap-2">
               <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 bg-indigo-500/5">{t("expectedCost")}</Badge>
               <Badge variant="outline" className="border-rose-500/30 text-rose-600 bg-rose-500/5">{t("actualCost")}</Badge>
            </div>
         </CardHeader>
          <CardContent className="h-[350px] min-h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
               <AreaChart data={chartData}>
                  <defs>
                     <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                     dataKey="day" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fontSize: 12, fontWeight: 600 }}
                     dy={10}
                  />
                  <YAxis 
                     axisLine={false} 
                     tickLine={false} 
                     tickFormatter={(value) => {
                        if (rate > 1) {
                           if (Math.abs(value) >= 1000000) return `${(value/1000000).toFixed(1)}M`
                           if (Math.abs(value) >= 1000) return `${(value/1000).toFixed(0)}K`
                           return value
                        }
                        return value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value
                     }}
                     tick={{ fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip 
                     formatter={(value: unknown) => formatCurrency(Number(value || 0) / rate)}
                     contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        padding: '12px'
                     }} 
                  />
                  <Area type="monotone" dataKey={t('expectedCost')} stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorExpected)" />
                  <Area type="monotone" dataKey={t('actualCost')} stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
               </AreaChart>
            </ResponsiveContainer>
         </CardContent>
      </Card>

      {/* Daily Breakdown Table */}
      <Card className="border-none shadow-2xl bg-card ring-1 ring-border">
         <CardHeader className="flex flex-row items-center justify-between">
            <div>
               <CardTitle>{t("dailyBudget")}</CardTitle>
                <CardDescription>{t("distributionNotice")}</CardDescription>
            </div>
            <div className="flex gap-2">
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={async (e) => {
                     const file = e.target.files?.[0]
                     if (!file) return
                     setIsScanning(true)
                     const formData = new FormData()
                     formData.append("file", file)
                     formData.append("month", String(currentMonth))
                     formData.append("year", String(currentYear))
                     try {
                        const result = await scanActivitiesAction(formData)
                        const hasSalary = result.totalSalary !== undefined && result.totalSalary !== null
                        const hasCash = result.cashInHand !== undefined && result.cashInHand !== null
                        
                        if (result.count > 0 || hasSalary || hasCash) {
                           let msg = ""
                           if (result.count > 0) {
                              msg = t("scanSuccessMsg").replace("{count}", String(result.count)).replace("{date}", result.date)
                           } else {
                              msg = t("saveSuccess")
                           }
                           
                           if (hasSalary || hasCash) {
                              const details = []
                              if (hasSalary) details.push(`${t("totalSalary")}: ${formatCurrency(result.totalSalary as number)}`)
                              if (hasCash) details.push(`${t("cashInHand")}: ${formatCurrency(result.cashInHand as number)}`)
                              msg += ` - Auto-filled: ${details.join(", ")}`
                           }
                           
                           toast.success(msg)
                           router.refresh()
                        } else {
                           toast.error(t("scanNoResult"))
                        }
                     } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : String(err))
                     } finally {
                        setIsScanning(false)
                        if (e.target) e.target.value = ""
                     }
                  }}
               />
               <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                  className="rounded-lg h-9 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
               >
                  {isScanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {isScanning ? t("scanning") : t("scanActivity")}
               </Button>

               {isDistributed && (
                  <>
                     <Button variant="outline" size="sm" onClick={revertSalary} className="rounded-lg h-9 border-rose-500/30 text-rose-600 hover:bg-rose-500/5">
                        <RefreshCcw className="h-4 w-4 mr-2" /> {t("cancel")}
                     </Button>
                     <Button size="sm" onClick={handleFullSave} disabled={loading} className="rounded-lg h-9 bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
                        <Save className="h-4 w-4 mr-2" /> {t("applyDistribution")}
                     </Button>
                  </>
               )}
               {!isDistributed && (
                  <Button variant="outline" size="sm" onClick={distributeEvenly} className="rounded-lg h-9" disabled={isFutureMonth}>
                     <Plus className="h-4 w-4 mr-2" /> {t("distributeEvenly")}
                  </Button>
               )}
            </div>
         </CardHeader>
         <CardContent className="p-0">
            {isFutureMonth ? (
                <div className="p-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground font-medium">{t("futureBudgetNotice")}</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
               <table className="w-full text-sm text-left border-collapse">
                  <thead>
                     <tr className="bg-muted text-muted-foreground uppercase text-[10px] tracking-widest font-bold border-b border-border">
                        <th className="px-6 py-4 w-[100px] text-center">{t("date")}</th>
                        <th className="px-6 py-4 text-center">{t("expectedCost")}</th>
                        <th className="px-6 py-4 text-center">{t("actualCost")}</th>
                        <th className="px-6 py-4 text-center">{t("difference")}</th>
                        <th className="px-6 py-4 text-center">{t("actions")}</th>
                     </tr>
                  </thead>
                  <tbody>
                      {dates.map(date => {
                         // Important: Use date string comparison for today/future to avoid UTC shift issues
                         const dateObj = new Date(date + 'T00:00:00') // Force local
                         const isToday = dateObj.toDateString() === today.toDateString()
                         const isFuture = dateObj > today && !isToday
                         const netCost = dailyNetCosts[date] || 0
                        
                        return (
                           <tr key={date} className={cn(
                              "border-b border-border/50 transition-colors hover:bg-muted/30 group",
                              isToday && "bg-primary/5 font-semibold ring-1 ring-inset ring-primary/10"
                           )}>
                              <td className="px-6 py-4 font-mono text-xs text-center">
                                 {date.split('-')[2]}/{date.split('-')[1]}
                                 {isToday && <Badge className="ml-2 h-4 px-1 text-[8px]" variant="secondary">TODAY</Badge>}
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center justify-center gap-2">
                                     <Input 
                                        type="number" 
                                        value={dailyAllocations[date] === "0" ? "" : (rate > 1 ? Math.round(parseFloat(dailyAllocations[date] || "0")).toString() : (Math.round(parseFloat(dailyAllocations[date] || "0") * 100) / 100).toString())} 
                                        placeholder="0"
                                        className="h-8 text-xs bg-transparent border-dashed ring-0 focus-visible:ring-1 text-center max-w-[120px]"
                                        onChange={(e) => {
                                            setDailyAllocations({ ...dailyAllocations, [date]: e.target.value })
                                        }}
                                        onBlur={async () => {
                                            const val = dailyAllocations[date] || "0"
                                            const originalVal = initialData.dailyBudgets.find(db => db.date === date)?.expectedCost || "0"
                                            const originalInCurrency = parseFloat(originalVal) * rate
                                            const parsedVal = parseFloat(val) || 0
                                            
                                            // Check if already same as original (no change)
                                            if (Math.abs(parsedVal - originalInCurrency) < 0.01) return

                                            // Calculate what the new total WOULD be
                                            const currentTotal = Object.entries(dailyAllocations).reduce((acc, [d, v]) => {
                                               if (d === date) return acc + parsedVal
                                               return acc + (parseFloat(v) || 0)
                                            }, 0)

                                             if (currentTotal > salaryValue + 0.1) {
                                                toast.error(t("overBudgetWarning")
                                                   .replace("{total}", formatCurrency(currentTotal / rate))
                                                   .replace("{salary}", formatCurrency(salaryValue / rate)))
                                               // Revert UI value
                                               setDailyAllocations(prev => ({ ...prev, [date]: originalInCurrency.toString() }))
                                               return
                                            }

                                            // Save if valid
                                            const fd = new FormData()
                                            fd.set("date", date)
                                            fd.set("amount", val)
                                            try {
                                               // We call individual update
                                               await updateDailyBudgetAction(fd)
                                               toast.success(`${date.split('-')[2]}/${date.split('-')[1]}: ${t("saveSuccess")}`, { duration: 1500 })
                                            } catch (e: unknown) {
                                               toast.error(e instanceof Error ? e.message : String(e))
                                            }
                                        }}
                                     />
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 {(!isFuture && !isToday) || netCost !== 0 ? (
                                   <span className={cn("inline-flex items-center gap-1.5", (netCost * rate) > 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold")}>
                                      {formatCurrency(roundDisplay(Math.abs(netCost)))}
                                   </span>
                                 ) : (
                                   <span className="text-muted-foreground/30">—</span>
                                 )}
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex justify-center">
                                    {(!isFuture && !isToday) || netCost !== 0 ? (
                                      <Badge variant={(parseFloat(dailyAllocations[date] || "0") - netCost * rate) >= 0 ? "secondary" : "destructive"} className="text-[10px] rounded-md px-2 h-6">
                                         {(parseFloat(dailyAllocations[date] || "0") - netCost * rate) >= 0 ? "+" : ""}{formatCurrency(roundDisplay((parseFloat(dailyAllocations[date] || "0") - netCost * rate) / rate))}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground/30">—</span>
                                    )}
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex justify-center">
                                    {!isFuture && (!isToday || isPast9PM) && (
                                       <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => { setSelectedDate(date); setIsActivityModalOpen(true); }}
                                          className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary relative"
                                       >
                                          <Plus className="h-4 w-4" />
                                          {transactionsForSelectedDate.length > 0 && selectedDate === date && (
                                              <span className="absolute -top-1.5 -right-1.5 flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                                                  {transactionsForSelectedDate.length}
                                              </span>
                                          )}
                                          {/* More descriptive view if has transactions but date not selected */}
                                          {initialData.transactions.filter(t => formatDateLocal(new Date(t.date)) === date).length > 0 && selectedDate !== date && (
                                               <span className="absolute -top-1.5 -right-1.5 flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                                                  {initialData.transactions.filter(t => formatDateLocal(new Date(t.date)) === date).length}
                                              </span>
                                          )}
                                       </Button>
                                    )}
                                 </div>
                              </td>
                           </tr>
                        )
                     })}
                  </tbody>
                   <tfoot>
                      <tr className="bg-muted/50 font-black">
                         <td className="px-6 py-6 text-xs uppercase tracking-tighter text-center italic opacity-70 font-bold">{t("total")}</td>
                          <td className={cn("px-6 py-6 text-center", totalExpected > salaryValue + 0.1 ? "text-rose-600" : "text-primary")}>
                             <div className="flex flex-col items-center gap-1">
                                <span className={cn("font-black text-base", totalExpected > salaryValue + 0.1 && "animate-pulse")}>{formatCurrency(roundDisplay(totalExpected / rate))}</span>
                                <span className={cn("text-[10px] uppercase font-bold text-slate-500", totalExpected > salaryValue + 0.1 && "text-rose-500")}>
                                   {t("planning")} 
                                   {totalExpected > salaryValue + 0.1 && ` (${t("overLimit")})`}
                                </span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-rose-600 font-black text-base text-center">
                             {formatCurrency(roundDisplay(totalNetCostValue / rate))}
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex flex-col items-center justify-center py-2 px-3 rounded-xl bg-primary/5 ring-1 ring-primary/10">
                                <span className={cn("text-sm font-black tracking-tight", currentBalanceValue >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                   {formatCurrency(roundDisplay(currentBalanceValue / rate))}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5 opacity-60">
                                    {t("currentBalance")}
                                 </span>
                             </div>
                          </td>
                          <td className="px-6 py-4"></td>
                      </tr>
                   </tfoot>
                </table>
             </div>
             )}
          </CardContent>
       </Card>

       {/* Activity Addition Modal */}
       <Dialog open={isActivityModalOpen} onOpenChange={setIsActivityModalOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl ring-1 ring-border bg-card">
             <DialogHeader className="p-6 bg-muted/50 border-b border-border/50">
                <DialogTitle className="text-xl font-black">{t("dailyActivity")}</DialogTitle>
                <DialogDescription className="font-medium">
                   {selectedDate && new Date(selectedDate).toLocaleDateString(lang, { weekday: 'long', month: 'long', day: 'numeric' })}
                </DialogDescription>
             </DialogHeader>

             <div className="p-6 overflow-y-auto max-h-[60vh] flex flex-col gap-6">
                 {/* Existing Transactions */}
                 {transactionsForSelectedDate.length > 0 && (
                     <div className="space-y-3">
                         <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black first-letter:uppercase text-muted-foreground uppercase tracking-widest">{t("activities")}</h4>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2 rounded-lg font-bold uppercase tracking-wider">
                                        {t("deleteAllActivities")}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-3xl border-none shadow-2xl bg-card ring-1 ring-border sm:max-w-[425px] z-[99999]">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t("confirmDeleteAll")}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-xl border-border/50 hover:bg-muted/50 transition-colors font-semibold">{t("cancel")}</AlertDialogCancel>
                                        <AlertDialogAction 
                                            variant="destructive"
                                            onClick={async () => {
                                                setLoading(true)
                                                try {
                                                    if (selectedDate) {
                                                        await deleteAllTransactionsByDateAction(selectedDate)
                                                        toast.success(t("deleteSuccess"))
                                                        setIsActivityModalOpen(false)
                                                        router.refresh()
                                                    }
                                                } catch (err: unknown) {
                                                    toast.error(err instanceof Error ? err.message : String(err))
                                                } finally {
                                                    setLoading(false)
                                                }
                                            }}
                                            className="rounded-xl shadow-lg font-bold transition-all"
                                        >
                                            {t("delete")}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                         </div>
                         <div className="space-y-2">
                             {transactionsForSelectedDate.map(tx => (
                                 <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/50 group hover:border-primary/20 transition-all">
                                     <div className="flex flex-col">
                                         <span className="text-sm font-bold">{tx.payee}</span>
                                         <span className="text-[10px] text-muted-foreground font-medium">{tx.notes?.replace('Category: ', '') || t("defaultCategory")}</span>
                                     </div>
                                     <div className="flex items-center gap-3">
                                         <span className={cn("text-sm font-black", tx.type === 'INCOME' ? "text-emerald-600" : "text-rose-600")}>
                                           {tx.type === 'INCOME' ? "+" : "-"}{formatCurrency(Math.abs(parseFloat(tx.amount)))}
                                         </span>
                                         <AlertDialog>
                                             <AlertDialogTrigger asChild>
                                                 <Button 
                                                     variant="ghost" 
                                                     size="icon" 
                                                     className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-600 transition-all"
                                                 >
                                                     <Trash2 className="h-4 w-4" />
                                                 </Button>
                                             </AlertDialogTrigger>
                                             <AlertDialogContent className="rounded-3xl border-none shadow-2xl bg-card ring-1 ring-border sm:max-w-[425px]">
                                                 <AlertDialogHeader>
                                                     <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
                                                     <AlertDialogDescription>
                                                         {t("confirmDeleteOne")}
                                                     </AlertDialogDescription>
                                                 </AlertDialogHeader>
                                                 <AlertDialogFooter>
                                                     <AlertDialogCancel className="rounded-xl border-border/50 hover:bg-muted/50 transition-colors font-semibold">{t("cancel")}</AlertDialogCancel>
                                                     <AlertDialogAction 
                                                         variant="destructive"
                                                         onClick={async () => {
                                                             setLoading(true)
                                                             try {
                                                                 await deleteTransactionAction(tx.id)
                                                                 toast.success(t("deleteSuccess"))
                                                                 router.refresh()
                                                             } catch (err: unknown) {
                                                                 toast.error(err instanceof Error ? err.message : String(err))
                                                             } finally {
                                                                 setLoading(false)
                                                             }
                                                         }}
                                                         className="rounded-xl shadow-lg font-bold transition-all"
                                                     >
                                                         {t("delete")}
                                                     </AlertDialogAction>
                                                 </AlertDialogFooter>
                                             </AlertDialogContent>
                                         </AlertDialog>
                                     </div>
                                 </div>
                             ))}
                         </div>
                         <Separator className="mt-6 opacity-50" />
                     </div>
                 )}

                 {/* Add New Transaction Form */}
                 <div className="space-y-4">
                     <h4 className="text-[10px] font-black first-letter:uppercase text-muted-foreground uppercase tracking-widest">
                        {transactionsForSelectedDate.length > 0 ? t("addNewActivity") : t("noActivityYet")}
                     </h4>
                     
                     <form action={async (fd) => {
                        if (selectedDate) {
                           fd.set("date", selectedDate)
                           fd.set("activityType", activityType)
                           try {
                              await addTransactionAction(fd)
                              setIsActivityModalOpen(false)
                              toast.success(t("saveSuccess"))
                              router.refresh()
                           } catch (e: unknown) {
                              toast.error(e instanceof Error ? e.message : String(e))
                           }
                        }
                     }} className="grid gap-4">
                        <div className="grid gap-2 mb-2">
                           <label className="text-xs font-bold px-1">{t("activityType")}</label>
                           <div className="flex p-1 bg-muted/30 rounded-2xl border border-border/50 gap-1 h-12">
                              <button
                                 type="button"
                                 onClick={() => setActivityType("EXPENSE")}
                                 className={cn(
                                    "flex-1 flex items-center justify-center gap-2 rounded-xl text-sm font-black transition-all",
                                    activityType === "EXPENSE" 
                                       ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" 
                                       : "text-muted-foreground hover:bg-muted"
                                 )}
                              >
                                 <TrendingDown className="h-4 w-4" />
                                 {t("expenseLabel")}
                              </button>
                              <button
                                 type="button"
                                 onClick={() => setActivityType("INCOME")}
                                 className={cn(
                                    "flex-1 flex items-center justify-center gap-2 rounded-xl text-sm font-black transition-all",
                                    activityType === "INCOME" 
                                       ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                                       : "text-muted-foreground hover:bg-muted"
                                 )}
                              >
                                 <TrendingUp className="h-4 w-4" />
                                 {t("incomeLabel")}
                              </button>
                           </div>
                        </div>
                        <div className="grid gap-2">
                           <label className="text-xs font-bold px-1">{t("payee")}</label>
                           <Input name="payee" placeholder={t("placeholderPayee")} required className="rounded-xl bg-muted/20 border-border/50 h-10 text-sm focus:ring-primary/20" />
                        </div>
                        <div className="grid gap-2">
                           <label className="text-xs font-bold px-1">{t("amount")}</label>
                           <Input type="number" name="amount" placeholder={t("placeholderAmount")} required className="rounded-xl bg-muted/20 border-border/50 h-10 text-sm focus:ring-primary/20" />
                        </div>
                        <div className="grid gap-2">
                           <label className="text-xs font-bold px-1">{t("category")}</label>
                           <Input name="category" placeholder={t("placeholderCategory")} className="rounded-xl bg-muted/20 border-border/50 h-10 text-sm focus:ring-primary/20" />
                        </div>
                        <Button type="submit" className="w-full rounded-xl h-12 font-black mt-2 shadow-lg shadow-primary/20">
                           {t("save")}
                        </Button>
                     </form>
                 </div>
             </div>
          </DialogContent>
       </Dialog>
      
      {/* Recurring Salary Prompt */}
      <Dialog 
         open={isRecurringPromptOpen} 
         onOpenChange={(open) => {
            if (!open && !loading) revertSalary()
            else if (open) setIsRecurringPromptOpen(true)
            else setIsRecurringPromptOpen(false)
         }}
      >
         <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl bg-slate-950/95 backdrop-blur-xl rounded-[1.5rem] ring-1 ring-white/10" onPointerDownOutside={(e) => e.preventDefault()}>
            <div className="p-6">
               <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl font-black text-white tracking-tight">
                     {t("recurringSalaryTitle")}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs font-medium leading-relaxed">
                     {t("recurringSalaryDesc")}
                  </DialogDescription>
               </DialogHeader>

               <div className="flex flex-col gap-2">
                  <button 
                     onClick={() => setSalaryApplyMode("once")}
                     className={cn(
                        "relative flex items-center gap-4 p-3 rounded-2xl border transition-all duration-200 group text-left",
                        salaryApplyMode === "once" 
                           ? "bg-indigo-600/20 border-indigo-500/50" 
                           : "bg-white/5 border-white/5 hover:bg-white/10"
                     )}
                  >
                     <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        salaryApplyMode === "once" ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-400"
                     )}>
                        <CalendarDays className="w-5 h-5" />
                     </div>
                     <div className="flex-1">
                        <span className={cn("block font-bold text-sm tracking-tight", salaryApplyMode === "once" ? "text-white" : "text-slate-300")}>
                           {t("justThisMonth")}
                        </span>
                     </div>
                     <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        salaryApplyMode === "once" ? "border-indigo-500 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "border-white/10"
                     )}>
                        {salaryApplyMode === "once" && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in" />}
                     </div>
                  </button>

                  <button 
                     onClick={() => setSalaryApplyMode("fixed")}
                     className={cn(
                        "relative flex items-center gap-4 p-3 rounded-2xl border transition-all duration-200 group text-left",
                        salaryApplyMode === "fixed" 
                           ? "bg-indigo-600/20 border-indigo-500/50" 
                           : "bg-white/5 border-white/5 hover:bg-white/10"
                     )}
                  >
                     <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        salaryApplyMode === "fixed" ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-400"
                     )}>
                        <RefreshCcw className="w-5 h-5" />
                     </div>
                     <div className="flex-1">
                        <span className={cn("block font-bold text-sm tracking-tight", salaryApplyMode === "fixed" ? "text-white" : "text-slate-300")}>
                           {t("fixedSalary")}
                        </span>
                     </div>
                     <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        salaryApplyMode === "fixed" ? "border-indigo-500 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "border-white/10"
                     )}>
                        {salaryApplyMode === "fixed" && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in" />}
                     </div>
                  </button>
               </div>
            </div>
            
            <div className="p-4 bg-white/[0.02] border-t border-white/5 flex gap-2 items-center">

               <Button variant="ghost" onClick={revertSalary} className="flex-1 rounded-xl h-11 text-slate-400 hover:text-white hover:bg-white/5 font-bold text-sm">
                  {t("cancel")}
               </Button>
               <Button 
                  onClick={() => handleSalaryUpdate(salaryApplyMode === "fixed")} 
                  disabled={loading}
                  className="flex-[1.5] rounded-xl h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all shadow-lg shadow-indigo-600/20"
               >
                  {loading ? (
                     <div className="flex items-center gap-2">
                        <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                        {t("loading")}
                     </div>
                  ) : t("save")}
               </Button>
            </div>


         </DialogContent>
      </Dialog>




       {/* Reserve Confirmation Dialog */}
       <AlertDialog open={isReserveConfirmOpen} onOpenChange={setIsReserveConfirmOpen}>
         <AlertDialogContent className="rounded-3xl border-none shadow-2xl ring-1 ring-border bg-card">
           <AlertDialogHeader>
             <AlertDialogTitle className="text-xl font-black">{t("useReservesPrompt")}</AlertDialogTitle>
             <AlertDialogDescription className="font-medium">
               {t("useReservesPrompt")}
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel className="rounded-xl font-bold" onClick={() => { setIsReserveConfirmOpen(false); setPendingActivityData(null); }}>{t("no")}</AlertDialogCancel>
             <AlertDialogAction className="rounded-xl font-bold bg-primary shadow-lg shadow-primary/20" onClick={async () => {
               if (pendingActivityData) {
                 pendingActivityData.set("useReserves", "true")
                 setLoading(true)
                 try {
                   await addTransactionAction(pendingActivityData)
                   setIsActivityModalOpen(false)
                   toast.success(t("saveSuccess"))
                   router.refresh()
                 } catch (e: unknown) {
                   toast.error(e instanceof Error ? e.message : String(e))
                 } finally {
                   setLoading(false)
                   setIsReserveConfirmOpen(false)
                   setPendingActivityData(null)
                 }
               }
             }}>{t("yes")}</AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
    </div>
  )
}


