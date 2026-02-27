"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { User, Package, CreditCard, LogOut } from "lucide-react"
import { useState } from "react"

interface Order {
  id: string
  orderNumber: string
  date: string
  total: number
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  items: number
  trackingNumber?: string
}

interface PaymentMethod {
  id: string
  type: "card" | "upi"
  lastFour: string
  expiryDate?: string
  isDefault: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout, isLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<PaymentMethod[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      // Fetch orders from backend
      fetchOrders()
      fetchPayments()
    }
  }, [user])

  const fetchOrders = async () => {
    setLoadingOrders(true)
    try {
      // Mock data - replace with actual API call
      const mockOrders: Order[] = [
        {
          id: "1",
          orderNumber: "ORD-2024-001",
          date: "2024-01-15",
          total: 4999,
          status: "delivered",
          items: 3,
          trackingNumber: "TRK123456789",
        },
        {
          id: "2",
          orderNumber: "ORD-2024-002",
          date: "2024-01-10",
          total: 2499,
          status: "shipped",
          items: 1,
          trackingNumber: "TRK987654321",
        },
        {
          id: "3",
          orderNumber: "ORD-2024-003",
          date: "2024-01-05",
          total: 7999,
          status: "processing",
          items: 2,
        },
      ]
      setOrders(mockOrders)
    } catch (error) {
      console.error("Failed to fetch orders:", error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const fetchPayments = async () => {
    try {
      // Mock data - replace with actual API call
      const mockPayments: PaymentMethod[] = [
        {
          id: "1",
          type: "card",
          lastFour: "4242",
          expiryDate: "12/25",
          isDefault: true,
        },
        {
          id: "2",
          type: "upi",
          lastFour: "user@upi",
          isDefault: false,
        },
      ]
      setPayments(mockPayments)
    } catch (error) {
      console.error("Failed to fetch payments:", error)
    }
  }

  const getStatusColor = (status: Order["status"]) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    }
    return colors[status]
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Header */}
        <div className="mb-8">
          <div className="bg-card border border-border rounded-lg p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <User className="h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>Track your orders and deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="flex justify-center py-8">
                    <Spinner className="h-6 w-6" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No orders yet</p>
                    <Button className="mt-4" onClick={() => router.push("/products")}>
                      Start Shopping
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="border border-border rounded-lg p-4 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-foreground">{order.orderNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.date).toLocaleDateString("en-IN", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          <p className="text-sm text-foreground">
                            <span className="text-muted-foreground">Items:</span> {order.items}
                          </p>
                          <p className="text-sm text-foreground">
                            <span className="text-muted-foreground">Amount:</span> ₹{order.total.toLocaleString("en-IN")}
                          </p>
                          {order.trackingNumber && (
                            <p className="text-sm text-foreground">
                              <span className="text-muted-foreground">Tracking:</span> {order.trackingNumber}
                            </p>
                          )}
                        </div>

                        <Button variant="outline" className="w-full text-sm">
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Manage your payment methods and transaction history</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {payments.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No payment methods saved</p>
                    <Button className="mt-4">Add Payment Method</Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="border border-border rounded-lg p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-secondary rounded-lg flex items-center justify-center">
                              <CreditCard className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground capitalize">
                                {payment.type === "card" ? "Debit Card" : "UPI"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {payment.type === "card"
                                  ? `Ending with ${payment.lastFour}`
                                  : payment.lastFour}
                              </p>
                              {payment.expiryDate && (
                                <p className="text-xs text-muted-foreground">
                                  Expires {payment.expiryDate}
                                </p>
                              )}
                            </div>
                          </div>
                          {payment.isDefault && (
                            <Badge variant="default">Default</Badge>
                          )}
                        </div>
                      ))}
                    </div>

                    <Button variant="outline" className="w-full">
                      Add Payment Method
                    </Button>

                    <div className="border-t border-border pt-6 mt-6">
                      <h3 className="font-semibold text-foreground mb-4">Recent Transactions</h3>
                      <div className="space-y-3">
                        {orders.slice(0, 3).map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div>
                              <p className="font-medium text-foreground">{order.orderNumber}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.date).toLocaleDateString("en-IN")}
                              </p>
                            </div>
                            <p className="font-semibold text-foreground">
                              ₹{order.total.toLocaleString("en-IN")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>View and manage your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">First Name</label>
                    <p className="text-foreground text-lg mt-1">{user.firstName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                    <p className="text-foreground text-lg mt-1">{user.lastName}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-foreground text-lg mt-1">{user.email}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="font-semibold text-foreground mb-4">Account Statistics</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-secondary rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-primary">{orders.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Orders</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-primary">
                        ₹{orders.reduce((sum, o) => sum + o.total, 0).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Total Spent</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-primary">
                        {orders.filter((o) => o.status === "delivered").length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Delivered</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-primary">
                        {payments.length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Saved Methods</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <Button variant="outline" className="w-full">
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  )
}
