"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Lock, LogIn, UserPlus, ArrowRight } from "lucide-react"

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    // Only show modal on first visit if user is not authenticated
    if (!isLoading && !user) {
      const hasSeenWelcome = localStorage.getItem("hasSeenWelcome")
      if (!hasSeenWelcome) {
        setIsOpen(true)
      }
    }
  }, [user, isLoading])

  const handleDoItLater = () => {
    localStorage.setItem("hasSeenWelcome", "true")
    setIsOpen(false)
  }

  const handleLogin = () => {
    setIsOpen(false)
    router.push("/login")
  }

  const handleSignup = () => {
    setIsOpen(false)
    router.push("/signup")
  }

  if (isLoading || user) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center">Welcome to QuickKart</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Create an account to track orders, save favorites, and enjoy exclusive deals
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-6">
          <Button
            onClick={handleLogin}
            variant="default"
            className="w-full h-12 text-base"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Login
          </Button>

          <Button
            onClick={handleSignup}
            variant="outline"
            className="w-full h-12 text-base"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Create Account
          </Button>

          <Button
            onClick={handleDoItLater}
            variant="ghost"
            className="w-full h-12 text-base"
          >
            Do it Later
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="pt-4 text-center text-xs text-muted-foreground">
          <p>Shop now, login anytime to save your preferences</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
