"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  level: number
  onClose: () => void
}

// Partícula de confetti simples usando Framer Motion
function Particle({ x, color }: { x: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{ left: `${x}%`, top: 0, background: color }}
      initial={{ y: -10, opacity: 1, rotate: 0 }}
      animate={{ y: 400, opacity: 0, rotate: Math.random() * 360 }}
      transition={{ duration: 1.5 + Math.random() * 0.5, ease: "easeIn" }}
    />
  )
}

const CONFETTI_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#7c3aed", "#ef4444", "#ffffff"]

export function LevelUpModal({ level, onClose }: Props) {
  const [particles] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    }))
  )

  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Overlay */}
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Confetti */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p) => (
            <Particle key={p.id} x={p.x} color={p.color} />
          ))}
        </div>

        {/* Modal */}
        <motion.div
          className="relative glass-strong rounded-3xl p-10 text-center max-w-sm w-full mx-4 shadow-2xl"
          initial={{ scale: 0.5, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", damping: 15, stiffness: 300 }}
        >
          <motion.div
            className="w-24 h-24 gradient-brand rounded-full flex items-center justify-center mx-auto mb-5"
            animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Star size={44} className="text-white fill-white" />
          </motion.div>

          <motion.p
            className="text-sm text-muted-foreground font-medium mb-1 uppercase tracking-widest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Level Up!
          </motion.p>

          <motion.p
            className="text-6xl font-black text-gradient-brand tabular-nums mb-2"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            {level}
          </motion.p>

          <motion.p
            className="text-muted-foreground text-sm mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            Você alcançou o nível {level}. Continue assim!
          </motion.p>

          <Button
            className="gradient-brand text-white w-full"
            onClick={onClose}
          >
            Continuar
          </Button>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
