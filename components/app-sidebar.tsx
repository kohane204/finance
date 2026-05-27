"use client"

import * as React from "react"
import {
  PieChart,
  ArrowRightLeft,
  PiggyBank,
  Target,
  Settings,
  Sun,
  Moon,
  TrendingUp,
  CreditCard,
  LogOut,
  Users,
  Languages,
  CalendarDays,
  History,
  Globe,
  Brain
} from "lucide-react"
import { useI18n } from "./i18n-provider"
import { usePathname } from "next/navigation"
import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useTheme } from "next-themes"
import { logoutAction } from "@/app/actions"
import { NotificationPopover, type Notification } from "./notification-popover"

export function AppSidebar({ 
  user,
  notifications = [],
  unreadCount = 0
}: { 
  user?: { name?: string | null, email?: string | null, role?: string },
  notifications?: Notification[],
  unreadCount?: number
}) {
  const { lang, setLang, t } = useI18n()
  
  const navItems = {
    overview: [
      { title: t("dashboard"), url: "/", icon: PieChart },
      { title: t("transactions"), url: "/transactions", icon: ArrowRightLeft },
      { title: t("calendar"), url: "/calendar", icon: CalendarDays },
      { title: t("history"), url: "/history", icon: History },
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
    ]
  }

  const { setTheme, theme, resolvedTheme } = useTheme()
  const pathname = usePathname()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isAdmin = user?.role === 'admin'

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="p-4 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
            <PiggyBank className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-lg tracking-tight">Finova</span>
            <span className="text-xs text-muted-foreground">{isAdmin ? t("adminConsole") : t("personalFinance")}</span>
          </div>
        </div>
        <div className="group-data-[collapsible=icon]:hidden">
           <NotificationPopover notifications={notifications} unreadCount={unreadCount} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {Object.entries(navItems).map(([category, items]) => (
          <SidebarGroup key={category}>
            <SidebarGroupLabel>{t(category as "overview" | "management" | "recommendations")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                
                {category === 'management' && isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/admin')} tooltip="Manage Users">
                      <Link href="/admin/users">
                        <Users className="text-emerald-500" />
                        <span className="text-emerald-500 font-medium">{t("manageUsers")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="group-data-[collapsible=icon]:hidden px-2 mb-4">
           <p className="text-sm font-semibold truncate">{user?.name || "User"}</p>
           <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
           {isAdmin && <span className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">{t("roleAdmin")}</span>}
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip={t("language")} 
              onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
            >
              <Languages className="size-4" />
              <span>{lang === 'en' ? t("vietnamese") : t("english")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip={t("toggleTheme")} 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {!mounted ? <Moon className="size-4" /> : (resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />)}
              <span>{t("toggleTheme")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t("settings")} isActive={pathname === '/settings'}>
              <Link href="/settings">
                <Settings />
                <span>{t("settings")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={logoutAction}>
                <SidebarMenuButton tooltip={t("signOut")} type="submit">
                  <LogOut className="text-rose-500" />
                  <span className="text-rose-500">{t("signOut")}</span>
                </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
