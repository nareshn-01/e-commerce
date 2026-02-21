"use client"

import { useEffect, useState } from "react"
import { ProductGrid } from "@/components/product-grid"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Product {
  id: string
  name: string
  brand: string
  category: string
  price: number
  rating: number
  reviewCount?: number
  image: string
  stock?: number
}

interface SimilarProductsProps {
  productId: string
  title?: string
  subtitle?: string
  limit?: number
}

export function SimilarProducts({ 
  productId, 
  title = "Customers Also Bought",
  subtitle = "Products similar to this one",
  limit = 5 
}: SimilarProductsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSimilarProducts() {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE_URL}/api/products/${productId}/similar?limit=${limit}`)
        
        if (res.ok) {
          const data = await res.json()
          const transformed = data.map((p: any) => ({
            id: String(p.id),
            name: p.name,
            brand: p.category || 'Unknown Brand',
            category: p.category || 'general',
            price: p.price,
            rating: p.rating || 0,
            reviewCount: 0,
            image: p.image_url || '/placeholder.svg',
            stock: p.stock
          }))
          setProducts(transformed)
        }
      } catch (error) {
        console.error('Error fetching similar products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSimilarProducts()
  }, [productId, limit])

  if (loading || products.length === 0) {
    return null
  }

  return (
    <ProductGrid 
      title={title}
      subtitle={subtitle}
      products={products}
    />
  )
}
