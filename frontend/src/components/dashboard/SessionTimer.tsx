"use client"

import { useState, useEffect } from "react"
import { Square, Pause, Play, Timer } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

interface Props {
  startedAt: number
  onEnd: () => void
}

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function SessionTimer({ startedAt, onEnd }: Props) {
  const [elapsed, setElapsed] = useState(Date.now() - startedAt)
  const [paused, setPaused] = useState(false)
  const [pauseOffset, setPauseOffset] = useState(0)
  const [pausedAt, setPausedAt] = useState<number | null>(null)

  useEffect(() => {
    if (paused) return
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt - pauseOffset)
    }, 1000)
    return () => clearInterval(interval)
  }, [paused, startedAt, pauseOffset])

  const togglePause = () => {
    if (paused) {
      const extra = pausedAt ? Date.now() - pausedAt : 0
      setPauseOffset((prev) => prev + extra)
      setPausedAt(null)
      setPaused(false)
    } else {
      setPausedAt(Date.now())
      setPaused(true)
    }
  }

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <div className="glass-strong rounded-2xl px-4 py-3 flex items-center gap-3 glow-blue shadow-2xl">
        <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center shrink-0">
          <Timer size={15} className="text-white" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">
            Sessão ativa
          </p>
          <p className="text-lg font-bold tabular-nums leading-none">
            {formatTime(elapsed)}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted/30"
            onClick={togglePause}
            title={paused ? "Retomar" : "Pausar"}
          >
            {paused ? <Play size={15} /> : <Pause size={15} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-destructive/20 text-destructive hover:text-destructive"
            onClick={onEnd}
            title="Encerrar sessão"
          >
            <Square size={15} />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
