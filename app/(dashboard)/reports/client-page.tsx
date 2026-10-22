"use client"

import React, { useState, useMemo, useRef } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell, LabelList } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { EXCHANGE_RATE } from "@/lib/i18n/translations"

const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#f43f5e', '#ec4899', '#06b6d4', '#84cc16']

export default function ReportsClient({ 
  dataMonthly, 
  dataYearly, 
  allTransactions = [],
  dailyReports = [],
  monthlyReports = []
}: { 
  dataMonthly: Array<{ name: string, income: number, expense: number }>,
  dataYearly: Array<{ name: string, income: number, expense: number }>,
  allTransactions?: { date: string | number | Date; amount: string | number; type?: string; categoryName?: string; categoryId?: string; notes?: string }[],
  dailyReports?: { date: string; expectedCost: string | number; actualCost: string | number; saving: string | number }[],
  monthlyReports?: { year: number; month: number; totalSalary: string | number; actualExpense: string | number; savings: string | number; performance: string | number }[]
}) {
  const { t, lang, formatCurrency } = useI18n()

  const [activeTab, setActiveTab] = useState("monthly")
  const [activePerfTab, setActivePerfTab] = useState("daily_perf")

  // Pagination & Filters
  const [dailyPage, setDailyPage] = useState(1)
  const [monthlyPage, setMonthlyPage] = useState(1)
  const itemsPerPage = 10

  const [dailyFilterDate, setDailyFilterDate] = useState("")
  const [monthlyFilterYear, setMonthlyFilterYear] = useState("")
  const [monthlyFilterMonth, setMonthlyFilterMonth] = useState("")

  const [catFilterMonth, setCatFilterMonth] = useState((new Date().getMonth() + 1).toString())
  const [catFilterYear, setCatFilterYear] = useState(new Date().getFullYear().toString())

  const chartRef = useRef<HTMLDivElement>(null)

  // Derived filtered data
  const filteredDaily = dailyReports.filter(report => {
    if (!dailyFilterDate) return true;
    const rDate = new Date(report.date).toISOString().split('T')[0];
    return rDate === dailyFilterDate;
  });
  
  const filteredMonthly = monthlyReports.filter(report => {
    if (monthlyFilterYear && report.year.toString() !== monthlyFilterYear) return false;
    if (monthlyFilterMonth && report.month.toString() !== monthlyFilterMonth.padStart(2, '0') && report.month.toString() !== monthlyFilterMonth) return false;
    return true;
  });

  const rate = lang === "vi" ? EXCHANGE_RATE : 1;

  const compactNum = (val: unknown) => {
     if (!val || isNaN(Number(val))) return '';
     const num = Number(val) * (lang === "vi" ? 26000 : 1);
     if (num >= 1000000) return (Math.round(num / 100000) / 10).toString() + 'M';
     if (num >= 1000) return (Math.round(num / 1000)).toString() + 'k';
     return lang === 'vi' ? `${Math.round(num).toLocaleString('vi-VN')} ₫` : `${t("currencySymbol")}${Math.round(num * 100)/100}`;
  };

  const totalDailyPages = Math.ceil(filteredDaily.filter(report => {
    const rDate = new Date(report.date + 'T00:00:00');
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return rDate <= today;
  }).length / itemsPerPage);

  const currentDailyData = filteredDaily
    .filter(report => {
      const rDate = new Date(report.date + 'T00:00:00');
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return rDate <= today;
    })
    .slice((dailyPage - 1) * itemsPerPage, dailyPage * itemsPerPage);

  const totalMonthlyPages = Math.ceil(filteredMonthly.length / itemsPerPage);
  const currentMonthlyData = filteredMonthly.slice((monthlyPage - 1) * itemsPerPage, monthlyPage * itemsPerPage);

  // Dynamic Category Data Calculation
  const filteredCategoryData = useMemo(() => {
    const catMap: Record<string, { value: number; isIncome: boolean }> = {}
    
    allTransactions.forEach(t => {
      const d = new Date(t.date)
      const m = (d.getUTCMonth() + 1).toString()
      const y = d.getUTCFullYear().toString()
      const localM = (d.getMonth() + 1).toString()
      const localY = d.getFullYear().toString()
      
      const isMatch = (m === catFilterMonth && y === catFilterYear) || (localM === catFilterMonth && localY === catFilterYear)

      if (isMatch) {
         const amt = Number(t.amount)
         const isIncome = (amt > 0 || t.type === 'INCOME')
         
         let cat = t.categoryName || t.categoryId;
         if (!cat) {
           if ((t.notes || "").includes("Category:")) {
              cat = (t.notes || "").split("Category:")[1].replace("(AI Scan)", "").trim();
           } else {
              cat = "Other";
           }
         }

         if (!catMap[cat]) {
            catMap[cat] = { value: 0, isIncome }
         }
         catMap[cat].value += Math.abs(amt)
      }
    })
    
    return Object.entries(catMap).map(([name, data]) => ({ 
      name, 
      value: data.value, 
      isIncome: data.isIncome 
    }))
  }, [allTransactions, catFilterMonth, catFilterYear])

  const exportToExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = (await import('file-saver')).default;
    const { toPng } = await import('html-to-image');

    const workbook = new ExcelJS.Workbook();
    
    // Determine data based on active perf tab
    const isDaily = activePerfTab === "daily_perf";
    const sheetName = isDaily ? t("dailyReportsLabel") : t("monthlyReportsLabel");
    const worksheet = workbook.addWorksheet(sheetName);

    if (isDaily) {
      worksheet.columns = [
        { header: t("date"), key: 'date', width: 15 },
        { header: t("expectedLabel"), key: 'expected', width: 20 },
        { header: t("actualLabel"), key: 'actual', width: 20 },
        { header: t("savingLabel"), key: 'saving', width: 20 },
        { header: t("status"), key: 'status', width: 15 },
      ];
      const exportDailyData = dailyFilterDate ? filteredDaily : filteredDaily.slice(0, 1);
      exportDailyData.forEach(report => {
        const isPositive = Number(report.saving) >= 0;
        worksheet.addRow({
          date: new Date(report.date).toLocaleDateString(lang, { day: '2-digit', month: '2-digit', year: 'numeric' }),
          expected: formatCurrency(Number(report.expectedCost)),
          actual: formatCurrency(Number(report.actualCost)),
          saving: formatCurrency(Number(report.saving)),
          status: isPositive ? t("withinLimit") : t("overLimitStatus")
        });
      });
    } else {
      worksheet.columns = [
        { header: t("periodLabel"), key: 'period', width: 15 },
        { header: t("totalSalary"), key: 'salary', width: 20 },
        { header: t("totalExpenses"), key: 'expense', width: 20 },
        { header: t("savingLabel"), key: 'savings', width: 20 },
        { header: t("perfLabel"), key: 'perf', width: 15 },
      ];
      const exportMonthlyData = (monthlyFilterYear || monthlyFilterMonth) ? filteredMonthly : filteredMonthly.slice(0, 1);
      exportMonthlyData.forEach(report => {
        worksheet.addRow({
          period: `${report.month}/${report.year}`,
          salary: formatCurrency(Number(report.totalSalary)),
          expense: formatCurrency(Number(report.actualExpense)),
          savings: formatCurrency(Number(report.savings)),
          perf: `${Number(report.performance).toFixed(1)}%`
        });
      });
    }

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    if (chartRef.current) {
      try {
        const dataUrl = await toPng(chartRef.current, { cacheBust: true, backgroundColor: '#ffffff' });
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        const imageId = workbook.addImage({
          base64: base64Data,
          extension: 'png',
        });
        worksheet.addImage(imageId, {
          tl: { col: 6, row: 1 },
          ext: { width: 800, height: 400 }
        });
      } catch (err) {
        console.error("Failed to generate chart image", err);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Finance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("reports")}</h1>
          <p className="text-muted-foreground">{t("financialAnalytics")}</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'performance' && (
            <Button variant="outline" className="gap-2" onClick={exportToExcel}>
               <FileSpreadsheet className="h-4 w-4" /> {t("exportExcel")}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="monthly" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="monthly">{t("monthly")}</TabsTrigger>
          <TabsTrigger value="yearly">{t("yearlyLabel")}</TabsTrigger>
          <TabsTrigger value="categories">{t("category")}</TabsTrigger>
          <TabsTrigger value="performance">{t("reports")}</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>{t("income") + " vs " + t("expense")}</CardTitle>
              <CardDescription>{t("monthlySumDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4" style={{ minWidth: 0, minHeight: 0 }}>
                {dataMonthly.length === 0 ? (
                  <div className="flex items-center justify-center p-24 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                     {t("noTransactions")}
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                  <BarChart data={dataMonthly} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)" }} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={compactNum} tick={{ fill: "var(--muted-foreground)" }} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      separator=": "
                      formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value || 0)), String(name || '')] as [string, string]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)" }}
                      itemStyle={{ fontWeight: 500 }}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="income" name={t("income")} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="expense" name={t("expense")} fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yearly">
          <Card>
            <CardHeader>
              <CardTitle>{t("financialTrend")}</CardTitle>
              <CardDescription>{t("financialTrend")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                {dataYearly.length === 0 ? (
                  <div className="flex items-center justify-center p-24 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                     {t("noReportsYet")}
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={dataYearly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                    <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                    <YAxis tickFormatter={compactNum} tick={{ fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      separator=": "
                      formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value || 0)), String(name || "")] as [string, string]} 
                      contentStyle={{ borderRadius: "8px", background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }} 
                      itemStyle={{ fontWeight: 500 }}
                    />
                    <Legend />
                    <Bar dataKey="income" name={t("income")} fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name={t("expense")} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
           <div className="grid gap-4 md:grid-cols-2">
               <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{t("category")}</CardTitle>
                    <CardDescription>{t("categoryAnalysisDesc")}</CardDescription>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="flex gap-2 items-center">
                      <div className="flex flex-col">
                         <span className="text-[10px] text-muted-foreground font-bold uppercase ml-1">{t("month")}</span>
                         <Input 
                          type="number" 
                          className="w-16 h-8 text-xs font-bold" 
                          value={catFilterMonth} 
                          onChange={e => setCatFilterMonth(e.target.value)} 
                          min={1} max={12} 
                         />
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[10px] text-muted-foreground font-bold uppercase ml-1">{t("year")}</span>
                         <Input 
                          type="number" 
                          className="w-20 h-8 text-xs font-bold" 
                          value={catFilterYear} 
                          onChange={e => setCatFilterYear(e.target.value)} 
                         />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                   <div className="h-[450px] w-full">
                      {filteredCategoryData.length === 0 ? (
                         <div className="flex items-center justify-center h-full text-muted-foreground">{t("noTransactions")}</div>
                      ) : (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                          <Pie 
                            data={filteredCategoryData} 
                            innerRadius={60} 
                            outerRadius={100} 
                            paddingAngle={5} 
                            dataKey="value"
                            nameKey="name"
                            label={({ payload, percent }) => `${payload.name}${payload?.isIncome ? ` (${t("income")})` : ''} ${((percent || 0) * 100).toFixed(0)}%`}
                          >
                            {filteredCategoryData.map((entry: { name: string; value: number, isIncome: boolean }, index: number) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.isIncome ? '#10b981' : COLORS[index % COLORS.length]} 
                                stroke={entry.isIncome ? '#059669' : 'none'}
                                strokeWidth={entry.isIncome ? 2 : 0}
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                      formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value || 0)), String(name || '')] as [string, string]}
                            contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)" }}
                            itemStyle={{ fontWeight: 500 }}
                            separator=": "
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      )}
                   </div>
                </CardContent>
              </Card>
              <Card>
                 <CardHeader>
                    <CardTitle>{t("detail")}</CardTitle>
                    <CardDescription>{t("categoryAnalysisDesc")}</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <div className="space-y-4">
                       {filteredCategoryData.sort((a,b) => b.value - a.value).map((cat, i) => (
                          <div key={i} className={cn("flex justify-between items-center border-b pb-2 last:border-0 rounded-lg p-2 transition-colors", cat.isIncome ? "bg-emerald-500/5 border-emerald-500/10" : "bg-transparent")}>
                             <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.isIncome ? '#10b981' : COLORS[i % COLORS.length] }} />
                                <div className="flex items-center gap-2">
                                   <span className={cn("font-medium", cat.isIncome && "text-emerald-600")}>{cat.name}</span>
                                   {cat.isIncome && <Badge className="h-4 px-1 text-[8px] bg-emerald-500 text-white border-none">{t("income").toUpperCase()}</Badge>}
                                </div>
                             </div>
                             <span className={cn("font-bold", cat.isIncome ? "text-emerald-500" : "text-foreground")}>
                                {cat.isIncome ? '+' : ''}{formatCurrency(cat.value)}
                             </span>
                          </div>
                       ))}
                    </div>
                 </CardContent>
              </Card>
           </div>
        </TabsContent>

        <TabsContent value="performance">
           <Tabs defaultValue="daily_perf" className="w-full" onValueChange={setActivePerfTab}>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-xl font-semibold">{t("financialPerformance")}</h2>
                  <p className="text-sm text-muted-foreground">{t("reportAnalysisDesc")}</p>
                </div>
                <TabsList className="grid w-[200px] grid-cols-2 h-9 p-1">
                  <TabsTrigger value="daily_perf" className="text-xs">{t("daily")}</TabsTrigger>
                  <TabsTrigger value="monthly_perf" className="text-xs">{t("monthly")}</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="daily_perf">
                <Card className="border-none shadow-none bg-transparent">
                  <CardContent className="p-0">
                     <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                        <h3 className="text-sm font-medium text-foreground">{t("filterReportsLabel")}</h3>
                        <Input 
                          type="date" 
                          value={dailyFilterDate} 
                          onChange={(e) => { setDailyFilterDate(e.target.value); setDailyPage(1); }} 
                          className="max-w-full md:max-w-[200px] border-border bg-background"
                        />
                     </div>
                     <div className="grid gap-6 mb-8">
                       <Card>
                         <CardHeader className="pb-2">
                           <CardTitle className="text-base font-medium">{t("trendTitle")}</CardTitle>
                         </CardHeader>
                         <CardContent>
                            <div className="h-[300px] w-full mt-2">
                               {currentDailyData.length === 0 ? (
                                  <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/10 border border-dashed rounded-lg">{t("noTransactions")}</div>
                               ) : (
                                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                    <BarChart data={[...currentDailyData].reverse()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={2}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.1)" />
                                      <XAxis 
                                        dataKey="date" 
                                        tickFormatter={(d) => new Date(d).toLocaleDateString(lang, { day: '2-digit', month: '2-digit' })} 
                                        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                                        axisLine={{ stroke: "var(--border)" }}
                                        tickLine={false}
                                      />
                                      <YAxis 
                                        tickFormatter={compactNum} 
                                        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                                        axisLine={{ stroke: "var(--border)" }}
                                        tickLine={false}
                                      />
                                      <Tooltip 
                                        cursor={{ fill: 'transparent' }}
                                        separator=": "
                      formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value || 0)), String(name || '')] as [string, string]}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString(lang, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)" }}
                                        itemStyle={{ fontWeight: 500 }}
                                      />
                                      <Legend />
                                      <Bar dataKey="expectedCost" name={t("expectedLabel")} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                      <Bar dataKey="actualCost" name={t("actualLabel")} fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    </BarChart>
                                  </ResponsiveContainer>
                               )}
                            </div>
                         </CardContent>
                       </Card>
                     </div>

                     <div className="overflow-x-auto rounded-xl border bg-card">
                      <table className="w-full text-sm text-center border-separate border-spacing-0">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="py-3 px-4 text-muted-foreground font-semibold border-b text-center first:rounded-tl-lg">{t("date")}</th>
                            <th className="py-3 px-4 text-muted-foreground font-semibold border-b text-center">{t("expectedLabel")}</th>
                            <th className="py-3 px-4 text-muted-foreground font-semibold border-b text-center">{t("actualLabel")}</th>
                            <th className="py-3 px-4 text-muted-foreground font-semibold border-b text-center">{t("savingLabel")}</th>
                            <th className="py-3 px-4 text-muted-foreground font-semibold border-b text-center last:rounded-tr-lg">{t("status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentDailyData.map((report, i) => {
                             const saving = Number(report.saving)
                             const isPositive = saving >= 0
                             return (
                               <tr key={i} className="group hover:bg-muted/30 transition-colors border-b last:border-0 font-medium">
                                 <td className="py-4 px-4 border-b text-center">{new Date(report.date).toLocaleDateString(lang, { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                 <td className="py-4 px-4 border-b text-center text-muted-foreground">{formatCurrency(Number(report.expectedCost))}</td>
                                 <td className="py-4 px-4 border-b text-center">{formatCurrency(Number(report.actualCost))}</td>
                                 <td className={`py-4 px-4 border-b text-center font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                   {isPositive ? '+' : ''}{formatCurrency(saving)}
                                 </td>
                                 <td className="py-4 px-4 border-b text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isPositive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                       {isPositive ? (t("withinLimit")) : (t("overLimitStatus"))}
                                    </span>
                                 </td>
                               </tr>
                             )
                          })}
                        </tbody>
                      </table>
                      {currentDailyData.length === 0 && (
                         <div className="py-24 text-center text-muted-foreground bg-muted/10 border-2 border-dashed rounded-2xl m-4">
                            <p className="font-medium text-lg mb-1">{t("noDailyReports")}</p>
                         </div>
                      )}
                      {totalDailyPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                          <div className="text-sm text-muted-foreground">
                             {t("pageOf").replace("{page}", String(dailyPage)).replace("{total}", String(totalDailyPages))}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setDailyPage(p => Math.max(1, p - 1))} disabled={dailyPage === 1}>
                               <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setDailyPage(p => Math.min(totalDailyPages, p + 1))} disabled={dailyPage === totalDailyPages || totalDailyPages === 0}>
                               <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="monthly_perf">
                <Card className="border-none shadow-none bg-transparent">
                  <CardContent className="p-0">
                     <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                        <h3 className="text-sm font-medium text-foreground">{t("filterReportsLabel")}</h3>
                        <div className="flex gap-3 w-full md:w-auto">
                          <Input 
                             type="number" 
                             placeholder={t("year")} 
                             value={monthlyFilterYear} 
                             onChange={(e) => { setMonthlyFilterYear(e.target.value); setMonthlyPage(1); }} 
                             className="w-full md:w-[140px] border-border bg-background"
                          />
                          <Input 
                             type="number" 
                             placeholder={t("month")} 
                             value={monthlyFilterMonth} 
                             onChange={(e) => { setMonthlyFilterMonth(e.target.value); setMonthlyPage(1); }} 
                             className="w-full md:w-[100px] border-border bg-background"
                             min={1} max={12}
                          />
                        </div>
                     </div>
                     <div className="grid gap-6 mb-8">
                       <Card>
                         <CardHeader className="pb-2">
                           <CardTitle className="text-base font-medium">{t("salaryTrendTitle")}</CardTitle>
                         </CardHeader>
                         <CardContent>
                            <div className="h-[300px] w-full mt-2">
                               {currentMonthlyData.length === 0 ? (
                                  <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/10 border border-dashed rounded-lg">{t("noTransactions")}</div>
                               ) : (
                                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                    <BarChart data={[...currentMonthlyData].reverse()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={2}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.1)" />
                                      <XAxis 
                                        dataKey={(d) => `${d.month}/${d.year}`}
                                        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                                        axisLine={{ stroke: "var(--border)" }}
                                        tickLine={false}
                                      />
                                      <YAxis 
                                        tickFormatter={compactNum} 
                                        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                                        axisLine={{ stroke: "var(--border)" }}
                                        tickLine={false}
                                      />
                                      <Tooltip 
                                        cursor={{ fill: 'transparent' }}
                                        separator=": "
                      formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value || 0)), String(name || "")] as [string, string]}
                                        contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", textTransform: "capitalize", backgroundColor: "var(--background)", color: "var(--foreground)" }}
                                        itemStyle={{ fontWeight: 500 }}
                                      />
                                      <Legend />
                                      <Bar dataKey="totalSalary" name={t("totalSalary")} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                      <Bar dataKey="actualExpense" name={t("totalExpenses")} fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    </BarChart>
                                  </ResponsiveContainer>
                               )}
                            </div>
                         </CardContent>
                       </Card>
                     </div>

                     <div className="overflow-x-auto rounded-xl border bg-card">
                      <table className="w-full text-sm text-center border-separate border-spacing-0">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="py-3 px-4 text-muted-foreground font-semibold border-b text-center first:rounded-tl-lg">{t("periodLabel")}</th>
                            <th className="py-3 px-4 text-muted-foreground font-semibold border-b text-center">{t("totalSalary")}</th>
                            <th className="py-3 px-4 text-muted-foreground font-semibold border-b text-center">{t("totalExpenses")}</th>
                            <th className="py-3 px-4 text-muted-foreground font-semibold border-b text-center">{t("savings")}</th>
                            <th className="py-3 px-4 text-muted-foreground font-semibold border-b text-center last:rounded-tr-lg">{t("perfLabel")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentMonthlyData.map((report, i) => {
                             const perf = Number(report.performance)
                             const isPositive = Number(report.savings) >= 0
                             return (
                               <tr key={i} className="group hover:bg-muted/30 transition-colors border-b last:border-0 font-medium">
                                 <td className="py-4 px-4 border-b font-bold text-center">{report.month}/{report.year}</td>
                                 <td className="py-4 px-4 border-b text-center text-muted-foreground">{formatCurrency(Number(report.totalSalary))}</td>
                                 <td className="py-4 px-4 border-b text-center">{formatCurrency(Number(report.actualExpense))}</td>
                                 <td className={`py-4 px-4 border-b text-center font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                   {formatCurrency(Number(report.savings))}
                                 </td>
                                 <td className="py-4 px-4 border-b text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className={`text-xs font-bold ${perf >= 30 ? 'text-emerald-500' : perf >= 10 ? 'text-blue-500' : 'text-rose-500'}`}>{perf.toFixed(1)}%</span>
                                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                         <div 
                                            className={`h-full ${perf >= 30 ? 'bg-emerald-500' : perf >= 10 ? 'bg-blue-500' : 'bg-rose-500'}`} 
                                            style={{ width: `${Math.min(Math.max(perf, 0), 100)}%` }} 
                                         />
                                      </div>
                                    </div>
                                 </td>
                               </tr>
                             )
                          })}
                        </tbody>
                      </table>
                      {currentMonthlyData.length === 0 && (
                         <div className="py-24 text-center text-muted-foreground bg-muted/10 border-2 border-dashed rounded-2xl m-4">
                            <p className="font-medium text-lg mb-1">{t("noMonthlyReports")}</p>
                         </div>
                      )}
                      {totalMonthlyPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                          <div className="text-sm text-muted-foreground">
                             {t("pageOf").replace("{page}", String(monthlyPage)).replace("{total}", String(totalMonthlyPages))}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setMonthlyPage(p => Math.max(1, p - 1))} disabled={monthlyPage === 1}>
                               <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setMonthlyPage(p => Math.min(totalMonthlyPages, p + 1))} disabled={monthlyPage === totalMonthlyPages || totalMonthlyPages === 0}>
                               <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
           </Tabs>
        </TabsContent>
      </Tabs>

      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
        <div ref={chartRef} style={{ width: '1000px', height: '500px', background: 'white', padding: '10px' }}>
          {(() => {
            const exportDailyData = dailyFilterDate ? filteredDaily : filteredDaily.slice(0, 1);
            const exportMonthlyData = (monthlyFilterYear || monthlyFilterMonth) ? filteredMonthly : filteredMonthly.slice(0, 1);

            const chartDailyData = exportDailyData.slice().reverse();
            const chartMonthlyData = exportMonthlyData.slice().reverse();

            const chartCompactNum = (val: unknown) => {
               if (!val || isNaN(Number(val))) return '';
               const num = Number(val) * rate;
               if (num >= 1000000) return (Math.round(num / 100000) / 10).toString() + 'M';
               if (num >= 1000) return (Math.round(num / 100) / 10).toString() + 'k';
               return lang === 'vi' ? `${num.toLocaleString('vi-VN')} ₫` : `${t("currencySymbol")}${num}`;
            };

            return activePerfTab === "daily_perf" ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <BarChart data={chartDailyData} margin={{ top: 30, right: 30, left: 20, bottom: 20 }} barGap={5} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString()} tick={{ fontSize: 14 }} />
                  <YAxis tickFormatter={chartCompactNum} tick={{ fontSize: 14 }} />
                  <Legend wrapperStyle={{ fontSize: '14px' }} />
                  <Bar dataKey="expectedCost" name={t("expectedLabel")} fill="#3b82f6" maxBarSize={60}>
                    <LabelList dataKey="expectedCost" position="top" formatter={chartCompactNum} fontSize={14} fill="#64748b" fontWeight="bold" />
                  </Bar>
                  <Bar dataKey="actualCost" name={t("actualLabel")} fill="#f59e0b" maxBarSize={60}>
                    <LabelList dataKey="actualCost" position="top" formatter={chartCompactNum} fontSize={14} fill="#64748b" fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <BarChart data={chartMonthlyData} margin={{ top: 30, right: 30, left: 20, bottom: 20 }} barGap={5} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={(d) => `${d.month}/${d.year}`} tick={{ fontSize: 14 }} />
                  <YAxis tickFormatter={chartCompactNum} tick={{ fontSize: 14 }} />
                  <Legend wrapperStyle={{ fontSize: '14px' }} />
                  <Bar dataKey="totalSalary" name={t("totalSalary")} fill="#10b981" maxBarSize={60}>
                    <LabelList dataKey="totalSalary" position="top" formatter={chartCompactNum} fontSize={14} fill="#64748b" fontWeight="bold" />
                  </Bar>
                  <Bar dataKey="actualExpense" name={t("totalExpenses")} fill="#f43f5e" maxBarSize={60}>
                    <LabelList dataKey="actualExpense" position="top" formatter={chartCompactNum} fontSize={14} fill="#64748b" fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>
      </div>
    </div>
  )
}

