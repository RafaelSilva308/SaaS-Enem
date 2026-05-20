"use client"

import { create } from "zustand"

export interface BadgeOut {
  id: string
  name: string
  description: string | null
  icon: string | null
  tier: string
  unlocked: boolean
  unlocked_at: string | null
}

export interface GamificationState {
  level: number
  totalPoints: number
  progressPercent: number
  xpToNext: number
  streak: number
  badgesCount: number
  badges: BadgeOut[]
  newBadges: BadgeOut[]     // badges recém-desbloqueadas (para toasts)
  leveledUp: boolean        // flag para animação de level-up
  loaded: boolean

  setGamification: (data: {
    points: { current_level: number; total_points: number; progress_percent: number; xp_to_next: number }
    streak: { current_streak: number }
    badges: BadgeOut[]
    badges_count: number
  }) => void
  setNewBadges: (badges: BadgeOut[]) => void
  clearLevelUp: () => void
  clearNewBadges: () => void
}

export const useGamificationStore = create<GamificationState>()((set, get) => ({
  level: 1,
  totalPoints: 0,
  progressPercent: 0,
  xpToNext: 100,
  streak: 0,
  badgesCount: 0,
  badges: [],
  newBadges: [],
  leveledUp: false,
  loaded: false,

  setGamification: (data) => {
    const prev = get()
    const newLevel = data.points.current_level
    const leveled = prev.loaded && newLevel > prev.level

    // Detectar badges recém-desbloqueadas comparando com estado anterior
    const prevUnlockedIds = new Set(prev.badges.filter((b) => b.unlocked).map((b) => b.id))
    const newBadges = data.badges.filter((b) => b.unlocked && !prevUnlockedIds.has(b.id))

    set({
      level: newLevel,
      totalPoints: data.points.total_points,
      progressPercent: data.points.progress_percent,
      xpToNext: data.points.xp_to_next,
      streak: data.streak.current_streak,
      badgesCount: data.badges_count,
      badges: data.badges,
      leveledUp: leveled,
      newBadges: prev.loaded ? newBadges : [],
      loaded: true,
    })
  },

  setNewBadges: (badges) => set({ newBadges: badges }),
  clearLevelUp: () => set({ leveledUp: false }),
  clearNewBadges: () => set({ newBadges: [] }),
}))
