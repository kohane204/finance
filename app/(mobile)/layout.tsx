import type { Metadata } from "next"
import "../globals.css"

export const metadata: Metadata = {
  title: "Finova Bank Link",
  description: "Secure bank account linking portal",
}

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Completely isolated layout — no auth, no sidebar, no providers
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="color-scheme" content="light" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { 
            min-height: 100%; 
            background: #fff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            -webkit-tap-highlight-color: rgba(0,0,0,0.05);
          }
        `}</style>
      </head>
      <body suppressHydrationWarning style={{ minHeight: '100dvh', background: '#ffffff' }}>
        {children}
      </body>
    </html>
  )
}
