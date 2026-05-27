"use client"

import React from "react"
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  Wallet, 
  Activity, 
  CreditCard,
  DollarSign,
  MoreHorizontal,
  PiggyBank,
  PieChart,
  Star,
  TrendingUp,
  ArrowRight
} from "lucide-react"
import { exportToCSV } from "@/lib/utils"
import { useI18n } from "@/components/i18n-provider"
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export type DashboardData = {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  diff?: {
    income: number;
    expense: number;
    balance: number;
  };
  activeGoalsCount: number;
  totalGoalsProgress: number;
  chartData: Array<{ date: string; income: number; expense: number }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    status: string;
    name: string;
    date: string;
    type: string;
  }>;
  piggyBankBalance?: number;
  totalSalary?: number;
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const { t, lang, formatCurrency, formatDate } = useI18n()
  const rate = lang === "vi" ? 26000 : 1

  const compactNum = (val: unknown) => {
     if (!val || isNaN(Number(val))) return '';
     const num = Number(val) * rate;
     if (num >= 1000000) return (Math.round(num / 100000) / 10).toString() + 'M';
     if (num >= 1000) return (Math.round(num / 1000)).toString() + 'k';
     return `${Math.round(num)}`;
  };

  const handleDownloadReport = () => {
    const reportData = [
      { Metric: t("totalBalance"), Value: data.totalBalance },
      { Metric: t("monthlyIncome"), Value: data.monthlyIncome },
      { Metric: t("monthlyExpenses"), Value: data.monthlyExpenses },
      { Metric: t("income"), Value: data.diff?.income || 0 },
      { Metric: t("expense"), Value: data.diff?.expense || 0 }
    ]
    exportToCSV(reportData, "finance_summary")
  }

  return (
    <div className="flex flex-col gap-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-10">
      {/* Header section with Premium feel */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter sm:text-5xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {t("overview")}
          </h1>
          <p className="text-muted-foreground text-lg font-medium">{t("welcome")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="shadow-sm font-bold px-6 rounded-xl hover:scale-105 transition-transform" onClick={handleDownloadReport}>
             {t("downloadReport")}
          </Button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         {/* Main Balance Card - Extremely Premium */}
         <Card className="relative overflow-hidden border-none shadow-[0_20px_50px_rgba(79,70,229,0.15)] dark:shadow-[0_20px_50px_rgba(79,70,229,0.3)] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white rounded-[2rem] lg:col-span-1 min-h-[220px] ring-0 gap-0">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
               <Wallet className="w-40 h-40" />
            </div>
            <div className="relative z-10 flex flex-col justify-center h-full px-8 py-8">
               <p className="text-indigo-100/70 font-black uppercase tracking-[0.2em] text-[10px]">{t("totalBalance")}</p>
               <h2 className="text-4xl md:text-5xl font-black tracking-tighter mt-2 drop-shadow-md leading-none">
                  {formatCurrency(data.totalBalance)}
               </h2>
               <div className="mt-5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold leading-none ${data.diff && data.diff.balance >= 0 ? "bg-emerald-400 text-emerald-900" : "bg-rose-400 text-rose-900"}`}>
                     {data.diff && data.diff.balance >= 0 ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />} 
                     {data.diff ? `${Math.abs(data.diff.balance).toFixed(1)}%` : "0%"}
                  </span>
               </div>
            </div>
         </Card>

         {/* Monthly Highlights - Dual Cards */}
         <div className="grid grid-cols-2 gap-4 lg:col-span-2">
            <Card className="relative border-none shadow-lg shadow-emerald-500/10 dark:shadow-emerald-500/20 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-[2rem] overflow-hidden group cursor-pointer ring-0">
               <CardHeader className="relative z-10 pb-0 flex flex-row items-center justify-between">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                     <TrendingUp className="h-5 w-5" />
                  </div>
                  <Badge className="bg-white/20 text-[10px] font-black uppercase tracking-tight border-none">{t("monthlyIncome")}</Badge>
               </CardHeader>
               <CardContent className="relative z-10 mt-4">
                  <div className="text-2xl md:text-3xl font-black drop-shadow-sm">{formatCurrency(data.monthlyIncome)}</div>
                  <p className="text-[10px] font-bold text-white/70 mt-1 uppercase tracking-widest leading-none">
                     {data.diff && data.diff.income >= 0 ? "+" : ""}{data.diff ? `${data.diff.income.toFixed(1)}%` : "0%"} {t("growth") || "Growth"}
                  </p>
               </CardContent>
            </Card>

            <Card className="relative border-none shadow-lg shadow-rose-500/10 dark:shadow-rose-500/20 bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-[2rem] overflow-hidden group cursor-pointer ring-0">
               <CardHeader className="relative z-10 pb-0 flex flex-row items-center justify-between">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                     <CreditCard className="h-5 w-5" />
                  </div>
                  <Badge className="bg-white/20 text-[10px] font-black uppercase tracking-tight border-none">{t("monthlyExpenses")}</Badge>
               </CardHeader>
               <CardContent className="relative z-10 mt-4">
                  <div className="text-2xl md:text-3xl font-black drop-shadow-sm">{formatCurrency(data.monthlyExpenses)}</div>
                  <p className="text-[10px] font-bold text-white/70 mt-1 uppercase tracking-widest leading-none">
                     {data.diff && data.diff.expense <= 0 ? (lang === "vi" ? "Giảm" : "Down") : (lang === "vi" ? "Tăng" : "Up")} {data.diff ? `${Math.abs(data.diff.expense).toFixed(1)}%` : "0%"}
                  </p>
               </CardContent>
            </Card>

            {/* Piggy Bank Integration Card */}
            <Card className="col-span-2 border-none shadow-lg shadow-amber-500/10 dark:shadow-amber-500/20 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-[2rem] relative overflow-hidden group cursor-pointer ring-0">
               <div className="absolute top-0 right-0 p-6 opacity-20 transform translate-x-4 -translate-y-4 group-hover:rotate-12 transition-transform duration-500">
                  <PiggyBank className="w-32 h-32" />
               </div>
               <CardContent className="relative z-10 flex flex-col md:flex-row items-center justify-between h-full p-6 gap-4">
                  <div className="flex items-center gap-4">
                     <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md shadow-xl">
                        <PiggyBank className="w-8 h-8" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">{t("piggyBank") || "Piggy Bank"}</p>
                        <h3 className="text-3xl font-black drop-shadow-md">{formatCurrency(data.piggyBankBalance || 0)}</h3>
                     </div>
                  </div>
                  <Button variant="ghost" className="bg-black/10 hover:bg-black/20 text-white border-white/20 backdrop-blur-md rounded-2xl group/btn px-6 font-bold">
                     {t("viewDetails") || "View Details"} 
                     <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
               </CardContent>
            </Card>
         </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Main Financial Trend Chart */}
        <Card className="col-span-4 border-none shadow-xl dark:shadow-2xl bg-card/80 dark:bg-card/50 backdrop-blur-md rounded-[2rem] overflow-hidden ring-0">
          <CardHeader className="px-8 pt-8">
            <div className="flex items-center justify-between">
               <div>
                  <CardTitle className="text-2xl font-black">{t("financialTrend")}</CardTitle>
                  <CardDescription className="font-medium">{t("incomeVsExpenseDesc")}</CardDescription>
               </div>
               <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest bg-muted/50 p-2 rounded-xl">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> {t("income")}</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" /> {t("expense")}</div>
               </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-8">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.05)" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} padding={{ left: 20, right: 20 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={compactNum} width={50} />
                  <Tooltip 
                    contentStyle={{ borderRadius: "20px", border: "none", backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)", color: "#fff", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}
                    cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 2 }}
                    itemStyle={{ fontWeight: "bold", fontSize: "12px" }}
                    formatter={(value: any) => [formatCurrency(Number(value || 0)), " "]}
                  />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" connectNulls={true} animationDuration={2000} strokeLinecap="round" />
                  <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorExpense)" connectNulls={true} animationDuration={2000} strokeLinecap="round" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Breakdown Card */}
        <Card className="col-span-3 border-none shadow-xl dark:shadow-2xl bg-card/80 dark:bg-card/50 backdrop-blur-md rounded-[2rem] overflow-hidden ring-0">
           <CardHeader className="px-8 pt-8 pb-4">
              <CardTitle className="text-2xl font-black">{t("dailyBreakdown")}</CardTitle>
              <CardDescription className="font-medium text-muted-foreground/80">{t("dailyHabitsDesc")}</CardDescription>
           </CardHeader>
           <CardContent className="px-4 pb-8">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData.slice(-10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.05)" />
                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={compactNum} width={40} />
                    <Tooltip 
                       contentStyle={{ borderRadius: "16px", border: "none", backgroundColor: "rgba(0,0,0,0.9)", color: "#fff" }}
                       formatter={(value: any) => [formatCurrency(Number(value || 0)), " "]}
                    />
                    <Bar dataKey="expense" fill="#f43f5e" radius={[10, 10, 10, 10]} barSize={24} animationDuration={1000} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-8 space-y-4 px-4">
                <div className="flex items-center justify-between text-sm">
                   <div className="flex items-center gap-2 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {t("totalSalary") || "Tổng Lương"}
                   </div>
                   <span className="font-black text-foreground">{formatCurrency(data.totalSalary || 0)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden shadow-inner border border-border/10">
                   <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-1500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.3)]"
                      style={{ width: `${Math.min(100, Math.max(1, data.totalSalary && data.totalSalary > 0 ? (data.monthlyExpenses / data.totalSalary) * 100 : 0))}%` }}
                   />
                </div>
              </div>
           </CardContent>
        </Card>
        
        {/* Recent Activity List - Premium Glassmorphism */}
        <Card className="col-span-full border-none shadow-xl dark:shadow-2xl bg-card/80 dark:bg-card/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden ring-0">
           <CardHeader className="px-10 py-10 flex flex-row items-center justify-between border-b border-border/50">
              <div>
                 <CardTitle className="text-3xl font-black">{t("recentTransactions")}</CardTitle>
                 <CardDescription className="text-base font-medium">{t("latestActivitiesDesc")}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted text-muted-foreground group">
                 <MoreHorizontal className="h-6 w-6 group-hover:scale-110 transition-transform" />
              </Button>
           </CardHeader>
           <CardContent className="px-10 py-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {data.recentTransactions.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-muted-foreground font-medium italic">
                       {t("noTransactions")}
                    </div>
                 ) : data.recentTransactions.map((transaction, idx) => {
                    const isExpense = transaction.amount < 0 || transaction.type === "EXPENSE"
                    return (
                       <div 
                         key={transaction.id} 
                         className="flex items-center justify-between p-6 rounded-[2rem] bg-muted/50 dark:bg-zinc-900 border border-border/40 shadow-sm transition-all hover:scale-[1.02] hover:shadow-xl hover:border-indigo-500/20 group"
                         style={{ transitionDelay: `${idx * 50}ms` }}
                       >
                          <div className="flex items-center gap-5">
                             <div className={`p-4 rounded-2xl ${!isExpense ? "bg-emerald-500/10 text-emerald-500" : "bg-indigo-500/10 text-indigo-500"} shadow-inner`}>
                                <Activity className="h-6 w-6" />
                             </div>
                             <div className="flex flex-col gap-0.5">
                                <p className="text-sm font-black tracking-tight leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase">{transaction.name}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{formatDate(transaction.date)}</p>
                             </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                             <span className={`text-sm font-black transition-all ${!isExpense ? "text-emerald-500 group-hover:scale-105" : "text-foreground"}`}>
                                {!isExpense ? "+" : ""}{formatCurrency(transaction.amount)}
                             </span>
                             <Badge variant={transaction.status === "Completed" ? "default" : "secondary"} className="rounded-full text-[9px] font-black uppercase tracking-tight h-5 px-2.5">
                                {transaction.status === "Completed" ? t("completed") : t("pending")}
                             </Badge>
                          </div>
                       </div>
                    )
                 })}
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
