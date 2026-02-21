"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import { ProductFilters } from "@/components/product-filters"
import { AIChatAssistant } from "@/components/ai-chat-assistant"
import { ProductComparisonSidebar, ComparisonModal } from "@/components/product-comparison-sidebar"
import { ChevronDown, SlidersHorizontal, X } from "lucide-react"

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

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get("search") || ""
  const [sortBy, setSortBy] = useState("recommended")
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState({ min: 0, max: 500000 })
  const [selectedRating, setSelectedRating] = useState(0) // 0 = all, 3 = 3+, 4 = 4+, 4.5 = 4.5+, 5 = 5 only
  const [products, setProducts] = useState<Product[]>([])
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [showComparisonModal, setShowComparisonModal] = useState(false)

  // Fetch products from backend based on URL params
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        
        // Get category and subcategory from URL
        const category = searchParams.get("category")
        const subcategory = searchParams.get("subcategory")
        
        // Update state
        setSelectedCategory(category ? decodeURIComponent(category) : null)
        setSelectedSubcategory(subcategory ? decodeURIComponent(subcategory) : null)
        
        // Build URL with category/search filter if present
        const params = new URLSearchParams()
        if (category) {
          params.set("category", category)
        }

        let url = `${BACKEND_URL}/api/products`
        if (searchQuery) {
          params.set("query", searchQuery)
          url = `${BACKEND_URL}/api/products/search/smart?${params.toString()}`
        } else {
          const queryString = params.toString()
          if (queryString) {
            url += `?${queryString}`
          }
        }
        
        console.log('Fetching from:', url)
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          const rawProducts = searchQuery ? (data.results || []) : data
          const suggestions = searchQuery ? (data.suggestions || []) : []
          setSearchSuggestions(suggestions)
          console.log(`Fetched ${rawProducts.length} products from backend${category ? ` (category: ${category})` : ''}`)
          
          // Transform backend products to match frontend format
          const transformedProducts = rawProducts.map((p: any) => {
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
          console.log('Transformed products:', transformedProducts.length)
          setProducts(transformedProducts)
        } else {
          console.error('Failed to fetch products:', res.status, res.statusText)
        }
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [searchParams])

  const sortOptions = [
    { value: "recommended", label: "Recommended" },
    { value: "newest", label: "What's New" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
    { value: "rating", label: "Customer Rating" },
    { value: "discount", label: "Better Discount" },
  ]

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = [...products]

    // Search filtering is handled by the backend when a search query is provided

    // Apply subcategory filter (Men/Women/Kids) by checking product name
    if (selectedSubcategory) {
      const subcategory = selectedSubcategory.toLowerCase()
      filtered = filtered.filter((p) => 
        p.name.toLowerCase().includes(subcategory) ||
        p.name.toLowerCase().includes(`${subcategory}'s`) ||
        p.name.toLowerCase().includes(`${subcategory}s`)
      )
    }

    // Note: Category filter is now handled by backend API
    // No need to filter by category here since backend already filtered

    // Apply price filter
    filtered = filtered.filter((p) => p.price >= priceRange.min && p.price <= priceRange.max)

    // Apply rating filter
    if (selectedRating > 0) {
      filtered = filtered.filter((p) => (p.rating || 0) >= selectedRating)
    }

    // Apply sort
    if (sortBy === "price-low") {
      filtered.sort((a, b) => a.price - b.price)
    } else if (sortBy === "price-high") {
      filtered.sort((a, b) => b.price - a.price)
    } else if (sortBy === "rating") {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    } else if (sortBy === "discount") {
      filtered.sort((a, b) => (b.discount || 0) - (a.discount || 0))
    }

    return filtered
  }, [products, searchQuery, selectedSubcategory, priceRange, selectedRating, sortBy])

  const handleCompareChange = (productId: string, isSelected: boolean) => {
    if (isSelected) {
      if (compareIds.length < 4) {
        setCompareIds([...compareIds, productId])
      }
    } else {
      setCompareIds(compareIds.filter((id) => id !== productId))
    }
  }

  const comparisonProducts = products.filter((p) => compareIds.includes(p.id))

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground cursor-pointer">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">All Products</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            {searchQuery ? (
              <>
                <h1 className="text-2xl font-bold text-foreground">
                  Search Results for "{searchQuery}"
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredProducts.length} item{filteredProducts.length !== 1 ? "s" : ""} found
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-foreground">All Products</h1>
                <p className="text-sm text-muted-foreground mt-1">{filteredProducts.length} items found</p>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none px-4 py-2 pr-10 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort by: {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <ProductFilters
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              priceRange={priceRange}
              onPriceChange={setPriceRange}
              selectedRating={selectedRating}
              onRatingChange={setSelectedRating}
            />
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading products...</p>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <h3 className="text-xl font-semibold text-foreground mb-2">No products found</h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your search or filters to find what you're looking for.
                </p>
                {searchQuery && searchSuggestions.length > 0 && (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">Did you mean?</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {searchSuggestions.map((suggestion) => (
                        <Link
                          key={suggestion}
                          href={`/products?search=${encodeURIComponent(suggestion)}`}
                          className="px-3 py-1.5 rounded-full bg-secondary text-xs text-foreground hover:bg-secondary/80 transition-colors"
                        >
                          {suggestion}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      {...product}
                      onCompareChange={handleCompareChange}
                      isComparing={compareIds.includes(product.id)}
                    />
                  ))}
                </div>

                {/* Load More */}
                <div className="mt-8 text-center">
                  <button className="px-8 py-3 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
                    Load More Products
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <AIChatAssistant />

      {/* Mobile Filters Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute inset-y-0 left-0 w-full max-w-xs bg-background overflow-y-auto">
            <ProductFilters
              isMobile
              onClose={() => setShowMobileFilters(false)}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              priceRange={priceRange}
              onPriceChange={setPriceRange}
              selectedRating={selectedRating}
              onRatingChange={setSelectedRating}
            />
          </div>
        </div>
      )}

      {/* Comparison Sidebar */}
      <ProductComparisonSidebar
        products={comparisonProducts}
        onRemove={(id) => setCompareIds(compareIds.filter((pid) => pid !== id))}
        onCompare={() => setShowComparisonModal(true)}
      />

      {/* Comparison Modal */}
      {showComparisonModal && (
        <ComparisonModal
          products={comparisonProducts}
          onClose={() => setShowComparisonModal(false)}
        />
      )}
    </div>
  )
}
