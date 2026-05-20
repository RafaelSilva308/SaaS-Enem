"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Calendar } from "lucide-react"

interface CountdownData {
  days: number
  hours: number
  minutes: number
  seconds: number
  enem_date: string
}

interface Props {
  countdown: CountdownData
}

function FlipDigit({ value, label }: { value: number; label: string }) {
  const formatted = String(value).padStart(2, "0")
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="glass-sm rounded-xl min-w-[56px] py-3 text-center relative overflow-hidden"
        style={{ borderColor: "rgba(37,99,235,0.2)" }}
      >
        <motion.span
          key={value}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="text-2xl lg:text-3xl font-bold text-white tabular-nums block leading-none py-0.5"
        >
          {formatted}
        </motion.span>
      </div>
      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
  )
}

export function CountdownCard({ countdown: initial }: Props) {
  const [cd, setCd] = useState(initial)

  useEffect(() => {
    const interval = setInterval(() => {
      setCd((prev) => {
        let { days, hours, minutes, seconds } = prev
        seconds -= 1
        if (seconds < 0) { seconds = 59; minutes -= 1 }
        if (minutes < 0) { minutes = 59; hours -= 1 }
        if (hours < 0) { hours = 23; days -= 1 }
        if (days < 0) return { ...prev, days: 0, hours: 0, minutes: 0, seconds: 0 }
        return { ...prev, days, hours, minutes, seconds }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="glass rounded-2xl p-5 glow-blue">
      <div className="flex items-center gap-2 mb-5">
        <Calendar size={15} className="text-primary shrink-0" />
        <span className="text-sm font-medium text-muted-foreground">Countdown para o ENEM</span>
        <span className="ml-auto text-xs text-muted-foreground">02/11/2026</span>
      </div>
      <div className="flex items-start justify-center gap-2">
        <FlipDigit value={cd.days} label="dias" />
        <span className="text-2xl font-bold text-muted-foreground/60 mt-3">:</span>
        <FlipDigit value={cd.hours} label="horas" />
        <span className="text-2xl font-bold text-muted-foreground/60 mt-3">:</span>
        <FlipDigit value={cd.minutes} label="min" />
        <span className="text-2xl font-bold text-muted-foreground/60 mt-3">:</span>
        <FlipDigit value={cd.seconds} label="seg" />
      </div>
    </div>
  )
}
