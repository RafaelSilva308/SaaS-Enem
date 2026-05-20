"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Download, Share, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const VISIT_KEY    = "pwa-visits"
const DISMISS_KEY  = "pwa-dismissed"
const VISIT_THRESH = 3

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Already installed as standalone
    if (window.matchMedia("(display-mode: standalone)").matches) return

    // Already dismissed
    if (localStorage.getItem(DISMISS_KEY)) return

    // Track visits
    const visits = parseInt(localStorage.getItem(VISIT_KEY) || "0") + 1
    localStorage.setItem(VISIT_KEY, String(visits))
    if (visits < VISIT_THRESH) return

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener("beforeinstallprompt", handler)

    // On iOS, show manual instruction immediately (no native prompt)
    if (ios) setShow(true)

    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === "accepted") dismiss()
    }
  }

  const dismiss = () => {
    setShow(false)
    localStorage.setItem(DISMISS_KEY, "1")
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="fixed bottom-20 lg:bottom-4 left-4 right-4 z-40 max-w-sm mx-auto"
        >
          <div className="glass-strong rounded-2xl border border-border shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shrink-0">
                <Download size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Instalar ENEM Pro</p>
                {isIOS ? (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Toque em <Share size={11} className="inline mx-0.5" /> <strong>Compartilhar</strong> no Safari e depois
                    em <strong>Adicionar à Tela Inicial</strong>.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Adicione à tela inicial para acesso rápido, mesmo offline.
                  </p>
                )}
              </div>
              <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <X size={16} />
              </button>
            </div>
            {!isIOS && deferred && (
              <button
                onClick={handleInstall}
                className="mt-3 w-full py-2 rounded-xl gradient-blue text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Instalar agora
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
