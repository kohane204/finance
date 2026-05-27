"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/components/i18n-provider"
import { TrendingUp, TrendingDown, Target, Brain, ShieldCheck, AlertTriangle } from "lucide-react"
import { DashboardStats, Budget, Goal } from "@/lib/types"

export default function RecommendationsClient({ stats, budgets, goals }: { 
  stats: DashboardStats | null, 
  budgets: Budget[], 
  goals: Goal[] 
}) {

  const { t, lang } = useI18n()

  // Business Logic for tips
  const tips = []

  // Expense Trend
  if (stats && stats.diff.expense > 10) {
    tips.push({
      title: lang === 'vi' ? "Cắt giảm chi tiêu" : "Cut your spending",
      desc: lang === 'vi' 
        ? `Chi tiêu của bạn đã tăng ${stats.diff.expense.toFixed(1)}% so với tháng trước. Hãy cân nhắc xem lại các khoản không thiết yếu.` 
        : `Your spending increased by ${stats.diff.expense.toFixed(1)}% compared to last month. Consider reviewing non-essential items.`,
      icon: TrendingDown,
      color: "bg-orange-500",
      urgent: true
    })
  }

  // Savings Tip
  const income = stats?.currentMonth.income || 0
  const expense = stats?.currentMonth.expense || 0
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0

  if (savingsRate < 20 && income > 0) {
    tips.push({
      title: lang === 'vi' ? "Tăng tỷ lệ tiết kiệm" : "Boost savings rate",
      desc: lang === 'vi' 
        ? "Tỷ lệ tiết kiệm hiện tại dưới 20%. Hãy thử áp dụng quy tắc 50/30/20 (50% nhu cầu, 30% mong muốn, 20% học tập/tiết kiệm)."
        : "Current savings rate is under 20%. Try the 50/30/20 rule (50% needs, 30% wants, 20% savings/knowledge).",
      icon: Brain,
      color: "bg-blue-500",
      urgent: false
    })
  } else if (savingsRate >= 20) {
    tips.push({
      title: lang === 'vi' ? "Tiết kiệm xuất sắc!" : "Excellent savings!",
      desc: lang === 'vi' 
        ? "Tỷ lệ tiết kiệm của bạn rất tốt. Bạn nên cân nhắc chuyển một phần vào quỹ đầu tư dài hạn."
        : "Your savings rate is great. Consider moving a portion into long-term investments.",
      icon: ShieldCheck,
      color: "bg-emerald-500",
      urgent: false
    })
  }

  // Budget Check
  const overBudgetCat = budgets.find((b) => b.spent >= parseFloat(b.amount))
  if (overBudgetCat) {
    tips.push({
      title: lang === 'vi' ? "Vượt ngân sách" : "Over Budget Alert",
      desc: lang === 'vi' 
        ? `Hạng mục '${overBudgetCat.categoryName}' đã vượt ngân sách. Hãy điều chỉnh kế hoạch chi tiêu cho thời gian còn lại của tháng.`
        : `Item '${overBudgetCat.categoryName}' is over budget. Adjust your spending plan for the rest of the month.`,
      icon: AlertTriangle,
      color: "bg-rose-500",
      urgent: true
    })
  }

  // Goal Progress
  const laggingGoal = goals.find((g) => (parseFloat(g.currentAmount) / parseFloat(g.targetAmount)) < 0.2)
  if (laggingGoal) {
    tips.push({
      title: lang === 'vi' ? "Hoàn thành mục tiêu" : "Stay on Track",
      desc: lang === 'vi' 
        ? `Mục tiêu '${laggingGoal.name}' tiến triển khá chậm. Hãy xem xét trích thêm một phần nhỏ mỗi ngày.`
        : `Goal '${laggingGoal.name}' is progressing slowly. Try allocating a small amount daily.`,
      icon: Target,
      color: "bg-purple-500",
      urgent: false
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
         <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
            {t("recommendations")}
         </h1>
         <p className="text-muted-foreground text-sm">
            {t("recommendationDesc")}
         </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {tips.map((tip, idx) => (
        <Card key={idx} className="overflow-hidden border-none shadow-premium transition-all hover:shadow-premium-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={`h-2 ${tip.color}`} />
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className={`p-2 rounded-xl text-white ${tip.color} shadow-lg ring-4 ring-background`}>
              <tip.icon className="size-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">{tip.title}</CardTitle>
              {tip.urgent && <Badge variant="destructive" className="mt-1 shadow-sm uppercase tracking-wider text-[10px]">{lang === 'vi' ? 'Khẩn cấp' : 'Urgent'}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-muted-foreground leading-relaxed">
              {tip.desc}
            </p>
          </CardContent>
        </Card>
      ))}

      {tips.length === 0 && (
        <Card className="col-span-full py-12 flex flex-col items-center justify-center border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto p-4 rounded-full bg-muted/20 mb-4 ring-2 ring-muted/50">
              <ShieldCheck className="size-12 text-muted-foreground" />
            </div>
            <CardTitle>{lang === 'vi' ? 'Mọi thứ vẫn ổn!' : 'Everything looks great!'}</CardTitle>
            <CardDescription>
               {lang === 'vi' ? 'Dữ liệu của bạn cho thấy bạn đang quản lý tài chính rất tốt.' : 'Your data suggests you are managing your finances very well.'}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      </div>
    </div>
  )
}
