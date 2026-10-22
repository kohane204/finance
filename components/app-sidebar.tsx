"use client"

import * as React from "react"
import {
  Compass,
  Briefcase,
  Sparkles,
  ShieldAlert,
  PieChart,
  ArrowRightLeft,
  PiggyBank,
  Target,
  Settings,
  Sun,
  Moon,
  TrendingUp,
  LogOut,
  Users,
  Languages,
  CalendarDays,
  History,
  Brain,
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from "lucide-react"
import { useI18n } from "./i18n-provider"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"

import {
  Sidebar,
  useSidebar
} from "@/components/ui/sidebar"
import { useTheme } from "next-themes"
import { logoutAction } from "@/app/actions"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function AppSidebar({ 
  user,
  unreadCount = 0
}: { 
  user?: { name?: string | null, email?: string | null, role?: string },
  notifications?: unknown[],
  unreadCount?: number
}) {
  const { lang, setLang, t } = useI18n()
  const { setTheme, theme, resolvedTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = React.useState(false)
  const { state, setOpen, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"

  // Expand categories state
  const [openCategories, setOpenCategories] = React.useState<Record<string, boolean>>({
    overview: true,
    management: true,
    recommendations: true,
    admin: true
  })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-expand active category based on route change
  React.useEffect(() => {
    let activeCat = "overview"
    if (pathname === "/admin/users" || pathname.startsWith("/admin")) {
      activeCat = "admin"
    } else if (["/budgets", "/goals", "/bills", "/reports", "/net-worth"].includes(pathname)) {
      activeCat = "management"
    } else if (["/recommendations", "/investments"].includes(pathname)) {
      activeCat = "recommendations"
    }
    setOpenCategories(prev => ({ ...prev, [activeCat]: true }))
  }, [pathname])

  const toggleCategory = (categoryId: string) => {
    if (isCollapsed) {
      setOpen(true)
    }
    setOpenCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  const isAdmin = user?.role === 'admin'

  const categories = [
    { id: "overview", name: t("overview"), icon: Compass },
    { id: "management", name: t("management"), icon: Briefcase },
    { id: "recommendations", name: t("smartTips"), icon: Sparkles },
    ...(isAdmin ? [{ id: "admin", name: t("adminConsole"), icon: ShieldAlert }] : [])
  ]

  const itemsMap: Record<string, { title: string; url: string; icon: React.ComponentType<{ className?: string }>; isNotif?: boolean }[]> = {
    overview: [
      { title: t("dashboard"), url: "/", icon: PieChart },
      { title: t("transactions"), url: "/transactions", icon: ArrowRightLeft },
      { title: t("calendar"), url: "/calendar", icon: CalendarDays },
      { title: t("history"), url: "/history", icon: History },
      { title: t("notifications"), url: "/notifications", icon: Bell, isNotif: true },
    ],
    management: [
      { title: t("budgets"), url: "/budgets", icon: PiggyBank },
      { title: t("goals"), url: "/goals", icon: Target },
      { title: t("bills"), url: "/bills", icon: CalendarDays },
      { title: t("reports"), url: "/reports", icon: TrendingUp },
      { title: t("netWorth"), url: "/net-worth", icon: Brain },
    ],
    recommendations: [
      { title: t("smartTips"), url: "/recommendations", icon: TrendingUp },
      { title: t("investmentAdvice"), url: "/investments", icon: Target },
    ],
    admin: [
      { title: t("manageUsers"), url: "/admin/users", icon: Users }
    ]
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60 bg-card text-sidebar-foreground shadow-premium-lg transition-all duration-300 select-none">
      <div className="flex flex-col h-full w-full overflow-hidden bg-gradient-to-b from-card to-background/50">
        
        {/* Brand Header Section */}
        <div className={cn(
          "flex items-center gap-3 p-4 border-b border-border/40 shrink-0 transition-all duration-300",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          <div className="flex items-center gap-3">
            <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-600 text-primary-foreground shadow-md shadow-primary/20 hover:scale-105 hover:rotate-6 transition-all duration-300 shrink-0">
              <PiggyBank className="size-4.5" />
            </div>
            {!isCollapsed && (
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
                Finova
              </span>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={() => toggleSidebar()}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
        </div>

        {/* Navigation Content Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {categories.map((cat) => {
            const isCategoryOpen = openCategories[cat.id]
            const items = itemsMap[cat.id] || []
            const Icon = cat.icon

            if (isCollapsed) {
              return (
                <div key={cat.id} className="flex flex-col items-center gap-2">
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => toggleCategory(cat.id)}
                        className="flex aspect-square size-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer"
                      >
                        <Icon className="size-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-bold bg-card border shadow-premium">
                      {cat.name}
                    </TooltipContent>
                  </Tooltip>
                  {/* Slim direct child links in collapsed mode for immediate navigation */}
                  <div className="flex flex-col gap-1 w-full items-center">
                    {items.map((item) => {
                      const isActive = pathname === item.url
                      const ItemIcon = item.icon
                      return (
                        <Tooltip key={item.title} delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.url}
                              className={cn(
                                "relative flex aspect-square size-8.5 items-center justify-center rounded-lg transition-all",
                                isActive 
                                  ? "bg-primary/10 text-primary shadow-xs" 
                                  : "text-muted-foreground/80 hover:text-foreground hover:bg-muted/40"
                              )}
                            >
                              <ItemIcon className="size-4" />
                              {item.isNotif && unreadCount > 0 && (
                                <span className="absolute top-0 right-0 flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                              )}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-card text-foreground border shadow-premium font-semibold">
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                  <div className="w-6 h-px bg-border/40 my-2" />
                </div>
              )
            }

            return (
              <div key={cat.id} className="space-y-1.5 transition-all">
                {/* Category Accordion Header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-black tracking-widest uppercase text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-3.5 group-hover:text-primary transition-colors text-muted-foreground/60" />
                    <span>{cat.name}</span>
                  </div>
                  <ChevronDown className={cn(
                    "size-3 transition-transform duration-200",
                    isCategoryOpen ? "rotate-180" : ""
                  )} />
                </button>

                {/* Submenu links with height transition */}
                <div className={cn(
                  "space-y-0.5 overflow-hidden transition-all duration-300",
                  isCategoryOpen ? "max-h-[300px] opacity-100 mt-1" : "max-h-0 opacity-0 pointer-events-none"
                )}>
                  {items.map((item) => {
                    const isActive = pathname === item.url
                    const ItemIcon = item.icon
                    return (
                      <Link
                        key={item.title}
                        href={item.url}
                        className={cn(
                          "group/link flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative",
                          isActive 
                            ? "bg-primary/10 text-primary shadow-xs ring-1 ring-primary/15" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <ItemIcon className={cn(
                          "size-4 shrink-0 transition-transform duration-200 group-hover/link:scale-105", 
                          isActive ? "text-primary" : "text-muted-foreground/75 group-hover/link:text-foreground"
                        )} />
                        <span className="truncate">{item.title}</span>

                        {item.isNotif && unreadCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white animate-pulse">
                            {unreadCount}
                          </span>
                        )}

                        {isActive && (
                          <span className="absolute left-0 top-2 bottom-2 w-0.75 bg-primary rounded-r-md" />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Area with controls */}
        <div className="p-3 border-t border-border/40 shrink-0 space-y-3 bg-card/40 backdrop-blur-md">
          {user && !isCollapsed && (
            <div className="flex items-center gap-2 px-2 py-1 bg-muted/20 rounded-xl border border-border/30 shadow-inner">
              <div className="flex aspect-square size-8.5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold uppercase shadow-sm">
                {user.name ? user.name.slice(0, 2) : "FI"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-foreground truncate leading-tight">{user.name || "User"}</span>
                <span className="text-[9px] text-muted-foreground truncate leading-none mt-0.5">{user.email}</span>
              </div>
            </div>
          )}

          {/* Quick actions panel */}
          <div className={cn(
            "flex items-center gap-1.5 justify-between",
            isCollapsed ? "flex-col" : "flex-row"
          )}>
            {/* Settings */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push("/settings")}
                  className={cn(
                    "flex aspect-square size-8.5 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer",
                    pathname === "/settings" && "bg-primary/10 text-primary"
                  )}
                >
                  <Settings className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-semibold">{t("settings")}</TooltipContent>
            </Tooltip>

            {/* Language switch */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
                  className="flex aspect-square size-8.5 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer relative group"
                >
                  <Languages className="size-4" />
                  <span className="absolute bottom-0 right-0 text-[7px] font-black bg-muted text-foreground/80 px-0.5 rounded border border-border group-hover:bg-primary group-hover:text-primary-foreground transition-colors uppercase leading-none">
                    {lang}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-semibold">
                {lang === 'en' ? t("vietnamese") : t("english")}
              </TooltipContent>
            </Tooltip>

            {/* Theme switcher */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex aspect-square size-8.5 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer"
                >
                  {mounted && resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-semibold">{t("toggleTheme")}</TooltipContent>
            </Tooltip>

            {/* Sign Out */}
            <form action={logoutAction} className="inline-block">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button 
                    type="submit" 
                    className="flex aspect-square size-8.5 items-center justify-center rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer"
                  >
                    <LogOut className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-semibold text-rose-500">{t("signOut")}</TooltipContent>
              </Tooltip>
            </form>
          </div>

          {/* Sidebar Expand / Collapse arrow button */}
          {isCollapsed && (
            <button
              onClick={() => toggleSidebar()}
              className="w-full flex aspect-square items-center justify-center rounded-xl bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          )}
        </div>

      </div>
    </Sidebar>
  )
}

