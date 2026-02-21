"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { HeroBanner } from "@/components/hero-banner"
import { CategoryRow } from "@/components/category-row"
import { ProductGrid } from "@/components/product-grid"
import { DealsBanner } from "@/components/deals-banner"
import { Footer } from "@/components/footer"
import { AIChatAssistant } from "@/components/ai-chat-assistant"
import { RecommendationsSection } from "@/components/recommendations-section"
import { RecentlyViewed } from "@/components/recently-viewed"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Product {
  id: string
  name: string
  brand: string
  category: string
  price: number
  originalPrice?: number
  discount?: number
  rating: number
  reviewCount?: number
  image: string
  stock?: number
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/products`)
        if (res.ok) {
          const data = await res.json()
          const transformedProducts = data.map((p: any) => {
            const rating = p.rating || 0
            const reviewCount = p.review_count ?? p.reviewCount ?? p.reviews?.length ?? Math.max(1, Math.round(rating * 100))
            return {
              id: String(p.id),
              name: p.name,
              brand: p.category || 'Unknown Brand',
              category: p.category || 'general',
              price: p.price,
              originalPrice: p.price,
              discount: 0,
              rating,
              reviewCount,
              image: p.image_url || '/placeholder.svg',
              stock: p.stock,
            }
          })
          setProducts(transformedProducts)
        }
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const trendingProducts = products.slice(0, 5)
  const newArrivals = products.slice(3, 8)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroBanner />
        <CategoryRow />
        <ProductGrid title="Trending Now" subtitle="Most popular picks this week" products={trendingProducts} />
        <DealsBanner />
        <ProductGrid title="New Arrivals" subtitle="Fresh styles just dropped" products={newArrivals} />
        <RecentlyViewed />
        <RecommendationsSection />
      </main>
      <Footer />
      <AIChatAssistant />
    </div>
  )
}
