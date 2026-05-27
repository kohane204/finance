"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Bell, Wallet, Loader2 } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { updateUserAction } from "@/app/actions"
import { toast } from "sonner"

interface SettingsUser {
  name?: string | null;
  email?: string | null;
  currency?: string | null;
  budgetAlerts?: boolean;
  monthlySummary?: boolean;
}

export default function SettingsClient({ user }: { user: SettingsUser }) {
  const { t, lang, setLang } = useI18n()
  const [loading, setLoading] = useState(false)
  
  const [name, setName] = useState(user.name || "")
  const [email, setEmail] = useState(user.email || "")
  const [currency, setCurrency] = useState(user.currency || (lang === 'en' ? "USD" : "VND"))
  const [budgetAlerts, setBudgetAlerts] = useState(user.budgetAlerts !== false)
  const [monthlySummary, setMonthlySummary] = useState(user.monthlySummary !== false)

  // Sync currency with language changes if it's an automatic switch
  React.useEffect(() => {
    if (lang === 'en' && currency === 'VND') setCurrency('USD')
    if (lang === 'vi' && currency === 'USD') setCurrency('VND')
  }, [lang])

  const handleSave = async () => {
    setLoading(true)
    const formData = new FormData()
    formData.append("name", name)
    formData.append("email", email)
    formData.append("currency", currency)
    formData.append("budgetAlerts", String(budgetAlerts))
    formData.append("monthlySummary", String(monthlySummary))

    try {
      await updateUserAction(formData)
      toast.success(t("saveSuccess"))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("operationError"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-gradient">{t("settings")}</h1>
        <p className="text-muted-foreground">{t("profileDesc")}</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md ring-1 ring-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> {t("profileSettings")}</CardTitle>
            <CardDescription>{t("profileDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">{t("fullName")}</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="bg-background/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">{t("email")}</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50 border-border/50"
              />
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto shadow-lg shadow-primary/20">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("saveChanges")}
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md ring-1 ring-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> {t("financialPrefs")}</CardTitle>
            <CardDescription>{t("financialDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-left">
              <Label className="text-sm font-semibold mb-2 block">{t("language")}</Label>
              <Select value={lang} onValueChange={(v) => {
                const newLang = v as any;
                setLang(newLang);
                if (newLang === 'en') setCurrency('USD');
                if (newLang === 'vi') setCurrency('VND');
              }}>
                <SelectTrigger className="max-w-[180px] bg-background/50 border-border/50">
                  <SelectValue placeholder={t("language")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("english")}</SelectItem>
                  <SelectItem value="vi">{t("vietnamese")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 text-left">
              <Label className="text-sm font-semibold mb-2 block">{t("defaultCurrency")}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="max-w-[180px] bg-background/50 border-border/50">
                  <SelectValue placeholder={t("search")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="VND">VND (₫)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md ring-1 ring-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> {t("notifications")}</CardTitle>
            <CardDescription>{t("notifDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-left">
            <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0 text-left">
              <Label htmlFor="budget-alerts" className="flex flex-col space-y-1 flex-1 text-left items-start cursor-pointer w-full">
                <span className="font-semibold text-sm text-left w-full">{t("budgetAlerts")}</span>
                <span className="font-normal text-xs text-muted-foreground text-left w-full">{t("budgetAlertDesc")}</span>
              </Label>
              <Switch 
                id="budget-alerts" 
                checked={budgetAlerts}
                onCheckedChange={setBudgetAlerts}
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0 text-left">
              <Label htmlFor="monthly-summary" className="flex flex-col space-y-1 flex-1 text-left items-start cursor-pointer w-full">
                <span className="font-semibold text-sm text-left w-full">{t("monthlySummary")}</span>
                <span className="font-normal text-xs text-muted-foreground text-left w-full">{t("monthlySumDesc")}</span>
              </Label>
              <Switch 
                id="monthly-summary" 
                checked={monthlySummary}
                onCheckedChange={setMonthlySummary}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
