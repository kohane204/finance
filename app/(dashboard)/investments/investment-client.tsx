"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useI18n } from "@/components/i18n-provider"
import { Badge } from "@/components/ui/badge"
import { Calculator, TrendingUp, PieChart, ShieldCheck } from "lucide-react"
import { DashboardStats } from "@/lib/types"

export default function InvestmentClient({ stats }: { stats: DashboardStats | null }) {

  const { t, lang } = useI18n()
  const [initialAmount, setInitialAmount] = React.useState(1000)
  const [monthlyContribution, setMonthlyContribution] = React.useState(100)
  const [years, setYears] = React.useState(10)
  const [returnRate, setReturnRate] = React.useState(7)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", {
      style: "currency",
      currency: lang === "vi" ? "VND" : "USD",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const totalValue = React.useMemo(() => {
    let total = initialAmount
    const monthlyRate = returnRate / 100 / 12
    const totalMonths = years * 12
    
    for (let i = 0; i < totalMonths; i++) {
      total = (total + monthlyContribution) * (1 + monthlyRate)
    }
    return total
  }, [initialAmount, monthlyContribution, years, returnRate])

  const income = stats?.currentMonth.income || 0
  const recommendedMonthly = Math.floor(income * 0.1)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-500 to-sky-500 bg-clip-text text-transparent">
           {t("investmentAdvice")}
        </h1>
        <p className="text-muted-foreground text-sm flex items-center gap-2">
           {t("investmentDesc")}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
      <Card className="shadow-premium border-none">
        <CardHeader className="bg-muted/10 p-6">
          <div className="flex items-center gap-3">
             <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-lg">
                <Calculator className="size-5" />
             </div>
             <div>
                <CardTitle className="text-xl">{t("investmentCalculator")}</CardTitle>
                <CardDescription>{t("compoundInterestDesc")}</CardDescription>
             </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 px-8">
           <div className="space-y-2">
              <Label htmlFor="initial" className="text-sm font-semibold">{t("initialInvestment")} (₫)</Label>
              <Input 
                id="initial" 
                type="number" 
                value={initialAmount} 
                onChange={(e) => setInitialAmount(Number(e.target.value))}
                className="bg-muted/20 border-none rounded-xl"
              />
           </div>

           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <Label className="text-sm font-semibold">{t("monthlyContribution")} (₫)</Label>
                 <span className="text-xs font-medium text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">
                    {t("recommendationLabel")}: {recommendedMonthly.toLocaleString()}
                 </span>
              </div>
              <Slider 
                value={[monthlyContribution]} 
                max={5000} 
                step={50} 
                onValueChange={(v) => setMonthlyContribution(v[0])} 
              />
              <div className="text-right font-bold text-lg">{monthlyContribution.toLocaleString()}</div>
           </div>

           <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t("years")}</Label>
                <Slider value={[years]} max={30} step={1} onValueChange={(v) => setYears(v[0])} />
                <div className="text-center font-medium mt-1">{years} {t("years")}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t("expectedReturn")} (%)</Label>
                <Slider value={[returnRate]} max={20} step={0.5} onValueChange={(v) => setReturnRate(v[0])} />
                <div className="text-center font-medium mt-1">{returnRate}%</div>
              </div>
           </div>
        </CardContent>
        <CardFooter className="bg-muted/5 flex flex-col items-center justify-center py-8 rounded-b-xl">
           <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] font-semibold mb-2">{t("projectedValue")}</p>
           <h2 className="text-4xl md:text-5xl font-black text-primary drop-shadow-sm font-sans">
              {formatCurrency(totalValue)}
           </h2>
        </CardFooter>
      </Card>

      <div className="space-y-6">
        <Card className="shadow-premium border-none border-l-4 border-l-emerald-500 transition-all hover:scale-[1.01]">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/5">{t("riskLow")}</Badge>
              <ShieldCheck className="size-4 text-emerald-500" />
            </div>
            <CardTitle className="text-lg flex items-center gap-2">
               {t("savingsAccountHeader")}
            </CardTitle>
            <CardDescription>{t("savingsAccountDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-snug">
               {t("savingsAccountAdv")}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-premium border-none border-l-4 border-l-sky-500 transition-all hover:scale-[1.01]">
          <CardHeader>
             <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-sky-500 border-sky-500/20 bg-sky-500/5">{t("riskMedium")}</Badge>
                <TrendingUp className="size-4 text-sky-500" />
             </div>
             <CardTitle className="text-lg">{t("indexFundsHeader")}</CardTitle>
             <CardDescription>{t("indexFundsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-snug">
               {t("indexFundsAdv")}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-premium border-none border-l-4 border-l-violet-500 transition-all hover:scale-[1.01]">
          <CardHeader>
             <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-violet-500 border-violet-500/20 bg-violet-500/5">{t("riskHigh")}</Badge>
                <PieChart className="size-4 text-violet-500" />
             </div>
            <CardTitle className="text-lg">{t("diversifiedSharesHeader")}</CardTitle>
            <CardDescription>{t("diversifiedSharesDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-muted-foreground leading-snug">
                {t("diversifiedSharesAdv")}
             </p>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}

