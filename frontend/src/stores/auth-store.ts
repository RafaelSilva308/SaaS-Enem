"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface AuthUser {
  id: string
  name: string
  email: string
  email_verified: boolean
  role: string
  has_2fa: boolean
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  setUser: (user: AuthUser) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", accessToken)
          localStorage.setItem("refresh_token", refreshToken)
          // Cookie de sessão para o middleware Next.js (server-side) — TTL 30 dias
          const maxAge = 30 * 24 * 60 * 60
          document.cookie = `auth_session=1; path=/; max-age=${maxAge}; SameSite=Lax`
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true })
      },

      setUser: (user) => set({ user }),

      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token")
          localStorage.removeItem("refresh_token")
          document.cookie = "auth_session=; path=/; max-age=0; SameSite=Lax"
        }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },
    }),
    {
      name: "saas-enem-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
