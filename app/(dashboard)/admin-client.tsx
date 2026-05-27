"use client"

import React from "react"
import { Users, Activity, Wallet, Shield, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { useI18n } from "@/components/i18n-provider"

export type AdminStatsData = {
  totalUsers: number;
  totalTransactions: number;
  totalSystemValue: number;
  totalTransactionVolume: number;
  recentSystemActivity: Array<{ id: string, amount: string | number, type: string, date: Date, payee: string | null, user?: { name: string | null, email: string | null } | null }>;
  usersList: Array<{ id: string, name: string | null, email: string | null, role: string }>;
  volumeByUserData: Array<{ name: string, volume: number }>;
}

export default function AdminDashboard({ data }: { data: AdminStatsData }) {
  const { t, formatCurrency, formatDate } = useI18n()
  
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{t("adminConsole")}</h1>
          <p className="text-muted-foreground">{t("userOverview")}</p>
        </div>
        <Badge variant="outline" className="border-emerald-500 text-emerald-500 py-1.5 px-3">
          <Shield className="h-4 w-4 mr-2" /> {t("manage")}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-500/20 bg-emerald-500/5 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalUsers")}</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{data.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("registeredUsers")}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalWealth")}</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalSystemValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("allSystem")}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("volume") || "Transaction Volume"}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalTransactionVolume)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("totalTransactions")}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalTransactions")}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalTransactions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("history")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
         <Card>
            <CardHeader>
               <CardTitle>Top Users by Volume</CardTitle>
               <CardDescription>Transactional volume across the platform.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={data.volumeByUserData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--muted-foreground)/0.1)" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                           contentStyle={{ borderRadius: "8px", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                           formatter={(val) => formatCurrency(Number(val))}
                        />
                        <Bar dataKey="volume" radius={[0, 4, 4, 0]} barSize={20}>
                           {data.volumeByUserData.map((_, i) => (
                              <Cell key={i} fill={`hsl(var(--emerald-${500 - (i * 100)}))`} />
                           ))}
                        </Bar>
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>

         <Card>
           <CardHeader>
             <CardTitle>Recent Registered Users</CardTitle>
             <CardDescription>Latest users to join the platform.</CardDescription>
           </CardHeader>
           <CardContent>
              <div className="space-y-4">
                {data.usersList.map(u => (
                   <div key={u.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{u.name || "Unnamed User"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                         {u.role.toUpperCase()}
                      </Badge>
                   </div>
                ))}
              </div>
           </CardContent>
         </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("history")}</CardTitle>
          <CardDescription>{t("recentTransactions")}</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="space-y-4">
             {data.recentSystemActivity.map(t => (
                <div key={t.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                   <div className="flex flex-col gap-0.5">
                     <div className="flex items-center gap-2">
                       <p className="font-medium text-sm">{t.payee || "Payment"}</p>
                       {t.user && (
                         <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-emerald-500/10 text-emerald-600 border-none">
                           {t.user.name || t.user.email}
                         </Badge>
                       )}
                     </div>
                     <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                   </div>
                   <div className="text-right">
                     <p className={`text-sm font-bold ${t.type === "INCOME" || Number(t.amount) > 0 ? "text-emerald-500" : ""}`}>
                       {formatCurrency(Math.abs(Number(t.amount)))}
                     </p>
                     <p className="text-[10px] uppercase text-muted-foreground">{t.type}</p>
                   </div>
                </div>
             ))}
             {data.recentSystemActivity.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No recent activity on server.</p>}
           </div>
        </CardContent>
      </Card>

    </div>
  )
}
