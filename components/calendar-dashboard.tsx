"use client"

import React, { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from "lucide-react"
import { useI18n } from "./i18n-provider"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Transaction {
  id: string
  amount: string
  type: string
  date: string
  payee?: string
  notes?: string
}

interface DailyBudget {
  date: string
  expectedCost: string
}

interface CalendarDashboardProps {
  initialData: {
    monthlyBudgetId: string | null
    month: number
    year: number
    totalSalary: number
    carryOver: number
    dailyBudgets: DailyBudget[]
    transactions: Transaction[]
  }
  lang: string
  userCreatedAt: Date
}

export function CalendarDashboard({ initialData, lang, userCreatedAt }: CalendarDashboardProps) {
  const { t } = useI18n()
  const { month, year, dailyBudgets, transactions, carryOver } = initialData

  const rate = lang === "vi" ? 26000 : 1

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", {
      style: "currency",
      currency: lang === "vi" ? "VND" : "USD",
      maximumFractionDigits: 0,
    }).format(Math.round(val))
  }

  // Generate days for the grid
  const daysInMonth = useMemo(() => {
    const date = new Date(year, month - 1, 1)
    const days = []
    
    // Previous month padding
    const firstDayOfWeek = date.getDay() // 0 is Sunday
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        month: month === 1 ? 12 : month - 1,
        year: month === 1 ? year - 1 : year,
        isPadding: true,
      })
    }

    // Current month days
    const lastDayOfMonth = new Date(year, month, 0).getDate()
    for (let i = 1; i <= lastDayOfMonth; i++) {
      days.push({
        day: i,
        month,
        year,
        isPadding: false,
      })
    }

    // Next month padding
    const remainingCells = 42 - days.length
    for (let i = 1; i <= remainingCells; i++) {
        days.push({
          day: i,
          month: month === 12 ? 1 : month + 1,
          year: month === 12 ? year + 1 : year,
          isPadding: true,
        })
    }

    return days
  }, [month, year])

  // Map data to dates
  const dayData = useMemo(() => {
    const data: Record<string, { expected: number; actual: number; transactions: Transaction[] }> = {}

    // Expected costs
    dailyBudgets.forEach((db) => {
      data[db.date] = { expected: parseFloat(db.expectedCost) * rate, actual: 0, transactions: [] }
    })

    // Actual transactions
    transactions.forEach((tx) => {
      const d = tx.date // YYYY-MM-DD
      if (!data[d]) data[d] = { expected: 0, actual: 0, transactions: [] }
      const amount = parseFloat(tx.amount) * rate
      // Transactions are stored as negative for expense, positive for income in the DB
      // We want to show "Chi tiêu thực tế" so we subtract income and add expense (invert sign)
      data[d].actual -= amount 
      data[d].transactions.push(tx)
    })

    return data
  }, [dailyBudgets, transactions, rate])

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const userStartMonth = new Date(userCreatedAt).getUTCMonth() + 1
  const userStartYear = new Date(userCreatedAt).getUTCFullYear()
  const isFirstMonth = month === userStartMonth && year === userStartYear

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-2">
            <CalendarIcon className="size-8 text-primary" />
            {t("calendar")}
          </h1>
          <p className="text-muted-foreground">{t("financialAnalytics")}</p>
        </div>

        <div className="flex items-center gap-2 bg-background/50 border rounded-2xl p-1.5 shadow-sm backdrop-blur-md">
          {!isFirstMonth && (
            <Button variant="ghost" size="icon" asChild className="rounded-xl flex items-center justify-center">
              <Link href={`/calendar?month=${prevMonth}&year=${prevYear}`}>
                 <ChevronLeft className="size-5" />
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild className="rounded-xl px-2 h-8 text-xs font-bold text-muted-foreground hover:text-foreground">
            <Link href={`/calendar?month=${today.getMonth() + 1}&year=${today.getFullYear()}`}>
              {lang === "vi" ? "Hôm nay" : "Today"}
            </Link>
          </Button>
          <div className="px-3 font-semibold text-base flex items-center gap-1.5">
             <span className="text-primary">{month}</span>
             <span className="text-muted-foreground">/</span>
             <span>{year}</span>
          </div>
          <Button variant="ghost" size="icon" asChild className="rounded-xl flex items-center justify-center">
            <Link href={`/calendar?month=${nextMonth}&year=${nextYear}`}>
              <ChevronRight className="size-5" />
            </Link>
          </Button>
        </div>

        {initialData.monthlyBudgetId && (
          <div className="flex items-center gap-4 bg-primary/10 border border-primary/20 rounded-2xl px-6 py-2 shadow-inner">
             <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-primary/70">{t("carryOver")}</span>
                <span className="text-sm font-bold">{formatCurrency(carryOver)}</span>
             </div>
             <div className="w-px h-8 bg-primary/20" />
             <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-primary/70">{t("totalSalary")}</span>
                <span className="text-sm font-bold text-primary">{formatCurrency(initialData.totalSalary * rate)}</span>
             </div>
          </div>
        )}
      </div>

      <Card className="border-none py-0 shadow-2xl bg-background/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem] ring-1 ring-border/20">
        <div className="border-b border-border/50 bg-primary/10">
          <div className="grid grid-cols-7 text-center">
            {(lang === "vi" 
              ? ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] 
              : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
            ).map((d) => (
              <div key={d} className="py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">{d}</div>
            ))}
          </div>
        </div>
        <CardContent className="p-0">
          <div className="grid grid-cols-7">
            {daysInMonth.map((d, i) => {
              const dateStr = `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`
              const data = dayData[dateStr]
              const isToday = todayStr === dateStr
              const isPadding = d.isPadding
              
              const diff = (data?.expected || 0) - (data?.actual || 0)
              const status = diff < -100 ? "over" : "within"

              return (
                <div 
                  key={i} 
                  className={cn(
                    "min-h-[120px] p-2 border-r border-b border-border/40 transition-all group overflow-hidden relative flex flex-col gap-1",
                    isPadding ? "bg-muted/30 opacity-40" : "hover:bg-primary/5",
                    isToday && !isPadding && "bg-primary/10"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span className={cn(
                      "text-sm font-bold rounded-full size-7 flex items-center justify-center transition-colors",
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground/70 group-hover:text-primary"
                    )}>
                      {d.day}
                    </span>
                    
                    {!isPadding && data && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="text-muted-foreground hover:text-primary transition-colors">
                                        <Info className="size-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-4 bg-popover/95 backdrop-blur-xl rounded-[1.5rem] border border-primary/20 shadow-2xl animate-in zoom-in-95 duration-200">
                                    <div className="space-y-3 text-foreground">
                                        <div className="border-b border-border/50 pb-2 mb-2">
                                            <p className="font-black text-xs text-primary uppercase tracking-tighter whitespace-nowrap">
                                                {t("activities")} ({data.transactions.length})
                                            </p>
                                        </div>
                                        {data.transactions.length === 0 ? (
                                            <p className="text-xs text-muted-foreground italic py-2">{t("noActivityYet")}</p>
                                        ) : (
                                            <div className="flex flex-col gap-1.5">
                                               {data.transactions.slice(0, 8).map((tx, idx) => (
                                                   <div key={idx} className="flex justify-between items-center gap-3 text-xs font-semibold group/tx">
                                                       <span className="truncate max-w-[100px] text-foreground/90 group-hover/tx:text-primary transition-colors">{tx.payee}</span>
                                                       <span className={tx.type === "INCOME" ? "text-emerald-500" : "text-rose-500"}>
                                                           {formatCurrency(Math.abs(parseFloat(tx.amount)) * rate)}
                                                       </span>
                                                   </div>
                                               ))}
                                            </div>
                                        )}
                                        {data.transactions.length > 8 && (
                                            <p className="text-[10px] text-center text-muted-foreground border-t border-border/50 pt-2 font-bold uppercase">+{data.transactions.length - 8} {t("more")}...</p>
                                        )}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                  </div>

                  {!isPadding && (data?.expected || data?.actual) ? (
                    <div className="mt-auto space-y-1">
                      {data.expected > 0 && (
                        <div className="text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium w-fit">
                          {formatCurrency(data.expected)}
                        </div>
                      )}
                      {data.actual !== 0 && (
                        <div className={cn(
                          "text-[10px] leading-none px-1.5 py-0.5 rounded-full font-bold w-fit",
                          status === "over" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        )}>
                          {formatCurrency(data.actual)}
                        </div>
                      )}
                    </div>
                  ) : !isPadding && (
                      <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="sm" className="h-6 w-full text-[10px] rounded-lg text-muted-foreground" asChild>
                            <Link href={`/budgets?month=${month}&year=${year}`}>
                                + {t("addActivity")}
                            </Link>
                         </Button>
                      </div>
                  )}

                  {isToday && (
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-primary rounded-full m-2 shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-6 justify-center text-sm p-4 bg-muted/20 border-2 border-dashed rounded-[2rem]">
          <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-blue-500/20 border border-blue-500/50" />
              <span className="text-muted-foreground font-medium">{t("expectedCost")}</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
              <span className="text-muted-foreground font-medium">{t("actualCost")} ({t("withinLimit")})</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-rose-500/20 border border-rose-500/50" />
              <span className="text-muted-foreground font-medium">{t("actualCost")} ({t("overLimitStatus")})</span>
          </div>
      </div>
    </div>
  )
}
