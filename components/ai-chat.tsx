"use client"

import React, { useState, useEffect, useRef } from "react"
import { Sparkles, X, Send, Bot, User, ArrowRight, Loader2, BrainCircuit } from "lucide-react"
import { useI18n } from "./i18n-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

interface Message {
  id: string
  sender: "user" | "bot"
  text: string
  timestamp: Date
}

interface AIChatProps {
  financialData?: {
    totalBalance: number
    monthlyIncome: number
    monthlyExpenses: number
    activeGoalsCount: number
    totalGoalsProgress: number
    totalSalary: number
    piggyBankBalance: number
  }
}

export function AIChat({ financialData }: AIChatProps) {
  const { lang, formatCurrency } = useI18n()
  const isVi = lang === "vi"
  const [isOpen, setIsOpen] = useState(false)

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "welcome",
      sender: "bot",
      text: isVi 
        ? "Xin chào! Tôi là Finova AI. Tôi có thể giúp gì cho tình hình tài chính của bạn hôm nay?"
        : "Hello! I am Finova AI. How can I assist you with your financial decisions today?",
      timestamp: new Date()
    }
  ])
  const [inputVal, setInputVal] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const getSmartResponse = (query: string): string => {
    const q = query.toLowerCase()
    
    // Check if we have data to analyze
    const balance = financialData?.totalBalance || 0
    const income = financialData?.monthlyIncome || 0
    const expense = financialData?.monthlyExpenses || 0
    const goalsCount = financialData?.activeGoalsCount || 0
    const piggy = financialData?.piggyBankBalance || 0

    if (q.includes("phân tích") || q.includes("analyze") || q.includes("tình hình") || q.includes("status")) {
      if (isVi) {
        return `### Phân Tích Tài Chính Của Bạn:
- **Số dư hiện tại**: ${formatCurrency(balance)}
- **Thu nhập tháng này**: ${formatCurrency(income)}
- **Chi tiêu tháng này**: ${formatCurrency(expense)}
${expense > income 
  ? `> ⚠️ **Cảnh báo**: Chi tiêu của bạn (${formatCurrency(expense)}) đang vượt mức thu nhập (${formatCurrency(income)})! Hãy cân nhắc cắt giảm các khoản không cần thiết.` 
  : `> ✅ **Tốt**: Chi tiêu của bạn đang ở mức kiểm soát được (${Math.round((expense/income)*100)}% thu nhập).`}
- **Quỹ heo đất tích lũy**: ${formatCurrency(piggy)}
- **Mục tiêu hoạt động**: Bạn đang có ${goalsCount} mục tiêu cần hoàn thành.`
      } else {
        return `### Your Financial Summary:
- **Current Balance**: ${formatCurrency(balance)}
- **Income this month**: ${formatCurrency(income)}
- **Expenses this month**: ${formatCurrency(expense)}
${expense > income 
  ? `> ⚠️ **Warning**: Your expenses (${formatCurrency(expense)}) exceed your income (${formatCurrency(income)})! Consider cutting non-essential spending.` 
  : `> ✅ **Good**: Your spending is under control (${Math.round((expense/income)*100)}% of income).`}
- **Piggy Bank savings**: ${formatCurrency(piggy)}
- **Active Goals**: You are working on ${goalsCount} financial goals.`
      }
    }

    if (q.includes("tiết kiệm") || q.includes("save") || q.includes("tích lũy")) {
      if (isVi) {
        return `### 💡 Mẹo Tiết Kiệm Nhanh Cho Bạn:
1. **Quy tắc 50/30/20**: Dành 50% cho nhu cầu thiết yếu, 30% cho sở thích và **20%** chuyển thẳng vào **Quỹ Dự trữ/Quỹ Heo đất** (${formatCurrency(balance * 0.2)}).
2. **Cắt giảm đăng ký dịch vụ**: Kiểm tra lại các gói Netflix, Spotify hoặc ứng dụng không dùng đến.
3. **Mua sắm thông minh**: Chờ 24-48 giờ trước khi mua một món đồ xa xỉ để tránh chi tiêu bốc đồng.`
      } else {
        return `### 💡 Quick Saving Tips:
1. **50/30/20 Rule**: Dedicate 50% for needs, 30% for wants, and **20%** straight to your **Reserve/Piggy Bank** (${formatCurrency(balance * 0.2)}).
2. **Subscription Audit**: Review your Netflix, Spotify, or unused app subscriptions.
3. **24-Hour Rule**: Wait 24-48 hours before purchasing luxury items to prevent impulse buying.`
      }
    }

    if (q.includes("đầu tư") || q.includes("invest") || q.includes("sinh lời")) {
      if (isVi) {
        return `### 📈 Gợi Ý Đầu Tư Thực Tế:
- Bạn hiện có quỹ heo đất dự trữ **${formatCurrency(piggy)}**. 
- Nên giữ lại ít nhất 3-6 tháng chi phí sinh hoạt làm quỹ khẩn cấp trước khi đầu tư mạo hiểm.
- Bạn có thể tham khảo đầu tư tích lũy an toàn với lãi suất gửi tiết kiệm, hoặc phân bổ một phần nhỏ vào các quỹ ETF chỉ số chứng khoán uy tín.`
      } else {
        return `### 📈 Practical Investment Advice:
- You currently have a Piggy Bank pool of **${formatCurrency(piggy)}**.
- Retain at least 3-6 months of living expenses as an emergency fund before investing in risky assets.
- Consider low-risk compounding savings options or allocate a small portion into reputable ETF index funds.`
      }
    }

    // Default responses
    if (isVi) {
      return `Finova AI đã ghi nhận yêu cầu của bạn!
Để có tư vấn sát nhất, bạn có thể nhấn vào các gợi ý bên dưới hoặc hỏi tôi về:
1. "Phân tích tài chính"
2. "Lời khuyên tiết kiệm"
3. "Lời khuyên đầu tư"`
    } else {
      return `Finova AI has received your query!
For the best analysis, click the suggestions below or ask me about:
1. "Financial analysis"
2. "Saving tips"
3. "Investment advice"`
    }
  }

  const handleSend = (text: string) => {
    if (!text.trim()) return

    const userMsg: Message = {
      id: createMessageId(),
      sender: "user",
      text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMsg])
    setInputVal("")
    setIsTyping(true)

    // Simulate real-time stream typing delay
    setTimeout(() => {
      const responseText = getSmartResponse(text)
      const botMsg: Message = {
        id: createMessageId(),
        sender: "bot",
        text: responseText,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMsg])
      setIsTyping(false)
    }, 1200)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend(inputVal)
    }
  }

  const suggestions = isVi
    ? [
        { label: "Phân tích chi tiêu", query: "Phân tích tình hình tài chính của tôi" },
        { label: "Cách tiết kiệm tiền", query: "Cho tôi mẹo tiết kiệm tiền" },
        { label: "Tư vấn đầu tư", query: "Tôi nên đầu tư như thế nào?" }
      ]
    : [
        { label: "Analyze spending", query: "Analyze my financial status" },
        { label: "How to save money", query: "Give me saving tips" },
        { label: "Investment advice", query: "How should I invest?" }
      ]

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl hover:scale-110 hover:shadow-indigo-500/25 active:scale-95 transition-all duration-300 border border-white/10"
        title="Trợ lý ảo Finova AI"
      >
        {isOpen ? <X className="size-6 animate-in spin-in duration-300" /> : <BrainCircuit className="size-6 animate-pulse" />}
      </button>

      {/* Floating Chat Window with Premium Glassmorphism */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-50 w-[360px] sm:w-[400px] h-[550px] flex flex-col border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300 select-none">
          {/* Header */}
          <CardHeader className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 text-white p-5 flex flex-row items-center justify-between border-none">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <Bot className="size-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-black flex items-center gap-1.5 leading-none">
                  Finova AI Advisor <Sparkles className="size-3.5 text-amber-300 animate-pulse" />
                </CardTitle>
                <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest mt-1">Real-time Analysis</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white"
            >
              <X className="size-5" />
            </button>
          </CardHeader>

          {/* Messages Area */}
          <CardContent className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => {
              const isBot = msg.sender === "bot"
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 max-w-[85%] text-xs leading-relaxed",
                    isBot ? "mr-auto" : "ml-auto flex-row-reverse"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                    isBot ? "bg-indigo-100 text-indigo-600 dark:bg-zinc-800 dark:text-indigo-400" : "bg-primary text-primary-foreground"
                  )}>
                    {isBot ? <Bot className="size-4" /> : <User className="size-4" />}
                  </div>
                  <div className={cn(
                    "p-3.5 rounded-2xl border shadow-xs whitespace-pre-wrap",
                    isBot 
                      ? "bg-muted/40 border-border/50 text-foreground" 
                      : "bg-indigo-600 border-indigo-700 text-white rounded-tr-none"
                  )}>
                    {msg.text}
                  </div>
                </div>
              )
            })}

            {isTyping && (
              <div className="flex gap-3 max-w-[85%] text-xs mr-auto items-center">
                <div className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-zinc-800 dark:text-indigo-400 flex items-center justify-center">
                  <Loader2 className="size-4 animate-spin" />
                </div>
                <div className="p-3 bg-muted/40 border border-border/50 text-muted-foreground rounded-2xl flex items-center gap-1">
                  <span>AI đang phân tích</span>
                  <span className="animate-bounce font-black">.</span>
                  <span className="animate-bounce font-black delay-150">.</span>
                  <span className="animate-bounce font-black delay-300">.</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Suggestions Panel */}
          {messages.length === 1 && !isTyping && (
            <div className="px-5 pb-2 flex flex-wrap gap-2 shrink-0">
              {suggestions.map((sug) => (
                <button
                  key={sug.label}
                  onClick={() => handleSend(sug.query)}
                  className="px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-zinc-900 border border-indigo-100 dark:border-zinc-800 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer hover:scale-102 active:scale-98"
                >
                  {sug.label} <ArrowRight className="size-3" />
                </button>
              ))}
            </div>
          )}

          {/* Footer Input */}
          <CardFooter className="p-4 border-t border-border/40 flex items-center gap-2 bg-muted/20">
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isVi ? "Nhập câu hỏi tài chính..." : "Ask financial advice..."}
              className="flex-1 rounded-xl h-10 border-border/50 bg-background/50 focus-visible:ring-indigo-500/20"
            />
            <Button
              onClick={() => handleSend(inputVal)}
              disabled={!inputVal.trim() || isTyping}
              size="icon"
              className="rounded-xl h-10 w-10 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            >
              <Send className="size-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </>
  )
}
