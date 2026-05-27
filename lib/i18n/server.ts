import { cookies } from "next/headers"
import { Language, translations } from "./translations"

export async function getI18n() {
  const cookieStore = await cookies()
  const lang = (cookieStore.get("lang")?.value as Language) || "en"
  
  const t = (key: keyof typeof translations.en): string => {
    return translations[lang][key] || key
  }
  
  const formatCurrency = (amount: number) => {
    // Basic exchange rate: 1 USD = 24,000 VND 
    // Data is stored in USD base, so we convert when displaying VND
    const rate = lang === "vi" ? 26000 : 1
    const convertedAmount = amount * rate

    return new Intl.NumberFormat(lang === "en" ? "en-US" : "vi-VN", {
      style: "currency",
      currency: lang === "en" ? "USD" : "VND",
    }).format(convertedAmount)
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date
    return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "vi-VN", {
      dateStyle: "medium",
    }).format(d)
  }
  
  return { lang, t, formatCurrency, formatDate }
}
