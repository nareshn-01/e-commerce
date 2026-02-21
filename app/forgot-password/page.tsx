"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Mail, Lock, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<"email" | "code" | "reset">("email")
  const [userEmail, setUserEmail] = useState("")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast({
        title: "Missing Email",
        description: "Please enter your email address",
        duration: 2000,
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Failed to request password reset")
      }

      setUserEmail(email)
      setStep("code")
      toast({
        title: "Reset Code Sent ✓",
        description: "Check your email for the password reset code",
        duration: 2000,
      })
    } catch (error) {
      toast({
        title: "Request Failed",
        description: error instanceof Error ? error.message : "Please try again",
        duration: 2000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Reset code must be 6 digits",
        duration: 2000,
      })
      return
    }

    setStep("reset")
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all fields",
        duration: 2000,
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match",
        duration: 2000,
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        duration: 2000,
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          code,
          new_password: newPassword,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Failed to reset password")
      }

      toast({
        title: "Password Reset Successful ✓",
        description: "Your password has been updated. Please log in.",
        duration: 2000,
      })
      router.push("/login")
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "Please try again",
        duration: 2000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-primary hover:underline mb-6 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>

          {/* Step 1: Email */}
          {step === "email" && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Forgot Password?</h1>
                <p className="text-muted-foreground">No worries, we'll help you recover your account</p>
              </div>

              <div className="bg-card rounded-lg border border-border p-8 shadow-lg">
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Enter the email address associated with your account
                    </p>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full mt-6 gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Reset Code"}
                    {!isLoading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </>
          )}

          {/* Step 2: Verify Code */}
          {step === "code" && (
            <>
              <div className="text-center mb-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-foreground mb-2">Verify Your Code</h1>
                <p className="text-muted-foreground">
                  We've sent a reset code to<br />
                  <span className="font-medium text-foreground">{userEmail}</span>
                </p>
              </div>

              <div className="bg-card rounded-lg border border-border p-8 shadow-lg">
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Reset Code</label>
                    <p className="text-xs text-muted-foreground mb-3">Enter the 6-digit code from your email</p>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="000000"
                        value={code}
                        onChange={(e) => setCode(e.target.value.slice(0, 6))}
                        maxLength={6}
                        className="w-full pl-10 pr-4 py-3 text-center text-2xl tracking-widest border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background font-mono"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full mt-6 gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? "Verifying..." : "Verify Code"}
                    {!isLoading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </form>

                <button
                  onClick={() => setStep("email")}
                  className="w-full mt-3 text-sm text-primary hover:underline font-medium"
                >
                  Use different email
                </button>
              </div>
            </>
          )}

          {/* Step 3: Reset Password */}
          {step === "reset" && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Create New Password</h1>
                <p className="text-muted-foreground">Enter your new password below</p>
              </div>

              <div className="bg-card rounded-lg border border-border p-8 shadow-lg">
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full mt-6 gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? "Resetting..." : "Reset Password"}
                    {!isLoading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
