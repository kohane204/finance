"use client"

import React, { useState, useEffect } from "react"
import { getPusherClient } from "@/lib/pusher"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, QrCode, Smartphone, CheckCircle, Wifi, Network, ArrowRightLeft } from "lucide-react"
import QRCode from "qrcode"
import { toast } from "sonner"
import NextImage from "next/image"
import { useI18n } from "./i18n-provider"
import { addTransactionAction, addAccountAction, addBudgetAction, addGoalAction, addTransferAction } from "@/app/actions"
import { useRouter } from "next/navigation"

export function AddTransactionModal({ accountId, userId }: { accountId?: string, userId?: string }) {
  const { t, lang } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      setLoading(true)
      try {
        const form = new FormData(e.currentTarget)
        if (accountId) form.append("accountId", accountId)
        if (userId) form.append("userId", userId)
        await addTransactionAction(form)
        toast.success(t("saveSuccess"))
        setIsOpen(false)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("cancel"))
      } finally {
        setLoading(false)
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> {t("addTransaction")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addTransaction")}</DialogTitle>
          <DialogDescription>{t("welcome")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="payee">{t("payee")}</Label>
              <Input id="payee" name="payee" required placeholder={t("placeholderPayee")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                 <Label htmlFor="amount">{t("amount")} ({lang === 'en' ? "$" : "₫"})</Label>
                 <Input id="amount" name="amount" type="number" step="0.01" required placeholder={lang === 'en' ? "-12.99" : "-300000"} />
              </div>
              <div className="grid gap-2">
                 <Label htmlFor="category">{t("category")}</Label>
                 <Input id="category" name="category" placeholder={t("defaultCategory")} required />
              </div>
            </div>
            <DialogFooter className="mt-4">
               <DialogClose asChild>
                 <Button type="button" variant="outline">{t("cancel")}</Button>
               </DialogClose>
               <Button type="submit" disabled={loading}>{loading ? t("loading") : t("save")}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AddAccountModal({ userId }: { userId?: string }) {
  const { t, lang } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      setLoading(true)
      try {
        const form = new FormData(e.currentTarget)
        if (userId) form.append("userId", userId)
        await addAccountAction(form)
        toast.success(t("saveSuccess"))
        setIsOpen(false)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("cancel"))
      } finally {
        setLoading(false)
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> {t("addAccount")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addAccount")}</DialogTitle>
          <DialogDescription>{t("welcome")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-2">
               <Label htmlFor="name">{t("name")}</Label>
               <Input id="name" name="name" required placeholder={t("accountPlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                 <Label htmlFor="type">{t("type")}</Label>
                 <Input id="type" name="type" placeholder={t("accountTypePlaceholder")} required />
              </div>
              <div className="grid gap-2">
                 <Label htmlFor="balance">{t("amount")} ({lang === 'en' ? "$" : "₫"})</Label>
                 <Input id="balance" name="balance" type="number" step="0.01" required placeholder={lang === 'en' ? "1000.00" : "20000000"} />
              </div>
            </div>
            <DialogFooter className="mt-4">
               <DialogClose asChild>
                 <Button type="button" variant="outline">{t("cancel")}</Button>
               </DialogClose>
               <Button type="submit" disabled={loading}>{loading ? t("loading") : t("save")}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AddBudgetModal({ userId, isAdmin = false }: { userId?: string, isAdmin?: boolean }) {
  const { t, lang } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      setLoading(true)
      try {
        const form = new FormData(e.currentTarget)
        if (userId) form.append("userId", userId)
        await addBudgetAction(form)
        toast.success(t("saveSuccess"))
        setIsOpen(false)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("cancel"))
      } finally {
        setLoading(false)
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> {t("addBudget")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addBudget")}</DialogTitle>
          <DialogDescription>{t("welcome")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-2">
               <Label htmlFor="categoryId">{t("category")}</Label>
               <Input id="categoryId" name="categoryId" required placeholder={t("budgetPlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                 <Label htmlFor="amount">{t("amount")} ({lang === 'en' ? "$" : "₫"})</Label>
                 <Input id="amount" name="amount" type="number" step="1" required placeholder={lang === 'en' ? "500" : "1000000"} />
              </div>
              <div className="grid gap-2">
                 <Label htmlFor="period">{t("periodLabel")}</Label>
                 <select name="period" id="period" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="monthly">{t("monthly")}</option>
                    <option value="daily">{t("daily")}</option>
                 </select>
              </div>
            </div>
            
            {isAdmin && (
              <div className="flex items-center gap-2 py-2">
                 <input type="checkbox" id="target_all_budget" name="target" value="all" className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                 <Label htmlFor="target_all_budget" className="text-xs font-semibold text-emerald-600">{t("bulkMode")}</Label>
              </div>
            )}

            <DialogFooter className="mt-4">
               <DialogClose asChild>
                 <Button type="button" variant="outline">{t("cancel")}</Button>
               </DialogClose>
               <Button type="submit" disabled={loading}>{loading ? t("loading") : t("save")}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AddGoalModal({ children, userId, isAdmin = false }: { children?: React.ReactNode, userId?: string, isAdmin?: boolean }) {
  const { t, lang } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      setLoading(true)
      try {
        const form = new FormData(e.currentTarget)
        if (userId) form.append("userId", userId)
        await addGoalAction(form)
        toast.success(t("saveSuccess"))
        setIsOpen(false)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("cancel"))
      } finally {
        setLoading(false)
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> {t("addGoal")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addGoal")}</DialogTitle>
          <DialogDescription>{t("welcome")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-2">
               <Label htmlFor="name">{t("name")}</Label>
               <Input id="name" name="name" required placeholder={t("goalPlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                 <Label htmlFor="targetAmount">{t("amount")} ({lang === 'en' ? "$" : "₫"})</Label>
                 <Input id="targetAmount" name="targetAmount" type="number" step="1" required placeholder={lang === 'en' ? "10000" : "50000000"} />
              </div>
              <div className="grid gap-2">
                 <Label htmlFor="deadline">{t("deadline")}</Label>
                 <Input id="deadline" name="deadline" type="date" required />
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 py-2">
                 <input type="checkbox" id="target_all_goal" name="target" value="all" className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                 <Label htmlFor="target_all_goal" className="text-xs font-semibold text-emerald-600">{t("bulkMode")}</Label>
              </div>
            )}

            <DialogFooter className="mt-4">
               <DialogClose asChild>
                 <Button type="button" variant="outline">{t("cancel")}</Button>
               </DialogClose>
               <Button type="submit" disabled={loading}>{loading ? t("loading") : t("save")}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface AccountData {
  id: string;
  name: string;
  balance: string;
  bankId?: string | null;
  accountNumber?: string | null;
}

export function AddTransferModal({ accounts, userId }: { accounts: AccountData[], userId?: string }) {
  const { t, lang, formatCurrency } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      setLoading(true)
      try {
        const form = new FormData(e.currentTarget)
        if (userId) form.append("userId", userId)
        await addTransferAction(form)
        toast.success(t("saveSuccess"))
        setIsOpen(false)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("cancel"))
      } finally {
        setLoading(false)
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ArrowRightLeft className="h-4 w-4" /> {t("transfer")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("transfer")}</DialogTitle>
          <DialogDescription>{t("transferDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                  <Label htmlFor="fromAccountId">{t("fromAccount")}</Label>
                  <select name="fromAccountId" id="fromAccountId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(parseFloat(a.balance))})
                      </option>
                    ))}
                  </select>
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="toAccountId">{t("toAccount")}</Label>
                  <select name="toAccountId" id="toAccountId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(parseFloat(a.balance))})
                      </option>
                    ))}
                  </select>
              </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="amount">{t("amount")} ({lang === 'en' ? "$" : "₫"})</Label>
                <Input id="amount" name="amount" type="number" step="0.01" required placeholder={lang === 'en' ? "100.00" : "500000"} />
            </div>
            <DialogFooter className="mt-4">
               <DialogClose asChild>
                 <Button type="button" variant="outline">{t("cancel")}</Button>
               </DialogClose>
               <Button type="submit" disabled={loading}>{loading ? t("loading") : t("save")}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function LinkBankQRModal({ userId }: { userId?: string }) {
  const router = useRouter()
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1) // 1: Info/IP, 2: QR, 3: Done
  const [loading, setLoading] = useState(false)
  const [qrUrl, setQrUrl] = useState<string>("")
  const [customHost, setCustomHost] = useState("") 

  const generateLinkQR = async () => {
    setLoading(true)
    try {
      const host = customHost ? `http://${customHost}:3000` : window.location.origin
      const mobileUrl = `${host}/mobile/link/${userId || "current"}`
      const dataUrl = await QRCode.toDataURL(mobileUrl, { 
        width: 400, 
        margin: 2, 
        color: { dark: "#059669", light: "#ffffff" } 
      })
      setQrUrl(dataUrl)
      setStep(2)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("generationFailed"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (step === 2 && userId) {
      const pusher = getPusherClient()
      if (!pusher) return
      
      const channel = pusher.subscribe(`user-${userId}`)
      channel.bind('invalidate', (data: { type: string, data?: { name?: string } }) => {
        if (data.type === "account") {
          setStep(3);
          router.refresh();
          toast.success(t("linkSuccess").replace("{name}", data.data?.name || ""));
        }
      })

      return () => {
         pusher.unsubscribe(`user-${userId}`)
      }
    }
  }, [step, userId, router, t])

  const handleSimulateFinish = async () => {
    setLoading(true)
    try {
       const form = new FormData()
       if (userId) form.append("userId", userId)
       form.append("name", "Vietcombank")
       form.append("type", "Credit Card")
       form.append("balance", "1000")
       form.append("accountNumber", "1028776510")
       form.append("bankId", "Vietcombank")
       await addAccountAction(form)
       setStep(3)
       toast.success(t("saveSuccess"))
    } catch (e: unknown) {
       toast.error(e instanceof Error ? e.message : t("cancel"))
    } finally {
       setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if(!v) setStep(1); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
          <QrCode className="h-4 w-4" /> {t("linkBank")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <Smartphone className="h-5 v-5 text-emerald-500" />
             {step === 3 ? t("connected") : t("smartBankLink")}
          </DialogTitle>
          <DialogDescription>
             {(step === 1 || step === 2) && t("bankLinkDesc")}
             {step === 3 && t("mobileAuthSuccess")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 min-h-[350px]">
          {step === 1 && (
             <div className="flex flex-col items-center gap-6 w-full animate-in fade-in duration-500">
                <div className="bg-emerald-500/5 p-8 rounded-full border border-emerald-500/20 shadow-inner">
                   <QrCode className="h-20 w-20 text-emerald-500" />
                </div>
                
                <div className="space-y-4 w-full">
                   <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-xs text-balance">
                      <Wifi className="h-4 w-4 shrink-0" />
                      <span>{t("ensureWifi")}</span>
                   </div>

                   <div className="grid gap-2">
                      <Label htmlFor="ip" className="text-xs font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-widest">
                         <Network className="h-3 w-3" /> {t("computerIp")}
                      </Label>
                      <input 
                        id="ip" 
                        placeholder="e.g. 192.168.1.15" 
                        value={customHost} 
                        onChange={(e) => setCustomHost(e.target.value)} 
                        className="flex h-10 w-full rounded-xl border border-emerald-500/20 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 transition-all"
                      />
                      <p className="text-[10px] text-muted-foreground italic">
                         {t("ipHelp")}
                      </p>
                   </div>
                </div>
             </div>
          )}
          {step === 2 && qrUrl && (
             <div className="relative p-2 bg-white rounded-xl shadow-lg border border-emerald-100 mb-4 transition-all duration-300">
                <NextImage src={qrUrl} alt="Bank Link QR" width={224} height={224} className="w-56 h-56" unoptimized />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md">
                   <Smartphone className="h-8 w-8 text-emerald-600" />
                </div>
             </div>
          )}
          {step === 3 && (
             <div className="bg-emerald-500/10 p-8 rounded-full border-2 border-emerald-500 mb-4 transition-all duration-500">
                <CheckCircle className="h-20 w-20 text-emerald-600" />
             </div>
          )}
        </div>

        <DialogFooter className="sm:justify-center gap-2">
           {step === 1 && (
             <Button onClick={generateLinkQR} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
               {loading ? t("generating") : t("generateQr")}
             </Button>
           )}
           {step === 2 && (
             <Button onClick={handleSimulateFinish} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
               {loading ? t("authorizing") : t("simulatePhoneScan")}
             </Button>
           )}
           {step === 3 && (
             <DialogClose asChild>
               <Button className="w-full bg-emerald-600">{t("cancel")}</Button>
             </DialogClose>
           )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ViewVietQRModal({ account }: { account: { id: string, name: string, balance: string, bankId?: string, accountNumber?: string, userId: string } }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [qrUrl, setQrUrl] = useState<string>("")
  const { t } = useI18n()

  const generateVietQR = async () => {
    setLoading(true)
    try {
      const bankId = account.bankId || 'Vietcombank'
      const accNo = account.accountNumber || '123456789'
      const imageUrl = `https://img.vietqr.io/image/${bankId}-${accNo}-compact2.png?amount=0&addInfo=Thanh%20toan%20Finova`
      setQrUrl(imageUrl)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("generationFailed"))
    } finally {
      setLoading(false)
    }
  }

  const simulateIncomingPayment = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/webhook/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber: account.accountNumber,
          amount: 500000, 
          description: "Chuyển tiền qua QR",
          bankId: account.bankId
        })
      })
      if (response.ok) {
        toast.success(t("paymentReceived"))
      } else {
        throw new Error(t("simulationFailed"))
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("cancel"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if(v) generateVietQR(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">{account.bankId || 'VietQR'}</DialogTitle>
          <DialogDescription className="text-center">{t("scanToDeposit")}</DialogDescription>
        </DialogHeader>
        <div className="bg-white p-4 rounded-xl border-2 border-emerald-100 flex flex-col items-center gap-4 min-h-[300px]">
           {qrUrl ? (
             <NextImage src={qrUrl} alt="VietQR" width={256} height={256} className="w-full aspect-square rounded-lg shadow-sm" unoptimized />
           ) : (
             <div className="w-full aspect-square bg-muted animate-pulse rounded-lg" />
           )}
           <div className="text-center">
              <p className="font-bold text-lg">{account.name}</p>
              <p className="text-sm text-muted-foreground font-mono">{account.accountNumber}</p>
           </div>
        </div>
        <DialogFooter className="flex-col gap-2">
           <Button onClick={simulateIncomingPayment} disabled={loading} variant="outline" className="w-full border-emerald-200">
              {loading ? t("waiting") : t("simulatePay").replace("{amount}", "500.000₫")}
           </Button>
           <DialogClose asChild>
              <Button className="w-full bg-emerald-600">{t("cancel")}</Button>
           </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
