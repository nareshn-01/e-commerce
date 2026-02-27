"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreditCard, Lock, AlertCircle } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

interface StripePaymentFormProps {
  amount: number
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
  customerEmail: string
}

export function StripePaymentForm({
  amount,
  onSuccess,
  onError,
  customerEmail
}: StripePaymentFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardData, setCardData] = useState({
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: ""
  })

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(" ")
    } else {
      return value
    }
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    if (v.length >= 2) {
      return v.slice(0, 2) + "/" + v.slice(2, 4)
    }
    return v
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    setCardData(prev => ({ ...prev, cardNumber: formatted }))
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value)
    setCardData(prev => ({ ...prev, expiryDate: formatted }))
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/gi, "").slice(0, 4)
    setCardData(prev => ({ ...prev, cvv: value }))
  }

  const validateCard = (): boolean => {
    const { cardNumber, cardName, expiryDate, cvv } = cardData

    if (!cardName.trim()) {
      setError("Please enter the cardholder name")
      return false
    }

    const cleanCardNumber = cardNumber.replace(/\s/g, "")
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      setError("Invalid card number")
      return false
    }

    if (!expiryDate.match(/^\d{2}\/\d{2}$/)) {
      setError("Invalid expiry date (MM/YY)")
      return false
    }

    const [month, year] = expiryDate.split("/").map(Number)
    const currentYear = new Date().getFullYear() % 100
    const currentMonth = new Date().getMonth() + 1

    if (month < 1 || month > 12) {
      setError("Invalid expiry month")
      return false
    }

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      setError("Card has expired")
      return false
    }

    if (cvv.length < 3 || cvv.length > 4) {
      setError("Invalid CVV")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateCard()) {
      return
    }

    setLoading(true)

    try {
      // In a real implementation, you would use Stripe.js or Stripe Elements
      // This is a simplified mock payment flow
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock payment intent ID (in production, this comes from Stripe)
      const mockPaymentIntentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Simulate successful payment
      onSuccess(mockPaymentIntentId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Payment failed. Please try again."
      setError(errorMessage)
      onError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="h-4 w-4 text-green-600" />
        <span className="text-sm text-muted-foreground">
          Secure payment processing (INR)
        </span>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="cardName">Cardholder Name</Label>
        <Input
          id="cardName"
          placeholder="John Doe"
          value={cardData.cardName}
          onChange={(e) => setCardData(prev => ({ ...prev, cardName: e.target.value }))}
          disabled={loading}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardNumber">Card Number</Label>
        <div className="relative">
          <Input
            id="cardNumber"
            placeholder="1234 5678 9012 3456"
            value={cardData.cardNumber}
            onChange={handleCardNumberChange}
            disabled={loading}
            maxLength={19}
            required
          />
          <CreditCard className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiryDate">Expiry Date</Label>
          <Input
            id="expiryDate"
            placeholder="MM/YY"
            value={cardData.expiryDate}
            onChange={handleExpiryChange}
            disabled={loading}
            maxLength={5}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cvv">CVV</Label>
          <Input
            id="cvv"
            type="password"
            placeholder="123"
            value={cardData.cvv}
            onChange={handleCvvChange}
            disabled={loading}
            maxLength={4}
            required
          />
        </div>
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Processing...
            </>
          ) : (
            <>
              Pay ₹{amount.toFixed(2)}
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Your payment information is encrypted and secure
      </p>
    </form>
  )
}
