"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { Language, translations } from "@/lib/i18n/translations"
import { useRouter } from "next/navigation"

type I18nContextType = {
  lang: Language
  setLang: (l: Language) => void
  t: (key: keyof typeof translations.en) => string
  formatCurrency: (amount: number) => string
  formatDate: (date: Date | string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children, initialLang }: { children: React.ReactNode, initialLang?: Language }) {
  const [lang, setLang] = useState<Language>(initialLang || "en")
  const router = useRouter()

  useEffect(() => {
    // Only run on mount to sync with localStorage if initialLang was not provided or to ensure persistence
    if (!initialLang) {
      const cookieLang = document.cookie.split('; ').find(row => row.startsWith('lang='))?.split('=')[1] as Language
      if (cookieLang && (cookieLang === 'en' || cookieLang === 'vi')) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLang(cookieLang)
      } else {
        const saved = localStorage.getItem("lang") as Language
        if (saved && (saved === "en" || saved === "vi")) {
           
          setLang(saved)
        }
      }
    }
  }, [initialLang])

  const handleSetLang = (l: Language) => {
    setLang(l)
    localStorage.setItem("lang", l)
    document.cookie = `lang=${l}; path=/; max-age=31536000` // 1 year
    router.refresh() // Smoothly update RSCs without full page reload
  }

  const t = (key: keyof typeof translations.en): string => {
    return translations[lang][key] || key
  }

  const formatCurrency = (amount: number) => {
    // Basic exchange rate: 1 USD = 24,000 VND 
    // Data is stored in USD base, so we convert when displaying VND
    const rate = lang === "vi" ? 26000 : 1
    const convertedAmount = lang === "vi" ? Math.round(amount * rate) : amount * rate

    return new Intl.NumberFormat(lang === "en" ? "en-US" : "vi-VN", {
      style: "currency",
      currency: lang === "en" ? "USD" : "VND",
      minimumFractionDigits: lang === "en" ? 2 : 0,
      maximumFractionDigits: lang === "en" ? 2 : 0,
    }).format(convertedAmount)
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date
    return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "vi-VN", {
      dateStyle: "medium",
    }).format(d)
  }

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t, formatCurrency, formatDate }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => {
  const context = useContext(I18nContext)
  if (!context) throw new Error("useI18n must be used within I18nProvider")
  return context
}
