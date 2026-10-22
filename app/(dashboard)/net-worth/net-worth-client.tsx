"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/components/i18n-provider"
import { Wallet, Landmark, PiggyBank, Receipt, TrendingUp, TrendingDown, Scale, ShieldCheck, PieChart } from "lucide-react"
import { Account, Goal, Loan, DashboardStats } from "@/lib/types"

export default function NetWorthClient({ accounts, goals, loans }: { 
    accounts: Account[], 
    goals: Goal[], 
    loans: Loan[], 
    stats?: DashboardStats | null 
}) {

  const { t, formatCurrency } = useI18n()

  // Asset Calculation
  const accountAssets = accounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0)
  const goalAssets = goals.reduce((sum, g) => sum + (parseFloat(g.currentAmount) || 0), 0)
  
  const totalAssets = accountAssets + goalAssets
  
  // Liability Calculation
  const totalLiabilities = loans
    .filter(l => l.status !== 'REPAID' && l.status !== 'CANCELLED')
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0)

  const netWorthValue = totalAssets - totalLiabilities
  const assetPercentage = totalAssets > 0 ? (totalAssets / (totalAssets + totalLiabilities)) * 100 : 0

  return (
    <div className="space-y-10 pb-10 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
           {t("netWorth")}
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
           {t("netWorthDesc")}
        </p>
      </div>

      <Card className="border-none shadow-[0_32px_64px_-16px_rgba(79,70,229,0.2)] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white overflow-hidden relative min-h-[300px] flex flex-col justify-center rounded-[2rem]">
         <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
            <Scale className="size-64" />
         </div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
         <CardHeader className="relative z-10 space-y-4 px-10">
            <Badge variant="secondary" className="w-fit bg-white/20 text-white backdrop-blur-md border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">{t("totalNetWorth") || "Total Net Worth"}</Badge>
            <div className="text-6xl md:text-8xl font-black tracking-tighter mt-2 drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
               {formatCurrency(netWorthValue)}
            </div>
         </CardHeader>
         <CardContent className="relative z-10 pt-6 px-10">
            <div className="flex items-center gap-3 text-white/90 bg-white/10 backdrop-blur-xl border border-white/20 w-fit px-5 py-3 rounded-2xl shadow-xl">
               <div className="p-1.5 bg-emerald-400 rounded-full">
                  <ShieldCheck className="size-4 text-emerald-900" />
               </div>
               <span className="text-sm font-bold tracking-tight">{t("financialHealthStrong")}</span>
            </div>
         </CardContent>
         <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/10">
            <div className="h-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] transition-all duration-1000" style={{ width: `${Math.min(Math.max(assetPercentage, 0), 100)}%` }} />
         </div>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
         {/* Assets Card */}
         <Card className="border border-border/50 shadow-premium-lg bg-emerald-500/[0.02] backdrop-blur-sm rounded-[1.5rem] transition-all hover:translate-y-[-4px] hover:shadow-2xl">
            <CardHeader className="p-8">
               <div className="flex items-center justify-between mb-6">
                  <div className="p-4 rounded-[1.25rem] bg-emerald-500 text-white shadow-[0_12px_24px_-8px_rgba(16,185,129,0.5)]">
                     <TrendingUp className="size-7" />
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{t("assets")}</div>
               </div>
               <CardTitle className="text-4xl font-black text-emerald-700">
                  {formatCurrency(totalAssets)}
               </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
               <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-border/50 shadow-sm transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10">
                     <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                           <Landmark className="size-5" />
                        </div>
                        <span className="text-sm font-semibold text-muted-foreground">{t("bankAccounts")}</span>
                     </div>
                     <span className="text-base font-bold text-foreground">{formatCurrency(accountAssets)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-border/50 shadow-sm transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10">
                     <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                           <PiggyBank className="size-5" />
                        </div>
                        <span className="text-sm font-semibold text-muted-foreground">{t("savingsAndGoals")}</span>
                     </div>
                     <span className="text-base font-bold text-foreground">{formatCurrency(goalAssets)}</span>
                  </div>
               </div>
            </CardContent>
         </Card>

         {/* Liabilities Card */}
         <Card className="border border-border/50 shadow-premium-lg bg-rose-500/[0.02] backdrop-blur-sm rounded-[1.5rem] transition-all hover:translate-y-[-4px] hover:shadow-2xl">
            <CardHeader className="p-8">
               <div className="flex items-center justify-between mb-6">
                  <div className="p-4 rounded-[1.25rem] bg-rose-500 text-white shadow-[0_12px_24px_-8px_rgba(244,63,94,0.5)]">
                     <TrendingDown className="size-7" />
                  </div>
                  <div className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{t("liabilities")}</div>
               </div>
               <CardTitle className="text-4xl font-black text-rose-700">
                  {formatCurrency(totalLiabilities)}
               </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
               <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-border/50 shadow-sm transition-colors hover:bg-rose-50/50 dark:hover:bg-rose-900/10">
                     <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                           <Receipt className="size-5" />
                        </div>
                        <span className="text-sm font-semibold text-muted-foreground">{t("outstandingLoans")}</span>
                     </div>
                     <span className="text-base font-bold text-foreground">{formatCurrency(totalLiabilities)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-border/50 shadow-sm opacity-40 grayscale">
                     <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                           <Wallet className="size-5" />
                        </div>
                        <span className="text-sm font-semibold text-muted-foreground">{t("creditCardDebt")}</span>
                     </div>
                     <span className="text-base font-bold text-foreground">{formatCurrency(0)}</span>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>

      <Card className="border border-border/50 shadow-premium-lg bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-950 dark:to-black rounded-[2rem] overflow-hidden">
         <CardHeader className="p-8 border-b border-border/50">
            <CardTitle className="text-2xl font-black flex items-center gap-3">
               <PieChart className="size-6 text-indigo-500" />
               {t("composition")}
            </CardTitle>
            <CardDescription className="text-base font-medium">{t("compositionDesc")}</CardDescription>
         </CardHeader>
         <CardContent className="p-10">
            <div className="relative pt-4">
               <div className="flex justify-between mb-4 text-xs font-black uppercase tracking-[0.2em]">
                  <span className="text-emerald-500">{t("assets")}</span>
                  <span className="text-rose-500">{t("liabilities")}</span>
               </div>
               <div className="group flex h-24 w-full rounded-[2rem] overflow-hidden shadow-2xl relative transition-all hover:scale-[1.01]">
                  <div className="bg-emerald-500 transition-all duration-1000 ease-in-out relative group" style={{ width: `${assetPercentage}%` }}>
                     <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     {assetPercentage > 15 && (
                        <div className="absolute inset-0 flex items-center justify-center font-black text-white drop-shadow-md text-lg">
                           {assetPercentage.toFixed(0)}%
                        </div>
                     )}
                  </div>
                  <div className="bg-rose-500 transition-all duration-1000 ease-in-out relative group" style={{ width: `${100 - assetPercentage}%` }}>
                     <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     {(100 - assetPercentage) > 15 && (
                        <div className="absolute inset-0 flex items-center justify-center font-black text-white drop-shadow-md text-lg">
                           {(100 - assetPercentage).toFixed(0)}%
                        </div>
                     )}
                  </div>
               </div>
               <div className="mt-12 flex flex-col items-center gap-4">
                  <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{t("debtRatio")}</div>
                  <div className="px-10 py-5 rounded-[2rem] bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/30 text-3xl font-black text-indigo-600 dark:text-indigo-400 shadow-premium-sm ring-4 ring-indigo-500/5">
                     {(100 - assetPercentage).toFixed(1)}%
                  </div>
               </div>
            </div>
         </CardContent>
      </Card>
    </div>
  )
}
