"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export function useTimer(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(() => setRunning(true), [])
  const pause = useCallback(() => setRunning(false), [])
  const reset = useCallback(() => { setRunning(false); setSeconds(initialSeconds) }, [initialSeconds])

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  const formatted = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  const isUrgent = seconds <= 300  // últimos 5 min
  const isCritical = seconds <= 60

  return { seconds, minutes, formatted, running, isUrgent, isCritical, start, pause, reset }
}
