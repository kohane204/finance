"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/components/i18n-provider"
import { CalendarDays, Plus, Trash2, CheckCircle2, Clock } from "lucide-react"
import { createBillAction, deleteBillAction, markBillAsPaidAction } from "@/app/actions"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bill, Budget } from "@/lib/types"

export default function BillsClient({ initialBills, budgets }: { initialBills: Bill[], budgets: Budget[] }) {

  const { t, lang } = useI18n()
  const [isPending, setIsPending] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  const handleMarkPaid = async (id: string) => {
     setIsPending(true)
     try {
        await markBillAsPaidAction(id)
        toast.success(lang === 'vi' ? "Hóa đơn đã được thanh toán!" : "Bill paid successfully!")
     } catch (e) {
        toast.error(String(e))
     } finally {
        setIsPending(false)
     }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return
    setIsPending(true)
     try {
        await deleteBillAction(id)
        toast.success(t("deleteSuccess"))
     } catch (e) {
        toast.error(String(e))
     } finally {
        setIsPending(false)
     }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setIsPending(true)
    try {
        await createBillAction(formData)
        toast.success(t("saveSuccess"))
        setOpen(false)
    } catch (e) {
        toast.error(String(e))
    } finally {
        setIsPending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
             {t("bills")}
          </h1>
          <p className="text-muted-foreground text-sm">
             {t("billDesc")}
          </p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-lg h-11 px-6 bg-indigo-600 hover:bg-indigo-700 transition-all hover:scale-105">
              <Plus className="mr-2 h-4 w-4" />
              {t("addBill")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <DialogTitle>{t("addBill")}</DialogTitle>
              <DialogDescription>Add a recurring payment to keep track of.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
               <div className="space-y-2">
                  <Label htmlFor="name">{t("name")}</Label>
                  <Input id="name" name="name" required placeholder="Netflix, Rent..." className="rounded-xl border-muted/20" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">{t("amount")}</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" required className="rounded-xl border-muted/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">{t("dueDate")}</Label>
                    <Input id="dueDate" name="dueDate" type="date" required className="rounded-xl border-muted/20" />
                  </div>
               </div>
               <div className="space-y-2">
                  <Label>{t("frequency")}</Label>
                  <Select name="frequency" defaultValue="MONTHLY">
                    <SelectTrigger className="rounded-xl border-muted/20">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                  <Label>{t("category")}</Label>
                  <Select name="categoryId">
                    <SelectTrigger className="rounded-xl border-muted/20">
                      <SelectValue placeholder="Social / Entertainment" />
                    </SelectTrigger>
                    <SelectContent>
                        {budgets.map(b => (
                            <SelectItem key={b.categoryId} value={b.categoryId}>
                                {b.categoryName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
               </div>
               <DialogFooter>
                  <Button type="submit" disabled={isPending} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700">
                    {isPending ? t("loading") : t("save")}
                  </Button>
               </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         {initialBills.map((bill) => {
            const isOverdue = new Date(bill.dueDate) < new Date() && bill.status === 'UNPAID'
            const amount = parseFloat(bill.amount) * (lang === 'vi' ? 26000 : 1)
            
            return (
                <Card key={bill.id} className="relative overflow-hidden border-none shadow-premium transition-all hover:shadow-premium-xl animate-in zoom-in-95 duration-500">
                   {isOverdue && <div className="absolute top-0 right-0 p-2"><Badge variant="destructive" className="rounded-full shadow-sm">OVERDUE</Badge></div>}
                   <CardHeader className="pb-2">
                      <div className="flex items-center gap-3 mb-2">
                         <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600">
                            <CalendarDays className="size-5" />
                         </div>
                         <div className="flex-1 truncate">
                            <CardTitle className="text-lg truncate">{bill.name}</CardTitle>
                            <CardDescription className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-indigo-500/70">
                               {bill.frequency}
                            </CardDescription>
                         </div>
                      </div>
                   </CardHeader>
                   <CardContent className="space-y-4">
                      <div className="flex flex-col">
                         <span className="text-xs text-muted-foreground">{t("amount")}</span>
                         <span className="text-2xl font-black text-foreground">
                            {amount.toLocaleString()} {lang === 'vi' ? '₫' : '$'}
                         </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-muted/20">
                         <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t("dueDate")}</span>
                            <span className="text-sm font-semibold">{new Date(bill.dueDate).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</span>
                         </div>
                         <Badge variant={isOverdue ? "destructive" : "outline"} className="rounded-xl border-none bg-background shadow-xs">
                            {isOverdue ? t("overdue") : bill.status}
                         </Badge>
                      </div>
                   </CardContent>
                   <CardFooter className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl border-muted/20 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
                        onClick={() => handleDelete(bill.id)}
                        disabled={isPending}
                      >
                         <Trash2 className="size-3.5 mr-1.5" />
                         {t("delete")}
                      </Button>
                      <Button 
                        size="sm" 
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all hover:scale-[1.02]"
                        onClick={() => handleMarkPaid(bill.id)}
                        disabled={isPending}
                      >
                         <CheckCircle2 className="size-3.5 mr-1.5" />
                         {t("markAsPaid")}
                      </Button>
                   </CardFooter>
                </Card>
            )
         })}

         {initialBills.length === 0 && (
             <Card className="col-span-full py-16 flex flex-col items-center justify-center border-dashed bg-muted/5">
                <div className="size-16 rounded-3xl bg-muted/20 flex items-center justify-center mb-4 ring-1 ring-muted/50 shadow-inner">
                   <Clock className="size-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-bold text-muted-foreground">{lang === 'vi' ? "Chưa có hóa đơn nào" : "No bills yet"}</h3>
                <p className="text-sm text-muted-foreground/60">{lang === 'vi' ? "Thêm lời nhắc cho các khoản thanh toán định kỳ của bạn." : "Add reminders for your recurring payments."}</p>
             </Card>
         )}
      </div>
    </div>
  )
}
