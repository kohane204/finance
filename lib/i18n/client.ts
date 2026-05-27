"use client"

import { useMemo } from "react"
import { Language, translations } from "./translations"

export function useI18n(lang: Language = "en") {
  const t = useMemo(() => (key: keyof typeof translations.en): string => {
    return translations[lang][key] || key
  }, [lang])
  
  const formatCurrency = useMemo(() => (amount: number) => {
    const rate = lang === "vi" ? 26000 : 1
    const convertedAmount = amount * rate

    return new Intl.NumberFormat(lang === "en" ? "en-US" : "vi-VN", {
      style: "currency",
      currency: lang === "en" ? "USD" : "VND",
    }).format(convertedAmount)
  }, [lang])

  const formatDate = useMemo(() => (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date
    return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "vi-VN", {
      dateStyle: "medium",
    }).format(d)
  }, [lang])
  
  return { t, formatCurrency, formatDate }
}
