"use client"

import { createContext, useContext, useState, useEffect } from "react"

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  token: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = "ecommerce_token"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load token from localStorage on mount and verify it
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedToken = localStorage.getItem(STORAGE_KEY)
        if (savedToken) {
          // Verify token is still valid
          const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${savedToken}`,
            },
            body: JSON.stringify({ token: savedToken }),
          })
          if (response.ok) {
            setToken(savedToken)
            
            // Fetch user data
            const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${savedToken}`,
              },
            })
            if (userResponse.ok) {
              const userData = await userResponse.json()
              setUser(userData)
            }
          } else {
            localStorage.removeItem(STORAGE_KEY)
          }
        }
      } catch (error) {
        console.error("Failed to load user:", error)
        localStorage.removeItem(STORAGE_KEY)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Login failed")
      }

      const data = await response.json()
      
      setToken(data.accessToken)
      setUser(data.user)
      localStorage.setItem(STORAGE_KEY, data.accessToken)
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string, firstName: string, lastName: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Signup failed")
      }

      // Signup endpoint returns SignupResponse with verification code sent message
      // The actual account creation happens after email verification
      const data = await response.json()
      console.log("Signup response:", data)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        token,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
