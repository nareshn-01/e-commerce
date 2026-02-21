"use client"

import { useState, useEffect, useCallback } from "react"

export interface Review {
  id: string
  productId: string
  rating: number
  title: string
  comment: string
  author: string
  date: string
  helpful: number
}

const STORAGE_KEY = "ecommerce_reviews"

export function useReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Load reviews from localStorage on mount
  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setReviews(JSON.parse(saved))
      }
    } catch (error) {
      console.error("Failed to load reviews:", error)
    }
    setIsLoading(false)
  }, [])

  // Save reviews to localStorage whenever they change
  useEffect(() => {
    if (mounted && !isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews))
      } catch (error) {
        console.error("Failed to save reviews:", error)
      }
    }
  }, [reviews, isLoading, mounted])

  const addReview = useCallback((review: Omit<Review, "id" | "date" | "helpful">) => {
    const newReview: Review = {
      ...review,
      id: `review_${Date.now()}`,
      date: new Date().toISOString(),
      helpful: 0,
    }
    setReviews((prev) => [newReview, ...prev])
    return newReview
  }, [])

  const getProductReviews = useCallback((productId: string) => {
    return reviews.filter((review) => review.productId === productId)
  }, [reviews])

  const deleteReview = useCallback((reviewId: string) => {
    setReviews((prev) => prev.filter((review) => review.id !== reviewId))
  }, [])

  const markHelpful = useCallback((reviewId: string) => {
    setReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId ? { ...review, helpful: review.helpful + 1 } : review
      )
    )
  }, [])

  const getAverageRating = useCallback((productId: string) => {
    const productReviews = getProductReviews(productId)
    if (productReviews.length === 0) return 0
    const sum = productReviews.reduce((acc, review) => acc + review.rating, 0)
    return Math.round((sum / productReviews.length) * 10) / 10
  }, [getProductReviews])

  const getRatingDistribution = useCallback((productId: string) => {
    const productReviews = getProductReviews(productId)
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    productReviews.forEach((review) => {
      distribution[review.rating as keyof typeof distribution]++
    })
    return distribution
  }, [getProductReviews])

  return {
    reviews,
    isLoading,
    addReview,
    getProductReviews,
    deleteReview,
    markHelpful,
    getAverageRating,
    getRatingDistribution,
  }
}
