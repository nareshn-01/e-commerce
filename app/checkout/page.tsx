"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useCart } from "@/hooks/use-cart"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { StripePaymentForm } from "@/components/stripe-payment-form"
import { ChevronRight, Truck, Lock, AlertCircle } from "lucide-react"
import Link from "next/link"
import { createPaymentIntent, confirmPayment, type PaymentIntentRequest } from "@/lib/api"

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, clearCart } = useCart()
  const { toast } = useToast()
  const [step, setStep] = useState<"address" | "payment" | "confirmation">("address")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  })
  const [paymentData, setPaymentData] = useState({
    cardName: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    paymentMethod: "credit-card",
  })
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)

  const tax = cart.total * 0.1
  const shipping = cart.total > 50 ? 0 : 10
  const total = cart.total + tax + shipping

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setPaymentData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.firstName || !formData.email || !formData.addressLine1 || !formData.city || !formData.postalCode) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        duration: 2000,
      })
      return
    }
    setStep("payment")
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (paymentData.paymentMethod === "credit-card") {
      if (!paymentData.cardName || !paymentData.cardNumber || !paymentData.expiryDate || !paymentData.cvv) {
        toast({
          title: "Missing Payment Information",
          description: "Please fill in all required fields",
          duration: 2000,
        })
        return
      }
    }

    setIsProcessing(true)

    try {
      // Prepare payment request
      const paymentRequest: PaymentIntentRequest = {
        amount: total,
        currency: "usd",
        order_items: cart.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        })),
        shipping_address: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: formData.country
        },
        customer_email: formData.email
      }

      // Create payment intent
      const paymentIntent = await createPaymentIntent(paymentRequest)
      setPaymentIntentId(paymentIntent.payment_intent_id)

      // In a real app with Stripe.js, you would confirm the payment on the client
      // For this demo, we'll proceed directly to confirmation
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Confirm payment on backend
      const order = await confirmPayment(
        paymentIntent.payment_intent_id,
        paymentRequest.order_items,
        paymentRequest.shipping_address,
        formData.email
      )

      // Create order details for display
      const orderData = {
        orderId: order.order_id,
        date: new Date().toLocaleDateString(),
        items: cart.items,
        shipping: formData,
        payment: paymentData.paymentMethod,
        subtotal: cart.total,
        tax,
        shippingCost: shipping,
        total,
        paymentStatus: order.payment_status
      }

      setOrderDetails(orderData)
      clearCart()
      setStep("confirmation")

      toast({
        title: "Order Placed Successfully ✓",
        description: `Order ID: ${order.order_id}`,
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Unable to process payment. Please try again.",
        duration: 5000,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStripePaymentSuccess = async (intentId: string) => {
    try {
      setPaymentIntentId(intentId)
      
      // Confirm payment on backend
      const order = await confirmPayment(
        intentId,
        cart.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        })),
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: formData.country
        },
        formData.email
      )

      const orderData = {
        orderId: order.order_id,
        date: new Date().toLocaleDateString(),
        items: cart.items,
        shipping: formData,
        payment: "credit-card",
        subtotal: cart.total,
        tax,
        shippingCost: shipping,
        total,
        paymentStatus: order.payment_status
      }

      setOrderDetails(orderData)
      clearCart()
      setStep("confirmation")

      toast({
        title: "Payment Successful ✓",
        description: `Order ID: ${order.order_id}`,
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "Order Creation Failed",
        description: error instanceof Error ? error.message : "Payment succeeded but order creation failed.",
        duration: 5000,
      })
    }
  }

  const handleStripePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      duration: 5000,
    })
  }

  if (cart.items.length === 0 && step !== "confirmation") {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-4">Your cart is empty</h1>
              <p className="text-muted-foreground mb-8">Add items to your cart before checkout</p>
              <Link href="/products">
                <Button size="lg">Continue Shopping</Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4 flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                  step === "address"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                }`}
              >
                1
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:inline">Address</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex items-center gap-4 flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                  step === "payment" || step === "confirmation"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                }`}
              >
                2
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:inline">Payment</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex items-center gap-4 flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                  step === "confirmation" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}
              >
                3
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:inline">Confirmation</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {step === "address" && (
                <div className="bg-card rounded-lg border border-border p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-6">Shipping Address</h2>
                  <form onSubmit={handleAddressSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        name="firstName"
                        placeholder="First Name *"
                        value={formData.firstName}
                        onChange={handleAddressChange}
                        className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                        required
                      />
                      <input
                        type="text"
                        name="lastName"
                        placeholder="Last Name *"
                        value={formData.lastName}
                        onChange={handleAddressChange}
                        className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="email"
                        name="email"
                        placeholder="Email *"
                        value={formData.email}
                        onChange={handleAddressChange}
                        className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background col-span-2"
                        required
                      />
                    </div>

                    <input
                      type="tel"
                      name="phone"
                      placeholder="Phone Number"
                      value={formData.phone}
                      onChange={handleAddressChange}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                    />

                    <input
                      type="text"
                      name="addressLine1"
                      placeholder="Address Line 1 *"
                      value={formData.addressLine1}
                      onChange={handleAddressChange}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                      required
                    />

                    <input
                      type="text"
                      name="addressLine2"
                      placeholder="Address Line 2 (Apt, Suite, etc.)"
                      value={formData.addressLine2}
                      onChange={handleAddressChange}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        name="city"
                        placeholder="City *"
                        value={formData.city}
                        onChange={handleAddressChange}
                        className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                        required
                      />
                      <input
                        type="text"
                        name="state"
                        placeholder="State/Province"
                        value={formData.state}
                        onChange={handleAddressChange}
                        className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        name="postalCode"
                        placeholder="Postal Code *"
                        value={formData.postalCode}
                        onChange={handleAddressChange}
                        className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                        required
                      />
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleAddressChange}
                        className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                      >
                        <option>United States</option>
                        <option>Canada</option>
                        <option>United Kingdom</option>
                        <option>Australia</option>
                      </select>
                    </div>

                    <Button type="submit" size="lg" className="w-full mt-6">
                      Continue to Payment
                    </Button>
                  </form>
                </div>
              )}

              {step === "payment" && (
                <div className="bg-card rounded-lg border border-border p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-6">Payment Method</h2>
                  
                  {/* Payment Method Selection */}
                  <div className="space-y-3 mb-6">
                    <label className="flex items-center gap-3 p-4 border-2 border-primary rounded-lg cursor-pointer bg-primary/5">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="credit-card"
                        checked={paymentData.paymentMethod === "credit-card"}
                        onChange={handlePaymentChange}
                        className="w-4 h-4"
                      />
                      <span className="font-medium text-foreground">Credit/Debit Card</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary/50 opacity-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="paypal"
                        disabled
                        className="w-4 h-4"
                      />
                      <span className="font-medium text-foreground">PayPal (Coming Soon)</span>
                    </label>
                  </div>

                  {paymentData.paymentMethod === "credit-card" && (
                    <div className="pt-6 border-t border-border">
                      <StripePaymentForm
                        amount={total}
                        onSuccess={handleStripePaymentSuccess}
                        onError={handleStripePaymentError}
                        customerEmail={formData.email}
                      />
                    </div>
                  )}

                  <div className="mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={() => setStep("address")}
                      disabled={isProcessing}
                    >
                      Back to Shipping
                    </Button>
                  </div>
                </div>
              )}

              {step === "confirmation" && orderDetails && (
                <div className="bg-card rounded-lg border border-green-500/30 p-8">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl">
                        ✓
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold text-foreground mb-2">Order Confirmed!</h2>
                    <p className="text-muted-foreground">Thank you for your purchase</p>
                  </div>

                  <div className="bg-secondary rounded-lg p-6 mb-6">
                    <p className="text-sm text-muted-foreground mb-1">Order ID</p>
                    <p className="text-2xl font-bold text-foreground">{orderDetails.orderId}</p>
                  </div>

                  <div className="bg-secondary rounded-lg p-6 space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order Date</span>
                      <span className="font-medium text-foreground">{orderDetails.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Items Ordered</span>
                      <span className="font-medium text-foreground">{orderDetails.items.length} items</span>
                    </div>
                    <div className="border-t border-border pt-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium text-foreground">₹{orderDetails.subtotal.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-medium text-foreground">₹{orderDetails.tax.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="font-medium text-foreground">
                          {orderDetails.shippingCost === 0 ? "FREE" : `₹${orderDetails.shippingCost.toFixed(0)}`}
                        </span>
                      </div>
                      <div className="border-t border-border pt-3 flex justify-between">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="text-2xl font-bold text-primary">₹{orderDetails.total.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-8">
                    <Link href="/products" className="w-full">
                      <Button size="lg" className="w-full">
                        Continue Shopping
                      </Button>
                    </Link>
                    <Link href="/" className="w-full">
                      <Button variant="outline" size="lg" className="w-full">
                        Back to Home
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-lg border border-border p-6 sticky top-20">
                <h3 className="text-lg font-semibold text-foreground mb-4">Order Summary</h3>

                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                      </div>
                      <p className="font-medium text-foreground">₹{(item.price * item.quantity).toFixed(0)}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium text-foreground">₹{cart.total.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax (10%)</span>
                    <span className="font-medium text-foreground">₹{tax.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium text-foreground">
                      {shipping === 0 ? "FREE" : `₹${shipping.toFixed(0)}`}
                    </span>
                  </div>
                  {shipping === 0 && (
                    <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      Free delivery on orders over ₹4150
                    </div>
                  )}
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-xl font-bold text-primary">₹{total.toFixed(0)}</span>
                  </div>
                </div>

                <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-600">Your payment information is secure and encrypted.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
