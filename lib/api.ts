export interface Recommendation {
  id: string
  name: string
  brand: string
  price: number
  image: string
  category: string
  rating: number
  reviewCount: number
}

export interface VisualSearchResult {
  id: number
  name: string
  price: number
  image_url: string
  category: string
  rating: number
}

interface OutfitAnalysis {
  matchScore: number
  colorHarmony: string
  styleMatch: string
  suggestions: string[]
  aiRecommendations?: Array<{style: string; reason: string}>
  previewImage?: string
  detectedGender?: string
  detectedBodyType?: string
  skinTone?: string
  dominantColors?: string[]
}

interface SizeRecommendation {
  recommended_size: string
  fit_guide: string
  alternatives: string[]
  tips: string[]
}

interface BudgetOptimization {
  budget: number
  items_found: number
  alternatives: Recommendation[]
  savings_tip: string
  recommendations: string[]
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function getRecommendations(
  purchaseHistory?: string[],
  interests?: string[]
): Promise<Recommendation[]> {
  try {
    // First try to get recommendations from AI backend
    const params = new URLSearchParams()
    
    if (purchaseHistory && purchaseHistory.length > 0) {
      params.append('viewed_products', purchaseHistory.join(','))
    }
    
    if (interests && interests.length > 0) {
      params.append('interests', interests.join(','))
    }
    
    params.append('limit', '8')
    
    const url = `${API_BASE_URL}/api/products/recommendations/for-you?${params.toString()}`
    const response = await fetch(url)
    
    if (response.ok) {
      const data = await response.json()
      return data.map((p: any) => ({
        id: String(p.id),
        name: p.name,
        brand: p.category || 'Unknown',
        price: p.price,
        image: p.image_url || '/placeholder.svg',
        category: p.category,
        rating: p.rating || 0,
        reviewCount: 0,
      }))
    }
    
    // Fallback to static data if API fails
    const { products } = await import("@/lib/data")
    
    let recommendations = products.slice()
    
    if (interests && interests.length > 0) {
      recommendations = recommendations.filter(p => 
        interests.some(interest => 
          p.category.toLowerCase().includes(interest.toLowerCase()) ||
          p.tags.some((tag: string) => tag.toLowerCase().includes(interest.toLowerCase()))
        )
      )
    }
    
    recommendations = recommendations
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 8)
    
    return recommendations.map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      image: p.image,
      category: p.category,
      rating: p.rating,
      reviewCount: p.reviewCount,
    }))
  } catch (error) {
    console.error("Failed to fetch recommendations:", error)
    return []
  }
}

export async function getAssistantResponse(
  messages: Array<{ role: string; content: string }>,
  question: string
): Promise<{ response: string; suggestions: string[] }> {
  try {
    const url = `${API_BASE_URL}/api/assistant/chat`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        question,
      }),
    })

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`)
      return {
        response: "Sorry, I'm unable to connect to the assistant right now.",
        suggestions: [],
      }
    }

    const data = await response.json()
    return data as { response: string; suggestions: string[] }
  } catch (error) {
    console.error("Failed to fetch assistant response:", error)
    return {
      response: "Sorry, I'm unable to connect to the assistant right now.",
      suggestions: [],
    }
  }
}

export async function analyzeOutfit(
  imageBase64: string,
  product: { name: string; brand: string; image: string; category?: string }
): Promise<OutfitAnalysis> {
  try {
    const url = `${API_BASE_URL}/api/assistant/analyze-outfit`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: imageBase64,
        product,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return data as OutfitAnalysis
  } catch (error) {
    console.error("Failed to analyze outfit:", error)
    // Return default analysis
    return {
      matchScore: 75,
      colorHarmony: "Complementary",
      styleMatch: "Good match with casual styles",
      suggestions: [
        "This piece complements your style well",
        "Try pairing with neutral basics",
        "Perfect for layering",
      ],
    }
  }
}

export async function getSizeRecommendation(
  bodyType: string,
  height?: string,
  preference?: string
): Promise<SizeRecommendation> {
  try {
    const url = `${API_BASE_URL}/api/assistant/size-recommendation`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body_type: bodyType,
        height,
        preference,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return data as SizeRecommendation
  } catch (error) {
    console.error("Failed to get size recommendation:", error)
    return {
      recommended_size: "M",
      fit_guide: "Most standard fits work well.",
      alternatives: ["Try one size up", "Try one size down"],
      tips: ["Check the brand's size chart", "Read customer reviews"],
    }
  }
}

export async function optimizeBudget(
  budget: number,
  category?: string,
  stylePreferences?: string[]
): Promise<BudgetOptimization> {
  try {
    const url = `${API_BASE_URL}/api/assistant/budget-optimization`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        budget,
        category,
        style_preferences: stylePreferences,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return data as BudgetOptimization
  } catch (error) {
    console.error("Failed to optimize budget:", error)
    return {
      budget,
      items_found: 0,
      alternatives: [],
      savings_tip: "Browse our sale section for great deals",
      recommendations: ["Mix basics with statement pieces", "Look for sales"],
    }
  }
}

// Payment API functions
export interface PaymentIntentRequest {
  amount: number
  currency?: string
  order_items: Array<{
    id: string
    name: string
    price: number
    quantity: number
    image?: string
  }>
  shipping_address: {
    firstName: string
    lastName: string
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  customer_email: string
}

export interface PaymentIntentResponse {
  client_secret: string
  payment_intent_id: string
  publishable_key: string
  amount: number
  currency: string
}

export interface OrderResponse {
  order_id: string
  status: string
  total_amount: number
  payment_status: string
  created_at: string
}

export async function createPaymentIntent(
  request: PaymentIntentRequest
): Promise<PaymentIntentResponse> {
  const url = `${API_BASE_URL}/api/payments/create-payment-intent`

  // Use INR currency for India
  const paymentRequest = {
    ...request,
    currency: "inr"
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paymentRequest),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to create payment intent")
  }

  return response.json()
}

export async function confirmPayment(
  paymentIntentId: string,
  orderItems: PaymentIntentRequest["order_items"],
  shippingAddress: PaymentIntentRequest["shipping_address"],
  customerEmail: string
): Promise<OrderResponse> {
  const url = `${API_BASE_URL}/api/payments/confirm-payment`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      payment_intent_id: paymentIntentId,
      order_items: orderItems,
      shipping_address: shippingAddress,
      customer_email: customerEmail,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to confirm payment")
  }

  return response.json()
}

export async function getPaymentConfig() {
  const url = `${API_BASE_URL}/api/payments/config`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error("Failed to get payment configuration")
  }

  return response.json()
}

// ===== Virtual Try-On API =====

export interface VirtualTryOnResponse {
  success: boolean
  message: string
  result_image?: string  // Base64 encoded image
  result_url?: string
  processing_time?: number
  error?: string
}

export async function virtualTryOn(
  personImage: File,
  clothImage: File
): Promise<VirtualTryOnResponse> {
  const url = `${API_BASE_URL}/api/virtual-tryon`

  const formData = new FormData()
  formData.append('person_image', personImage)
  formData.append('cloth_image', clothImage)
  formData.append('return_base64', 'true')

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to generate virtual try-on")
  }

  return response.json()
}

export async function checkVirtualTryOnHealth() {
  const url = `${API_BASE_URL}/api/virtual-tryon/health`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error("Failed to check virtual try-on service health")
  }

  return response.json()
}
export async function visualSearch(file: File): Promise<VisualSearchResult[]> {
  const url = `${API_BASE_URL}/api/products/search/visual`

  const formData = new FormData()
  formData.append("file", file)
  formData.append("limit", "12")

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error("Visual search failed")
  }

  return response.json()
}