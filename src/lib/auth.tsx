import React, { createContext, useContext, useState, useEffect } from "react"

export const VALID_USERS: Record<string, string> = {
  admin1: "2345",
  admin2: "2345",
  admin3: "2345",
  admin4: "2345",
}

interface AuthContextType {
  user: string | null
  login: (username: string, password: string) => { success: boolean; error?: string }
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = "incumbency_auth_user"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY)
      if (savedUser && VALID_USERS[savedUser]) {
        setUser(savedUser)
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    } catch {
      // ignore storage errors
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = (username: string, password: string) => {
    const trimmedUser = username.trim()
    const expectedPassword = VALID_USERS[trimmedUser]

    if (!expectedPassword || expectedPassword !== password) {
      return {
        success: false,
        error: "Username emaw password a dik lo. Khawngaihin check tha leh rawh.",
      }
    }

    setUser(trimmedUser)
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, trimmedUser)
    } catch {
      // ignore storage errors
    }

    return { success: true }
  }

  const logout = () => {
    setUser(null)
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch {
      // ignore storage errors
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
