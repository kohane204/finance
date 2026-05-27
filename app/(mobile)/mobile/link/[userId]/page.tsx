"use client"
// Trigger recompile to fix stale dev server errors

import React, { useState, useEffect } from "react"
import { updateAccountBalanceAction } from "@/app/actions"
import { translations, Language } from "@/lib/i18n/translations"

const ALL_BANKS = [
  { id: "v_vcb", name: "Vietcombank", fullName: "Ngân hàng Ngoại thương Việt Nam", color: "#005a3c", deepLink: "vietcombank://" },
  { id: "v_mbb", name: "MB Bank", fullName: "Ngân hàng TMCP Quân đội", color: "#0b2889", deepLink: "mbbank://" },
  { id: "v_tcb", name: "Techcombank", fullName: "Ngân hàng Kỹ thương Việt Nam", color: "#e31837", deepLink: "tcb-mobile://" },
  { id: "v_acb", name: "ACB", fullName: "Ngân hàng TMCP Á Châu", color: "#005baa", deepLink: "acb-mobile://" },
  { id: "v_vpb", name: "VPBank", fullName: "Ngân hàng TMCP Thịnh Vượng", color: "#00a859", deepLink: "vpb-mb://" },
  { id: "v_bid", name: "BIDV", fullName: "Ngân hàng Đầu tư và Phát triển", color: "#1c4791", deepLink: "bidvsmartotp://" },
  { id: "v_tpb", name: "TPBank", fullName: "Ngân hàng Tiên Phong", color: "#5c2d91", deepLink: "tpbank://" }
]

// Icons
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
)
const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2">
    <path d="m9 18 6-6-6-6"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const CheckCircle = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

const CameraIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
)
const AppIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M12 3v18"/><path d="M3 12h18"/>
  </svg>
)

export default function MobileLinkPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: rawUserId } = React.use(params)
  const [step, setStep] = useState(1) // 1: Select, 2: Camera, 3: Confirm, 4: Done
  const [search, setSearch] = useState("")
  const [selectedBank, setSelectedBank] = useState<{ id: string, name: string, color: string, deepLink: string, fullName: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [lang, setLang] = useState<Language>("vi")
  
  // Dynamic fields
  const [accountNumber, setAccountNumber] = useState("")
  const [balance, setBalance] = useState("12500000")
  const [holderName, setHolderName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const videoRef = React.useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Basic lang detection from cookie
    const lValue = document.cookie.split('; ').find(row => row.startsWith('lang='))?.split('=')[1]
    if (lValue === 'en') setLang('en')

    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const t = translations[lang]
  const userId = rawUserId || ""

  const filteredBanks = ALL_BANKS.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.fullName.toLowerCase().includes(search.toLowerCase())
  )

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setStep(2) // Show scanning effect
      setIsAnalyzing(true)
      
      try {
        const Tesseract = (window as Window & { Tesseract?: { recognize: (file: File | Blob | string, lang: string) => Promise<{ data: { text: string } }> } }).Tesseract
        if (Tesseract) {
          const { data: { text } } = await Tesseract.recognize(file, 'eng')
          analyzeOCRText(text)
        }
      } catch (err: unknown) {
        console.error("OCR Error:", err)
      } finally {
        setIsAnalyzing(false)
        setStep(3)
      }
    }
  }

  const analyzeOCRText = (text: string) => {
    console.log("OCR Result:", text)
    // Extract Number (12-16 digits)
    const numbers = text.match(/\d{12,19}/g)
    if (numbers && numbers.length > 0) setAccountNumber(numbers[0])

    // Extract Expiry (MM/YY)
    const dates = text.match(/\d{2}\/\d{2}/g)
    if (dates && dates.length > 0) setExpiryDate(dates[0])

    // Extract Holder Name (ALL CAPS)
    const lines = text.split('\n')
    const nameLine = lines.find(l => l.trim().length > 5 && /^[A-Z\s]+$/.test(l.trim()))
    if (nameLine) setHolderName(nameLine.trim())

    // CVV is harder, often on back or last 3 digits of a line
    const cvvMatch = text.match(/\b\d{3}\b/)
    if (cvvMatch) setCvv(cvvMatch[0])
  }

  const startCamera = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream
    const isHTTP = typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost'

    if ((isIOS || isHTTP) && fileInputRef.current) {
       fileInputRef.current.click()
       return
    }

    setStep(2)
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        
        // Mock OCR result for live stream after 4s
        setTimeout(() => {
          stopCamera()
          const randomAcc = "1028" + Math.floor(10000000 + Math.random() * 89999999)
          setAccountNumber(randomAcc)
          setStep(3)
        }, 4000)
      } else {
        if (fileInputRef.current) fileInputRef.current.click()
        else setStep(3)
      }
    } catch (err: unknown) {
      console.error(err)
      if (fileInputRef.current) fileInputRef.current.click()
      else setStep(3)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
       const stream = videoRef.current.srcObject as MediaStream
       stream.getTracks().forEach(track => track.stop())
    }
  }

  const [accountId, setAccountId] = useState("")
  const [syncedBalance, setSyncedBalance] = useState(0)

  const handleLink = async () => {
    if (!selectedBank) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/mobile/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: selectedBank.name,
          type: "Credit Card",
          balance,
          accountNumber,
          bankId: selectedBank.name,
          holderName,
          expiryDate,
          cvv
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t.operationError)
      
      setAccountId(data.id)
      setSyncedBalance(parseFloat(balance) / (lang === 'vi' ? 26000 : 1))
      setStep(4)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSimulateTransaction = async () => {
    setLoading(true)
    const spendAmt = lang === 'vi' ? 100000 : 5
    const newBal = syncedBalance - (spendAmt / (lang === 'vi' ? 26000 : 1))
    try {
       await updateAccountBalanceAction(accountId, newBal.toFixed(2))
       setSyncedBalance(newBal)
    } catch (err: unknown) {
       console.error(err)
    } finally {
       setLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: lang === 'vi' ? 'VND' : 'USD'
    }).format(Math.round(val * (lang === 'vi' ? 26000 : 1)))
  }

  const S: Record<string, React.CSSProperties> = {
    page: { minHeight: "100dvh", backgroundColor: "#ffffff", color: "#1e293b", display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    banner: { backgroundColor: "#f8fafc", padding: "14px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" },
    bannerText: { fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#64748b" },
    body: { flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 24 },
    h1: { fontSize: 28, fontWeight: 900, color: "#0f172a", margin: 0 },
    searchWrap: { position: "relative" as const },
    searchInput: { width: "100%", padding: "0 16px 0 48px", height: 56, borderRadius: 16, border: "1px solid #e2e8f0", backgroundColor: "#f1f5f9", outline: "none", boxSizing: "border-box" as const },
    bankRowBase: { display: "flex", alignItems: "center", gap: 16, padding: 16, borderRadius: 16, border: "2px solid", width: "100%", backgroundColor: "#f8fafc" },
    logo: { width: 48, height: 48, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 20 },
    stickyBtn: { position: "fixed" as const, bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: "#ffffff", borderTop: "1px solid #f1f5f9", zIndex: 100 },
    btn: { width: "100%", height: 60, backgroundColor: "#0f172a", color: "white", fontWeight: 700, borderRadius: 16, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 },
    btnGreen: { backgroundColor: "#10b981" },
    cameraBox: { width: "100%", aspectRatio: "4/3", backgroundColor: "#000", borderRadius: 24, overflow: "hidden", position: "relative" as const },
    scanLine: { position: "absolute" as const, top: 0, left: 0, width: "100%", height: 4, backgroundColor: "#10b981", boxShadow: "0 0 10px #10b981", animation: "scan 2s infinite" },
    viewfinder: { position: "absolute" as const, top: "20%", left: "10%", right: "10%", bottom: "20%", border: "2px solid rgba(255,255,255,0.5)", borderRadius: 12 },
    card: { backgroundColor: "#f8fafc", padding: 20, borderRadius: 20, border: "1px solid #e2e8f0" },
    h2: { fontSize: 22, fontWeight: 800 },
    para: { fontSize: 13, color: "#64748b", lineHeight: 1.5 },
    appBtn: { display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 100, border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 600, color: "#475569", width: "fit-content", textDecoration: "none" }
  }

  return (
    <div style={S.page}>
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        style={{ display: "none" }} 
        onChange={handleFileCapture} 
      />
      <div style={S.banner}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><ShieldIcon /><span style={S.bannerText}>AI Smart Sync active</span></div>
      </div>

      <div style={S.body}>
        {step === 1 && (
          <>
            <div><h1 style={S.h1}>{t.linkBank}</h1><p style={{ fontSize: 14, color: "#64748b" }}>{t.bankLinkDesc}</p></div>
            <div style={S.searchWrap}><span style={{ position: "absolute", left: 16, top: 18 }}><SearchIcon /></span>
              <input type="search" placeholder="Vietcombank, MB..." style={S.searchInput} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredBanks.map(bank => (
                <button key={bank.id} onClick={() => setSelectedBank(bank)} style={{ ...S.bankRowBase, borderColor: selectedBank?.id === bank.id ? "#10b981" : "#f1f5f9", backgroundColor: selectedBank?.id === bank.id ? "#f0fdf4" : "#f8fafc" }}>
                  <div style={{ ...S.logo, backgroundColor: bank.color }}>{bank.name[0]}</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontWeight: 700, margin: 0 }}>{bank.name}</p>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>{bank.fullName}</span>
                  </div>
                  {selectedBank?.id === bank.id ? <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}><CheckIcon /></div> : <ChevronRight />}
                </button>
              ))}
            </div>
            {selectedBank && (<div style={S.stickyBtn}><button style={S.btn} onClick={startCamera}>{t.scanActivity} <CameraIcon /></button></div>)}
          </>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
             <h2 style={S.h2}>{isAnalyzing ? t.scanning : t.ensureStableConnection}</h2>
             <div style={S.cameraBox}>
                <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
                <div style={S.viewfinder} />
                <div style={S.scanLine} />
             </div>
             <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={S.para}>
                   {isAnalyzing 
                    ? t.aiAnalyzing
                    : t.placeCardFront.replace("{bank}", selectedBank?.name || "")}
                </p>
                {!isAnalyzing && selectedBank && <a href={selectedBank.deepLink} style={S.appBtn}><AppIcon /> {t.openApp.replace("{bank}", selectedBank.name)}</a>}
             </div>
             <style>{`@keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }`}</style>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
             <h2 style={S.h2}>{t.confirmLabel}</h2>
             <div style={S.card}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                   <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{t.cardHolderName}</label>
                      <input style={{ ...S.searchInput, height: 48, paddingLeft: 16, marginTop: 4, backgroundColor: "white" }} value={holderName} placeholder="NGUYEN VAN A" onChange={e => setHolderName(e.target.value)} />
                   </div>
                   <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{t.accountNumberLabel}</label>
                      <input style={{ ...S.searchInput, height: 48, paddingLeft: 16, marginTop: 4, backgroundColor: "white" }} value={accountNumber} placeholder="1234 5678 9012 3456" onChange={e => setAccountNumber(e.target.value)} />
                   </div>
                   <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                         <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{t.expiryDateLabel}</label>
                         <input style={{ ...S.searchInput, height: 48, paddingLeft: 16, marginTop: 4, backgroundColor: "white" }} value={expiryDate} placeholder="12/28" onChange={e => setExpiryDate(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                         <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>CVV</label>
                         <input style={{ ...S.searchInput, height: 48, paddingLeft: 16, marginTop: 4, backgroundColor: "white" }} type="password" value={cvv} placeholder="***" onChange={e => setCvv(e.target.value)} />
                      </div>
                   </div>
                   <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{t.currentBalanceLabel}</label>
                      <input style={{ ...S.searchInput, height: 48, paddingLeft: 16, marginTop: 4, backgroundColor: "white" }} type="number" value={balance} onChange={e => setBalance(e.target.value)} />
                   </div>
                </div>
             </div>
             {error && <p style={{ color: "#ef4444", fontWeight: 600 }}>{error}</p>}
             <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button onClick={handleLink} disabled={loading} style={{ ...S.btn, ...S.btnGreen }}>{loading ? t.loading : t.finishSync}</button>
                <button style={{ background: "none", border: "none", color: "#94a3b8", fontWeight: 700 }} onClick={() => setStep(1)}>{t.cancel}</button>
             </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, paddingTop: 40 }}>
            <CheckCircle />
            <div style={{ textAlign: "center" }}>
              <h1 style={S.h2}>{t.connected}</h1>
              <p style={S.para}>{t.linkSuccess.replace("{name}", selectedBank?.name || "")}</p>
              <div style={{ marginTop: 12, padding: "12px 16px", backgroundColor: "#f0fdf4", borderRadius: 12, border: "1px solid #dcfce7" }}>
                 <p style={{ fontSize: 13, fontWeight: 700, color: "#166534", margin: 0 }}>{t.availableNow}: {formatCurrency(syncedBalance)}</p>
              </div>
            </div>

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
               <p style={{ ...S.para, textAlign: "center", fontSize: 12 }}>{t.simulateBankDescription}</p>
               <button 
                  onClick={handleSimulateTransaction}
                  disabled={loading}
                  style={{ ...S.btn, backgroundColor: "#f43f5e", opacity: loading ? 0.7 : 1 }}
               >
                  {t.simulateSpentShopee}
               </button>
               <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>{t.desktopUpdateInstantly}</p>
            </div>

            <button style={{ ...S.backBtn, color: "#1e293b", background:'none', border:'none', fontWeight:700 }} onClick={() => window.location.reload()}>{t.finish}</button>
          </div>
        )}
      </div>
    </div>
  )
}
