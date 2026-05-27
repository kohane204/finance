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
import { getAllUsers, getManagedUserId, getNotifications, getUnreadNotificationsCount, syncDailyReports, syncMonthlyReports } from "@/lib/data";

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
                  <header className="flex h-14 lg:h-[60px] items-center justify-between border-b bg-muted/40 px-6 sm:px-4 md:hidden">
                    <div className="flex items-center gap-4">
                      <SidebarTrigger />
                      <div className="font-semibold px-2">Finova Menu</div>
                    </div>
                    {/* Notification bell for mobile header */}
                    <div className="md:hidden">
                       <NotificationPopover notifications={notificationsData as AppNotification[]} unreadCount={unreadCount} />
                    </div>
                  </header>
                  <div className="flex-1 p-6">
                    {isAdmin && <AdminUserSelector users={allUsers} currentManagedUserId={managedUserId} />}
                    {children}
                  </div>
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

