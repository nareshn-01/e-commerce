"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { products } from "@/lib/data"
import { getRecentlyViewed } from "@/lib/recently-viewed"
import { ProductCard } from "./product-card"

export function RecentlyViewed() {
  const [recentProducts, setRecentProducts] = useState<typeof products>([])

  useEffect(() => {
    const loadRecentProducts = () => {
      if (products.length === 0) {
        setRecentProducts([])
        return
      }
      
      const recent = getRecentlyViewed()
      const productList = recent
        .map(item => products.find(p => p.id === item.id))
        .filter((p): p is typeof products[0] => p !== undefined)
      setRecentProducts(productList)
    }

    loadRecentProducts()

    // Listen for changes
    const handleChange = () => loadRecentProducts()
    window.addEventListener('recentlyViewedChanged', handleChange)
    window.addEventListener('storage', handleChange)

    return () => {
      window.removeEventListener('recentlyViewedChanged', handleChange)
      window.removeEventListener('storage', handleChange)
    }
  }, [])

  if (recentProducts.length === 0) {
    return null
  }

  return (
    <section className="py-12 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Your Recently Viewed</h2>
            <p className="text-muted-foreground mt-1">Based on your browsing history</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {recentProducts.slice(0, 5).map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      </div>
    </section>
  )
}
