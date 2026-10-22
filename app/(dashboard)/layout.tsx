import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "../globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { PusherProvider } from "@/components/pusher-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { NotificationPopover, Notification as AppNotification } from "@/components/notification-popover";
import { RealtimeScheduler } from "@/components/realtime-scheduler";

const openSans = Open_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finova - Advanced Finance Manager",
  description: "Comprehensive and realtime financial management",
};

import { auth } from "@/auth";
import { AdminUserSelector } from "@/components/admin-user-selector";
import { getAllUsers, getManagedUserId, getNotifications, getUnreadNotificationsCount, syncDailyReports, syncMonthlyReports, getAccounts, getGoals, getDashboardStats } from "@/lib/data";
import { AIChat } from "@/components/ai-chat";

import { cookies } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth()
  const isAdmin = session?.user?.role === 'admin'
  const userId = session?.user?.id

  // Sync reports for current user
  if (userId) {
    await syncDailyReports(userId)
    await syncMonthlyReports(userId)
  }

  const allUsers = isAdmin ? await getAllUsers() : []
  const managedUserId = isAdmin ? await getManagedUserId() : null

  // Fetch notifications for the user
  const notificationsData = userId ? await getNotifications(userId) : []
  const unreadCount = userId ? await getUnreadNotificationsCount(userId) : 0

  // Fetch real-time AI Chat summary data
  let chatData = undefined
  if (userId) {
    try {
      const targetUserId = managedUserId || userId
      const [accounts, goals, stats] = await Promise.all([
        getAccounts(targetUserId),
        getGoals(targetUserId),
        getDashboardStats(targetUserId)
      ])
      const totalBalance = accounts.reduce((acc, a) => acc + parseFloat(a.balance as string), 0)
      const piggyBankGoal = goals.find(g => g.name === "Tiền heo đất (Piggy Bank)" || g.name === "Piggy Bank")
      const piggyBankBalance = piggyBankGoal ? parseFloat(piggyBankGoal.currentAmount || "0") : 0
      const regularGoals = goals.filter(g => g.name !== "Tiền heo đất (Piggy Bank)" && g.name !== "Piggy Bank")
      const totalGoalsProgress = regularGoals.length > 0 
        ? (regularGoals.reduce((acc, g) => acc + (parseFloat(g.currentAmount as string) / parseFloat(g.targetAmount as string)), 0) / regularGoals.length) * 100
        : 0

      chatData = {
        totalBalance,
        monthlyIncome: stats?.currentMonth.income || 0,
        monthlyExpenses: stats?.currentMonth.expense || 0,
        activeGoalsCount: regularGoals.length,
        totalGoalsProgress,
        totalSalary: 0,
        piggyBankBalance
      }
    } catch (err) {
      console.error("AI Chat init error:", err)
    }
  }

  // Read language cookie on server side
  const cookieStore = await cookies()
  const lang = (cookieStore.get("lang")?.value as "en" | "vi") || "en"

  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${openSans.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <I18nProvider initialLang={lang}>
            <TooltipProvider>
              {session?.user ? (
              <SidebarProvider>
                <AppSidebar 
                  user={{ name: session.user.name, email: session.user.email, role: session.user.role }} 
                  notifications={notificationsData as AppNotification[]}
                  unreadCount={unreadCount}
                />
                <main className="flex-1 overflow-x-hidden flex flex-col min-h-screen relative p-0 bg-muted/20">
                  <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/40 bg-background/60 backdrop-blur-md px-6 sm:px-4 md:hidden">
                    <div className="flex items-center gap-4">
                      <SidebarTrigger className="h-9 w-9 hover:bg-muted/60 rounded-xl" />
                      <div className="font-extrabold text-base tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent px-2">Finova</div>
                    </div>
                    {/* Notification bell for mobile header */}
                    <div className="md:hidden">
                       <NotificationPopover notifications={notificationsData as AppNotification[]} unreadCount={unreadCount} />
                    </div>
                  </header>
                  <div className="flex-1 p-6 sm:p-4">
                    {isAdmin && <AdminUserSelector users={allUsers} currentManagedUserId={managedUserId} />}
                    {children}
                  </div>
                  <AIChat financialData={chatData} />
                </main>
              </SidebarProvider>
              ) : (
                  <main className="flex-1 overflow-x-hidden flex flex-col min-h-screen relative p-6 bg-muted/20">
                    {children}
                  </main>
              )}
            </TooltipProvider>
            <Toaster />
            <PusherProvider userId={session?.user?.id} role={session?.user && (session.user as {role?: string}).role} />
            <RealtimeScheduler userId={session?.user?.id} />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

