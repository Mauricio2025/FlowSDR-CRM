import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

// CONFIGURAÇÃO DO FAVICON E SEO
export const metadata: Metadata = {
  title: 'FlowSDR | CRM Inteligente',
  description: 'Gerenciamento de leads e geração de mensagens com IA',
  generator: 'v0.app',
  icons: {
    // Aqui definimos o seu icone.png como o ícone principal (favicon)
    icon: '/icone.png', 
    apple: '/icone.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-[#0B1222] text-foreground`}>
        {children}
        {/* O Analytics só roda em produção para não poluir seus dados de teste */}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}