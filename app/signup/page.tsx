"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Mail, Lock, User, ArrowRight, CheckCircle } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const { signup } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [verificationStep, setVerificationStep] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        duration: 2000,
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match",
        duration: 2000,
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        duration: 2000,
      })
      return
    }

    if (!formData.agreeTerms) {
      toast({
        title: "Accept Terms",
        description: "You must agree to the terms and conditions",
        duration: 2000,
      })
      return
    }

    setIsLoading(true)

    try {
      await signup(formData.email, formData.password, formData.firstName, formData.lastName)
      setUserEmail(formData.email)
      setVerificationStep(true)
      toast({
        title: "Verification Code Sent ✓",
        description: "Check your email for the verification code",
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "Signup Failed",
        description: error instanceof Error ? error.message : "Please try again",
        duration: 2000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Verification code must be 6 digits",
        duration: 2000,
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("http://localhost:8000/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          code: verificationCode,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Verification failed")
      }

      const data = await response.json()
      localStorage.setItem("ecommerce_token", data.accessToken)
      
      toast({
        title: "Email Verified ✓",
        description: "Welcome to QuickKart!",
        duration: 2000,
      })
      router.push("/")
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Please try again",
        duration: 2000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (verificationStep) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center py-12">
          <div className="w-full max-w-md">
            {/* Logo/Header */}
            <div className="text-center mb-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-foreground mb-2">Verify Your Email</h1>
              <p className="text-muted-foreground">We've sent a verification code to<br/><span className="font-medium text-foreground">{userEmail}</span></p>
            </div>

            {/* Verification Form Card */}
            <div className="bg-card rounded-lg border border-border p-8 shadow-lg">
              <form onSubmit={handleVerifyEmail} className="space-y-4">
                {/* Verification Code Field */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Verification Code</label>
                  <p className="text-xs text-muted-foreground mb-3">Enter the 6-digit code from your email</p>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.slice(0, 6))}
                      maxLength={6}
                      className="w-full pl-10 pr-4 py-3 text-center text-2xl tracking-widest border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-6 gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Verify Email"}
                  {!isLoading && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>

              {/* Resend Code */}
              <p className="text-center text-sm text-muted-foreground mt-6">
                Didn't receive a code?{" "}
                <button 
                  onClick={() => {
                    toast({
                      title: "Code Resent",
                      description: "Check your email for a new verification code",
                      duration: 2000,
                    })
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  Resend
                </button>
              </p>
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
      <main className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Join QuickKart</h1>
            <p className="text-muted-foreground">Create an account and start shopping</p>
          </div>

          {/* Form Card */}
          <div className="bg-card rounded-lg border border-border p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      name="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">At least 6 characters</p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                    required
                  />
                </div>
              </div>

              {/* Terms & Conditions */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-border mt-1 flex-shrink-0"
                  required
                />
                <span className="text-sm text-muted-foreground">
                  I agree to the{" "}
                  <a href="#" className="text-primary font-medium hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-primary font-medium hover:underline">
                    Privacy Policy
                  </a>
                </span>
              </label>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full mt-6 gap-2"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            {/* Sign In Link */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
