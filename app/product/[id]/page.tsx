"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductGrid } from "@/components/product-grid"
import { SimilarProducts } from "@/components/similar-products"
import { AIOutfitModal } from "@/components/ai-outfit-modal"
import { AIChatAssistant } from "@/components/ai-chat-assistant"
import { ProductQuestionsAnswers } from "@/components/product-qa"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { trackCategoryView, trackPurchase } from "@/lib/user-context"
import { addRecentlyViewed } from "@/lib/recently-viewed"
import { useProductCompare, ProductCompareModal } from "@/hooks/use-product-compare"
import { useCart } from "@/hooks/use-cart"
import { useToast } from "@/hooks/use-toast"
import { useCartSidebar } from "@/lib/cart-sidebar-context"
import { useReviews } from "@/hooks/use-reviews"
import { Heart, Share2, Truck, RotateCcw, ShieldCheck, Sparkles, Star, ChevronRight, Minus, Plus, CheckCircle2, GitCompare } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ProductImage {
  id: number
  image_url: string
  alt_text?: string
  display_order: number
  is_primary: boolean
}

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
  sizes?: string[]
  colors?: string[]
  images?: string[]
  imagesList?: ProductImage[]
  deliveryDays?: number
}

const renderStars = (value: number) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${index < Math.round(value) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
      />
    ))}
  </div>
)

export default function ProductDetailPage() {
  const params = useParams()
  const productId = params.id as string
  const { addToCart } = useCart()
  const { toast } = useToast()
  const { openCartSidebar } = useCartSidebar()
  const { addToCompare, isInCompare, canAdd } = useProductCompare()
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)
  const { addReview, getProductReviews, getAverageRating, getRatingDistribution, markHelpful } = useReviews()
  const [reviewTitle, setReviewTitle] = useState("")
  const [reviewComment, setReviewComment] = useState("")
  const [reviewAuthor, setReviewAuthor] = useState("")
  const [reviewRating, setReviewRating] = useState(5)

  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [showAIModal, setShowAIModal] = useState(false)

  // Fetch single product by ID from backend
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/products/${productId}`)
        if (res.ok) {
          const p = await res.json()
          // Normalize images list
          const imagesList = (p.images || []).sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
          const imagesArray = imagesList.length > 0 ? imagesList.map((img: any) => img.image_url) : [p.image_url || '/placeholder.svg']

          const transformedProducts = [{
            // Get images array - prioritize p.images if available
            id: String(p.id),
            name: p.name,
            brand: p.category || 'Unknown Brand',
            category: p.category || 'general',
            price: p.price,
            originalPrice: p.price,
            discount: 0,
            rating: p.rating || 0,
            reviewCount: 0,
            image: p.image_url || '/placeholder.svg',
            stock: p.stock,
            sizes: ["XS", "S", "M", "L", "XL"],
            colors: ["Default"],
            images: imagesArray,
            imagesList: imagesList,
            deliveryDays: 5
          }]
          setProducts(transformedProducts)
          const foundProduct = transformedProducts.find((p: Product) => p.id === productId)
          setProduct(foundProduct || null)
        }
      } catch (error) {
        console.error('Error fetching product:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  const productReviews = useMemo(() => getProductReviews(productId), [getProductReviews, productId])
  const averageRating = useMemo(() => {
    const localAverage = getAverageRating(productId)
    if (localAverage) return localAverage
    return product?.rating || 0
  }, [getAverageRating, product?.rating, productId])
  const ratingDistribution = useMemo(() => getRatingDistribution(productId), [getRatingDistribution, productId])
  const reviewCount = productReviews.length || product?.reviewCount || 0

  // Track product view and category
  useEffect(() => {
    if (product) {
      if (product.category) {
        trackCategoryView(product.category)
      }
      addRecentlyViewed(product.id)
    }
  }, [product])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading product...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }


  const handleSubmitReview = async () => {
    if (!reviewTitle.trim() || !reviewComment.trim() || !reviewAuthor.trim()) {
      toast({ title: "Add details", description: "Please add your name, a title, and a comment.", variant: "destructive" })
      return
    }
    const safeRating = Math.min(5, Math.max(1, Number(reviewRating)))
    addReview({
      productId,
      rating: safeRating,
      title: reviewTitle.trim(),
      comment: reviewComment.trim(),
      author: reviewAuthor.trim(),
    })
    const updatedReviews = getProductReviews(productId)
    const newAverage = updatedReviews.length
      ? Math.round((updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length) * 10) / 10
      : safeRating

    // Update local product card immediately
    setProduct((prev) => (prev ? { ...prev, rating: newAverage, reviewCount: updatedReviews.length } : prev))

    // Persist the new average rating to backend so listing pages also reflect it
    try {
      await fetch(`${BACKEND_URL}/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: newAverage }),
      })
    } catch (error) {
      console.error("Failed to sync rating to backend", error)
    }

    setReviewTitle("")
    setReviewComment("")
    setReviewAuthor("")
    setReviewRating(5)
    toast({ title: "Thanks for your review", description: "Your feedback was saved locally." })
  }
  // Show not found state
  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
            <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist.</p>
            <Button onClick={() => window.location.href = '/products'}>Browse Products</Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const sizes = product.sizes || ["XS", "S", "M", "L", "XL"]
  const colors = product.colors || ["Default"]
  const images = product.images || [product.image, product.image, product.image, product.image]
  const similarProducts = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 5)
  
  // Calculate delivery date
  const deliveryDate = new Date()
  deliveryDate.setDate(deliveryDate.getDate() + (product.deliveryDays || 5))
  const formattedDeliveryDate = deliveryDate.toLocaleDateString('en-IN', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  })

  const handleAddToCompare = () => {
    if (addToCompare(product.id)) {
      toast({
        title: "Added to Compare",
        description: `${product.name} added to comparison list`,
      })
    } else {
      toast({
        title: "Cannot Add",
        description: "Comparison list is full or product already added",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-1">
          <Link href="/" className="hover:text-foreground cursor-pointer">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="hover:text-foreground cursor-pointer">{product.category}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{product.brand}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="flex flex-col-reverse md:flex-row gap-4">
            {/* Thumbnails */}
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative w-16 h-20 md:w-20 md:h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === index ? "border-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  <Image
                    src={img || "/placeholder.svg"}
                    alt={`${product.name} ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div className="flex-1 relative aspect-[3/4] rounded-xl overflow-hidden bg-secondary">
              <Image
                src={images[selectedImage] || "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button className="p-2.5 bg-background rounded-full shadow-md hover:bg-secondary transition-colors">
                  <Heart className="h-5 w-5 text-muted-foreground hover:text-primary" />
                </button>
                <button className="p-2.5 bg-background rounded-full shadow-md hover:bg-secondary transition-colors">
                  <Share2 className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              {product.discount && (
                <span className="absolute top-4 left-4 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg">
                  {product.discount}% OFF
                </span>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-foreground">{product.brand}</h1>
              <p className="text-lg text-muted-foreground mt-1">{product.name}</p>
            </div>

            {/* Rating */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-2.5 py-1 bg-green-600 text-white text-sm font-medium rounded">
                  <span>{averageRating.toFixed(1)}</span>
                  <Star className="h-3.5 w-3.5 fill-current" />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {renderStars(averageRating)}
                  <span>({reviewCount} {reviewCount === 1 ? "rating" : "ratings"})</span>
                </div>
              </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6 pb-6 border-b border-border">
              <span className="text-3xl font-bold text-foreground">₹{product.price.toFixed(0)}</span>
              {product.originalPrice && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    ₹{product.originalPrice.toFixed(0)}
                  </span>
                  <span className="text-lg text-primary font-medium">({product.discount}% off)</span>
                </>
              )}
            </div>

            {/* Size Selection */}
            {/* Size Selection - Only show for clothing categories */}
            {(product.category?.toLowerCase().includes('fashion') || 
              product.category?.toLowerCase().includes('clothing') ||
              product.category?.toLowerCase().includes('footwear') ||
              product.category?.toLowerCase().includes('apparel')) && (
              <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">Select Size</span>
                <button className="text-sm text-primary font-medium hover:underline">Size Guide</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-14 h-12 rounded-lg border-2 text-sm font-medium transition-colors ${
                      selectedSize === size
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50 text-foreground"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <span className="text-sm font-semibold text-foreground block mb-3">Quantity</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center border border-border rounded-lg hover:bg-secondary transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center border border-border rounded-lg hover:bg-secondary transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Button 
                size="lg" 
                className="flex-1"
                onClick={() => {
                  addToCart({
                    id: product.id,
                    name: product.name,
                    brand: product.brand,
                    price: product.price,
                    image: product.image,
                  })
                  toast({
                    title: "Added to Cart ✓",
                    description: `${product.name} added to your cart successfully`,
                    duration: 2000,
                  })
                  openCartSidebar()
                  trackPurchase(product.id, product.category)
                }}
              >
                Add to Bag
              </Button>
              <Button variant="outline" size="lg" className="flex-1 bg-transparent">
                <Heart className="h-5 w-5 mr-2" />
                Wishlist
              </Button>
            </div>

            {/* AI Outfit Check Button */}
            <button
              onClick={() => setShowAIModal(true)}
              className="w-full py-3 px-4 border border-border rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors mb-6"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              AI Outfit Check
            </button>

            {/* Delivery Info */}
            <div className="space-y-4 pt-6 border-t border-border">
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Free Delivery</p>
                  <p className="text-xs text-muted-foreground">On orders above $50</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RotateCcw className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Easy 30-Day Returns</p>
                  <p className="text-xs text-muted-foreground">Free returns within 30 days</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">100% Authentic</p>
                  <p className="text-xs text-muted-foreground">Guaranteed genuine products</p>
                </div>
              </div>
            </div>

            {/* Product Description */}
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">Product Details</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Premium quality fabric for all-day comfort</li>
                <li>• Regular fit with modern styling</li>
                <li>• Machine washable</li>
                <li>• Imported</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Ratings & Reviews */}
        <div className="mt-12 grid lg:grid-cols-[300px,1fr] gap-10">
          <div className="p-6 rounded-xl border border-border bg-secondary/30">
            <p className="text-sm text-muted-foreground mb-2">Overall rating</p>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl font-bold text-foreground">{averageRating.toFixed(1)}</span>
              <div>
                {renderStars(averageRating)}
                <p className="text-xs text-muted-foreground">Based on {reviewCount} {reviewCount === 1 ? "review" : "reviews"}</p>
              </div>
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((score) => {
                const total = Math.max(reviewCount, 1)
                const count = ratingDistribution[score as keyof typeof ratingDistribution] || 0
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={score} className="flex items-center gap-3 text-sm">
                    <span className="w-8 text-right text-muted-foreground">{score}★</span>
                    <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="w-10 text-muted-foreground text-xs">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-8">
            <div className="p-6 border border-border rounded-xl">
              <h3 className="text-lg font-semibold text-foreground mb-4">Write a review</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Your name</label>
                  <Input value={reviewAuthor} onChange={(e) => setReviewAuthor(e.target.value)} placeholder="Add your name" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Rating (1-5)</label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-muted-foreground">Title</label>
                  <Input value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} placeholder="Short headline" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-muted-foreground">Your review</label>
                  <Textarea
                    rows={4}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share details about quality, fit, delivery, etc."
                  />
                </div>
              </div>
              <Button className="mt-4" onClick={handleSubmitReview}>Submit review</Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Recent reviews</h3>
                <span className="text-sm text-muted-foreground">{reviewCount} total</span>
              </div>
              {productReviews.length === 0 && (
                <div className="border border-dashed border-border rounded-lg p-6 text-center text-muted-foreground">
                  Be the first to review this product.
                </div>
              )}
              {productReviews.map((review) => (
                <div key={review.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm font-semibold text-foreground">{review.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">By {review.author}</p>
                    </div>
                    <button
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      onClick={() => markHelpful(review.id)}
                    >
                      Helpful
                      <span className="text-foreground font-medium">{review.helpful}</span>
                    </button>
                  </div>
                  <p className="text-sm text-foreground mt-3">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Similar Products */}
        <div className="mt-12">
          <SimilarProducts 
            productId={productId}
            title="Customers Also Bought"
            subtitle="Products similar to this one"
            limit={5}
          />
        </div>
      </main>
      <Footer />
      {/* Floating AI Chat Assistant */}
      <AIChatAssistant />

      {/* AI Outfit Modal */}
      <AIOutfitModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        product={{
          name: product.name,
          brand: product.brand,
          image: product.image,
          category: product.category,
        }}
      />
    </div>
  )
}
