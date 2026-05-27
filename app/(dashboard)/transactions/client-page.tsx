"use client"

import React, { useState } from "react"
import { 
  Plus, 
  Search,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { exportToCSV } from "@/lib/utils"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Trash, Download } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useI18n } from "@/components/i18n-provider"
import { addTransactionAction, deleteTransactionAction } from "@/app/actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export type TransactionType = {
  id: string;
  date: string;
  amount: number;
  payee: string;
  category: string;
  status: string;
  account: string;
  userName?: string;
}

export default function TransactionsClient({
  initialTransactions,
  accountId,
  isAdmin,
  isAllUsers,
  currentPage = 1,
  totalPages = 1
}: {
  initialTransactions: TransactionType[],
  accountId: string,
  isAdmin?: boolean,
  isAllUsers?: boolean,
  currentPage?: number,
  totalPages?: number
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { t, formatCurrency, formatDate } = useI18n()

  const filteredTransactions = initialTransactions.filter((t) =>
    t.payee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault()
      setLoading(true)
      const form = new FormData(e.currentTarget)
      form.append("accountId", accountId)
      await addTransactionAction(form)
      setLoading(false)
      setIsOpen(false)
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("transactions")}</h1>
          <p className="text-muted-foreground">{isAllUsers ? t("allSystem") : t("history")}</p>
        </div>

        {isAdmin && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> {t("addTransaction")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("addTransaction")}</DialogTitle>
                <DialogDescription>
                  {t("welcome")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="payee">{t("payee")}</Label>
                    <Input id="payee" name="payee" required placeholder="e.g. Netflix, Salary..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                       <Label htmlFor="amount">{t("amount")} ($)</Label>
                       <Input id="amount" name="amount" type="number" step="0.01" required placeholder="-12.99 or 3500.00" />
                    </div>
                    <div className="grid gap-2">
                       <Label htmlFor="category">{t("category")}</Label>
                       <Input id="category" name="category" placeholder="Entertainment, Income" required />
                    </div>
                  </div>
                  <DialogFooter className="mt-4">
                     <DialogClose asChild>
                       <Button type="button" variant="outline">{t("cancel")}</Button>
                     </DialogClose>
                     <Button type="submit" disabled={loading}>{loading ? t("save") + "..." : t("save")}</Button>
                  </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("search")}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => exportToCSV(filteredTransactions, "transactions")}>
              <Download className="h-4 w-4 mr-2" /> {t("exportCsv")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-1 cursor-pointer">
                      {t("date")} <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>{t("payee")}</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  {isAllUsers && <TableHead>{t("user")}</TableHead>}
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-right">{t("amount")}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                      {t("noTransactions")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell>{transaction.payee}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.category}</Badge>
                      </TableCell>
                      {isAllUsers && (
                        <TableCell>
                           <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 whitespace-nowrap">
                             {transaction.userName || t("unnamedUser")}
                           </Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={transaction.status === 'Completed' ? 'default' : 'secondary'}>
                          {transaction.status === "Completed" ? t("completed") : t("pending")}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${transaction.amount > 0 ? "text-emerald-500" : ""}`}>
                        {transaction.amount > 0 ? "+" : ""}{formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-500" onClick={async () => {
                                if (confirm(t("confirmDelete"))) {
                                   await deleteTransactionAction(transaction.id)
                                   toast.success(t("deleteSuccess"))
                                }
                            }}>
                              <Trash className="h-4 w-4 mr-2" /> {t("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>

          {/* Pagination */}
          <CardFooter className="flex items-center justify-between border-t py-4">
             <div className="text-sm text-muted-foreground font-medium">
               {t("pageOf").replace("{page}", String(currentPage)).replace("{total}", String(totalPages))}
             </div>
             <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => {
                     const params = new URLSearchParams(window.location.search)
                     params.set('page', (currentPage - 1).toString())
                     router.push(`?${params.toString()}`)
                  }}
                  className="rounded-lg h-9"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1
                    if (totalPages > 5) {
                       if (pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - currentPage) > 1) {
                          if (pageNum === 2 || pageNum === totalPages - 1) return <span key={pageNum}>...</span>
                          return null
                       }
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg"
                        onClick={() => {
                           const params = new URLSearchParams(window.location.search)
                           params.set('page', pageNum.toString())
                           router.push(`?${params.toString()}`)
                        }}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => {
                     const params = new URLSearchParams(window.location.search)
                     params.set('page', (currentPage + 1).toString())
                     router.push(`?${params.toString()}`)
                  }}
                  className="rounded-lg h-9"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
             </div>
          </CardFooter>
        </Card>
    </div>
  )
}
