import React from "react"
import { Target, Plus, Rocket, Trash2, CheckCircle } from "lucide-react"
import { deleteGoalAction, updateGoalProgressAction, completeGoalWithPiggyBankAction } from "@/app/actions"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getUser, getGoals, getManagedUserId, getAllGoals, getUserById, syncPiggyBankGoal } from "@/lib/data"
import { redirect } from "next/navigation"

import { AddGoalModal } from "@/components/add-modals"
import { getI18n } from "@/lib/i18n/server"

interface Goal {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string | number | Date | null;
  userId: string;
  color?: string | null;
  icon?: string | null;
  user?: { name?: string | null, email?: string | null } | null;
}

export default async function GoalsPage() {
  const { t, lang, formatCurrency, formatDate } = await getI18n()
  const user = await getUser()
  if (!user) return redirect("/login")

  const isAdmin = (user as { role?: string }).role === 'admin'
  const targetId = isAdmin ? await getManagedUserId() : user.id
  const isAllUsers = isAdmin && !targetId

  let goals: Goal[] = []
  let contextUser: { name?: string | null, email?: string | null } | null = null
  
  const syncUserId = targetId || user.id
  
  // Always re-sync Piggy Bank to pick up any new month carryover
  if (!isAllUsers) {
    await syncPiggyBankGoal(syncUserId, lang as 'vi' | 'en')
  }
  
  if (isAllUsers) {
    goals = await getAllGoals()
  } else {
    goals = await getGoals(syncUserId)
    if (isAdmin && targetId) contextUser = await getUserById(targetId)
  }

  const piggyBankNameVi = "Tiền heo đất (Piggy Bank)"
  const piggyBankNameEn = "Piggy Bank"
  const piggyBankGoal = goals.find(g => g.name === piggyBankNameVi || g.name === piggyBankNameEn)
  const piggyBankAmount = piggyBankGoal ? parseFloat(piggyBankGoal.currentAmount || "0") : 0
  
  const regularGoals = goals.filter(g => g.name !== piggyBankNameVi && g.name !== piggyBankNameEn)

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("goals")}</h1>
          {isAllUsers ? (
            <p className="text-muted-foreground">{t("userOverview")}</p>
          ) : (
            <p className="text-muted-foreground">
              {contextUser ? t("goalOf").replace("{name}", contextUser.name || contextUser.email || "") : t("welcome")}
            </p>
          )}
        </div>
        <AddGoalModal isAdmin={isAdmin} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(!isAllUsers || piggyBankGoal) && (
           <Card className="hover:shadow-md transition-all border-none relative overflow-hidden text-white shadow-md md:col-span-full xl:col-span-1 group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-90 transition-transform duration-700 ease-in-out" />
              <div className="absolute top-[10%] right-[5%] opacity-20 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12">
                 <Rocket className="w-24 h-24" />
              </div>
              <CardHeader className="relative pb-2 z-10 text-white">
                 <CardTitle className="text-xl font-bold flex items-center gap-2">
                    {lang === 'vi' ? 'Tổng quỹ lưu trữ' : 'Reserve Pool'}
                 </CardTitle>
                 <CardDescription className="text-white/80 font-medium">
                   {lang === 'vi' ? 'Tiền dư cộng dồn các tháng trước có thể dùng' : 'Carry-over surplus available to use'}
                 </CardDescription>
              </CardHeader>
              <CardContent className="relative pb-6 z-10 flex flex-col gap-2">
                 <div className="text-4xl font-extrabold tracking-tight">{formatCurrency(piggyBankAmount)}</div>
                 <p className="text-sm font-semibold bg-white/20 w-fit px-3 py-1 rounded-full">{lang === 'vi' ? 'Sẵn sàng phân bổ' : 'Ready to allocate'}</p>
              </CardContent>
           </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {regularGoals.map((goal) => {
          const target = parseFloat(goal.targetAmount)
          const current = parseFloat(goal.currentAmount)
          const percentage = target > 0 ? (current / target) * 100 : 0
          
          return (
            <Card key={goal.id} className="hover:shadow-md transition-all flex flex-col justify-between backdrop-blur-sm relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${goal.icon}`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full bg-muted shadow-inner ${goal.color}`}>
                    <Target className="h-5 w-5" />
                  </div>
                    <div>
                      <CardTitle className="text-lg">{goal.name}</CardTitle>
                      <CardDescription>{t("goals")}: {formatCurrency(target)}</CardDescription>
                       {isAllUsers && goal.user && (
                        <Badge variant="secondary" className="w-fit text-[10px] mt-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                           {goal.user.name || goal.user.email}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {(isAdmin || goal.userId === user.id) && (
                    <form action={async () => {
                      "use server"
                      await deleteGoalAction(goal.id)
                    }}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500" type="submit">
                         <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  )}
                </CardHeader>
              <CardContent className="pb-2">
                <div className="flex justify-between items-baseline mb-2">
                  <div className="text-3xl font-bold">{formatCurrency(current)}</div>
                  <div className="text-sm font-medium text-muted-foreground">{percentage.toFixed(1)}%</div>
                </div>
                <Progress 
                  value={percentage > 100 ? 100 : percentage} 
                  className="h-3 w-full"
                  indicatorClassName={goal.icon || undefined}
                />
                
                {(!isAllUsers && percentage < 100) && (
                  <form action={updateGoalProgressAction} className="mt-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input type="hidden" name="goalId" value={goal.id} />
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                          {t("currencySymbol")}
                        </span>
                        <input 
                          name="amount" 
                          type="number" 
                          step="0.01"
                          required
                          placeholder="0.00"
                          className="w-full bg-muted/50 border border-border h-9 rounded-md pl-6 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <Button type="submit" size="sm" className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-1" /> {t("add")}
                      </Button>
                    </div>
                  </form>
                )}
                
                {(!isAllUsers && percentage >= 100) && (
                  <div className="mt-4 flex items-center justify-center p-2 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-emerald-600 font-medium text-sm gap-2">
                     <CheckCircle className="h-4 w-4" />
                     {lang === 'vi' ? 'Đã hoàn thành mục tiêu!' : 'Goal Completed!'}
                  </div>
                )}
                
                {(!isAllUsers && percentage < 100 && (goal.name !== piggyBankNameVi && goal.name !== piggyBankNameEn) && piggyBankAmount >= (target - current)) && (
                   <form action={async () => {
                     "use server"
                     await completeGoalWithPiggyBankAction(goal.id)
                   }} className="mt-2 text-center w-full">
                     <Button type="submit" size="sm" variant="outline" className="w-full border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 focus:ring-emerald-500 transition-all duration-300 gap-1 font-medium bg-emerald-50/50">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        {t("completeWithPiggyBank") || "Hoàn thành bằng Heo đất"}
                     </Button>
                   </form>
                )}
              </CardContent>
              <CardFooter className="pt-2 text-xs text-muted-foreground flex justify-between">
                <span>{t("deadline")}: {formatDate(goal.deadline as string)}</span>
                <span>{formatCurrency(Math.max(0, target - current))} {t("remaining")}</span>
              </CardFooter>
            </Card>
          )
        })}
        
        {!isAllUsers && (
          <Card className="hover:shadow-md transition-all flex flex-col items-center justify-center min-h-[250px] border-dashed text-center">
              <Rocket className="h-10 w-10 text-muted-foreground mb-4" />
              <div className="font-semibold text-lg mb-1">{t("createNewGoal") || "Create New Goal"}</div>
              <p className="text-muted-foreground text-sm max-w-[200px] mb-4">{t("goalIntro") || "Set a new milestone to achieve your financial dreams."}</p>
              <AddGoalModal isAdmin={isAdmin}>
                 <Button variant="outline">{t("startNow") || "Start Now"}</Button>
              </AddGoalModal>
          </Card>
        )}
      </div>
    </div>
  )
}

