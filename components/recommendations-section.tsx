"use client"

import { useEffect, useState } from "react"
import { ProductGrid } from "@/components/product-grid"
import { getRecommendations, type Recommendation } from "@/lib/api"
import { getPurchaseHistory, getInterests } from "@/lib/user-context"
import { products } from "@/lib/data"

export function RecommendationsSection() {
  const [recommendedProducts, setRecommendedProducts] = useState(products.slice(5, 10)) // Fallback to static data
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setIsLoading(true)
        // Get user context for personalization
        const purchaseHistory = getPurchaseHistory()
        const interests = getInterests()
        
        const data = await getRecommendations(purchaseHistory, interests)
        if (data.length > 0) {
          setRecommendedProducts(data)
        }
      } catch (error) {
        console.error("Failed to load recommendations:", error)
        // Keep fallback data on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendations()

    // Listen for storage changes to refresh recommendations when user context updates
    const handleStorageChange = () => {
      fetchRecommendations()
    }
    
    window.addEventListener('storage', handleStorageChange)
    // Also listen for custom event for same-tab updates
    window.addEventListener('userContextChanged', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('userContextChanged', handleStorageChange)
    }
  }, [])

  // Map API response to match ProductGrid interface
  const mappedProducts = recommendedProducts.map((rec) => ({
    id: rec.id,
    name: rec.name,
    brand: rec.brand,
    price: rec.price,
    image: rec.image,
    rating: rec.rating,
    reviewCount: rec.reviewCount,
    category: rec.category,
  }))

  return (
    <ProductGrid 
      title="Recommended for You" 
      products={mappedProducts} 
      showPersonalized={true} 
    />
  )
}
