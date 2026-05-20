"use client"

import { useEffect, useState, useCallback } from "react"
import { Timer } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  durationSeconds: number
  startTime: number   // Date.now() when exam started
  onExpire: () => void
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function ExamTimer({ durationSeconds, startTime, onExpire }: Props) {
  const calcLeft = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    return Math.max(0, durationSeconds - elapsed)
  }, [durationSeconds, startTime])

  const [timeLeft, setTimeLeft] = useState(calcLeft)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const left = calcLeft()
      setTimeLeft(left)
      if (left === 0 && !expired) {
        setExpired(true)
        clearInterval(interval)
        onExpire()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [calcLeft, expired, onExpire])

  const h = Math.floor(timeLeft / 3600)
  const m = Math.floor((timeLeft % 3600) / 60)
  const s = timeLeft % 60

  const isUrgent = timeLeft <= 300 && timeLeft > 60
  const isCritical = timeLeft <= 60

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg tabular-nums glass",
        isCritical && "text-destructive border-destructive/30 animate-pulse",
        isUrgent && !isCritical && "text-amber-400 border-amber-400/30",
        !isUrgent && "text-foreground",
      )}
    >
      <Timer size={18} className="shrink-0" />
      {h > 0 ? `${pad(h)}:` : ""}{pad(m)}:{pad(s)}
    </div>
  )
}
