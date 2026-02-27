import type React from "react"
import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import "./globals.css"
import { AIChatAssistant } from "../components/ai-chat-assistant"
import { CartSidebarProvider } from "@/lib/cart-sidebar-context"
import { AuthProvider } from "@/lib/auth-context"
import { WelcomeModal } from "@/components/welcome-modal"

const _inter = Inter({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "QuickKart - Fashion & Lifestyle E-Commerce",
  description:
    "Discover the latest trends in fashion, footwear, accessories and more. Shop premium brands with free delivery and easy returns.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          <CartSidebarProvider>
            {children}
            <WelcomeModal />
          </CartSidebarProvider>
        </AuthProvider>
        <AIChatAssistant />
      </body>
    </html>
  )
}
