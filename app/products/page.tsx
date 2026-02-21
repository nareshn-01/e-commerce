"use client"

import { Suspense } from "react"
import ProductsPageContent from "./products-content"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

function ProductsPageFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-500">Loading products...</p>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <Suspense fallback={<ProductsPageFallback />}>
        <ProductsPageContent />
      </Suspense>
      <Footer />
    </div>
  )
}
