import axios from "axios"

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token")
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Singleton promise to serialize concurrent refresh attempts
let refreshingPromise: Promise<string> | null = null

function clearAuthAndRedirect() {
  if (typeof window === "undefined") return
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  const secure = location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `auth_session=; path=/; max-age=0; SameSite=Lax${secure}`
  window.location.href = "/login"
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem("refresh_token")
      if (refresh) {
        try {
          if (!refreshingPromise) {
            refreshingPromise = axios
              .post(
                `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/auth/refresh`,
                { refresh_token: refresh }
              )
              .then(({ data }) => {
                localStorage.setItem("access_token", data.access_token)
                localStorage.setItem("refresh_token", data.refresh_token)
                return data.access_token as string
              })
              .finally(() => {
                refreshingPromise = null
              })
          }
          const newToken = await refreshingPromise
          original.headers.Authorization = `Bearer ${newToken}`
          return api(original)
        } catch {
          clearAuthAndRedirect()
        }
      } else {
        clearAuthAndRedirect()
      }
    }
    return Promise.reject(error)
  }
)
