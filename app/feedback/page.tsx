"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { FeedbackForm } from "@/components/feedback-form"
import { AIChatAssistant } from "@/components/ai-chat-assistant"
import { ChevronRight } from "lucide-react"

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-1">
          <Link href="/" className="hover:text-foreground cursor-pointer">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Feedback</span>
        </nav>

        <div className="py-12">
          <FeedbackForm />
        </div>
      </main>
      <Footer />
      <AIChatAssistant />
    </div>
  )
}
