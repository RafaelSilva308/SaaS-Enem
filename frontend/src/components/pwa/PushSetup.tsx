"use client"

import { useEffect } from "react"
import { api } from "@/lib/api"

export function PushSetup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    if (Notification.permission !== "granted") return

    setupPush()
  }, [])

  return null
}

async function setupPush() {
  try {
    const { data } = await api.get("/notifications/vapid-public-key")
    if (!data.public_key) return

    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) return // already subscribed

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.public_key).buffer as ArrayBuffer,
    })

    const json = sub.toJSON()
    await api.post("/notifications/subscribe", {
      endpoint: json.endpoint,
      keys: json.keys,
    })
  } catch {
    // Push setup is best-effort
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(b64)
  return Uint8Array.from(Array.from(raw).map(c => c.charCodeAt(0)))
}
