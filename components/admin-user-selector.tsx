"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setManagedUserAction } from "@/app/actions"
import { Globe } from "lucide-react"
import { useI18n } from "./i18n-provider"

interface UserData {
  id: string;
  name?: string | null;
  email: string | null;
  role: string;
}

export function AdminUserSelector({ users, currentManagedUserId }: { users: UserData[], currentManagedUserId?: string | null }) {
  const { t } = useI18n()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState(currentManagedUserId || "")

  if (!users || users.length === 0) return null

  const regularUsers = users.filter(u => u.role !== 'admin')
  const selectedUser = regularUsers.find(u => u.id === selectedId)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUserId = e.target.value
    setSelectedId(newUserId)
    startTransition(async () => {
      await setManagedUserAction(newUserId)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3 mb-4 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
      <div className="flex items-center gap-2 shrink-0">
        {selectedId ? (
          <div className="h-6 w-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-600">
            {(selectedUser?.name || selectedUser?.email || "?")[0].toUpperCase()}
          </div>
        ) : (
          <Globe className="size-4 text-emerald-500" />
        )}
        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
          {selectedId ? t("managing") : t("mode")}
        </span>
      </div>

      <select
        value={selectedId}
        onChange={handleChange}
        disabled={isPending}
        className="text-sm border border-border rounded-lg px-2 py-1 bg-background text-foreground flex-1 min-w-0 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        <option value="">🌐 {t("allUsers")}</option>
        {regularUsers.map(u => (
          <option key={u.id} value={u.id}>
            👤 {u.name ? `${u.name} — ${u.email}` : u.email}
          </option>
        ))}
      </select>

      {isPending && (
        <span className="text-xs text-emerald-500 animate-pulse shrink-0">{t("loading")}</span>
      )}
    </div>
  )
}
