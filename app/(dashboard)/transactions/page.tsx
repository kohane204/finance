import { getUser, getTransactions, getAccounts, getManagedUserId, getAllTransactions, getAllAccounts, getTransactionCount } from "@/lib/data"
import TransactionsClient from "./client-page"
import { TransactionType } from "./client-page"
import { redirect } from "next/navigation"

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await getUser()
  if (!user) return redirect("/login")

  const { page: pageStr } = await searchParams
  const page = parseInt(pageStr || "1")
  const limit = 10
  const offset = (page - 1) * limit

  const isAdmin = (user as { role?: string }).role === 'admin'
  const targetId = isAdmin ? await getManagedUserId() : user.id
  const isAllUsers = isAdmin && !targetId

  let accounts: { id: string }[] = []
  let dbTransactions: { id: string, date: string | number | Date, amount: string | number, payee?: string | null, category?: string | null, notes?: string | null, status?: string | null, account?: string | null, user?: { name?: string | null, email?: string | null } | null }[] = []
  let totalTransactions = 0
  if (isAllUsers) {
    accounts = await getAllAccounts()
    dbTransactions = await getAllTransactions(limit, offset)
    totalTransactions = await getTransactionCount()
  } else {
    accounts = await getAccounts(targetId || user.id)
    dbTransactions = await getTransactions(targetId || user.id, limit, offset)
    totalTransactions = await getTransactionCount(targetId || user.id)
  }
  
  const totalPages = Math.ceil(totalTransactions / limit)
  const fallbackAccountId = accounts.length > 0 ? accounts[0].id : "mock-account-id"

  const transactions: TransactionType[] = dbTransactions.map(t => ({
    id: t.id,
    date: new Date(t.date).toISOString().split('T')[0],
    amount: parseFloat(t.amount as string),
    payee: t.payee || "Unknown",
    category: (t as any).categoryName || t.notes?.replace('Category: ', '').split(' (AI Scan)')[0] || "General",
    status: t.status || "Completed",
    account: t.account || "Main Account",
    userName: t.user?.name || t.user?.email || undefined
  }))

  return (
    <TransactionsClient 
      initialTransactions={transactions} 
      accountId={fallbackAccountId} 
      isAdmin={isAdmin && !isAllUsers} 
      isAllUsers={isAllUsers}
      currentPage={page}
      totalPages={totalPages}
    />
  )
}

