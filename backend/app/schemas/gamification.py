from datetime import date, datetime
from pydantic import BaseModel


class BadgeOut(BaseModel):
    id: str
    name: str
    description: str | None
    icon: str | None        # emoji armazenado em icon_url
    tier: str               # bronze | silver | gold
    unlocked: bool
    unlocked_at: datetime | None


class UserPointsOut(BaseModel):
    total_points: int
    current_level: int
    xp_for_current_level: int   # limiar do nível atual
    xp_for_next_level: int      # limiar do próximo nível
    xp_progress: int            # XP acumulado dentro do nível atual
    xp_to_next: int             # XP restante para o próximo nível
    progress_percent: int        # 0–100 dentro do nível atual
    is_max_level: bool


class StreakOut(BaseModel):
    current_streak: int
    longest_streak: int
    last_studied_date: date | None
    streak_broken_count: int


class HeatmapDay(BaseModel):
    date: str           # YYYY-MM-DD
    hours: float
    intensity: int      # 0–4 (0=nenhum, 4=3h+)


class LeaderboardEntry(BaseModel):
    rank: int
    display_name: str   # anonimizado
    level: int
    total_points: int
    current_streak: int


class GamificationResponse(BaseModel):
    points: UserPointsOut
    streak: StreakOut
    badges: list[BadgeOut]
    badges_count: int           # total desbloqueado
    heatmap: list[HeatmapDay]   # últimos 84 dias


class LeaderboardResponse(BaseModel):
    weekly: list[LeaderboardEntry]
    all_time: list[LeaderboardEntry]
    user_rank_weekly: int | None
    user_rank_alltime: int | None


class AwardXPResult(BaseModel):
    xp_earned: int
    total_points: int
    current_level: int
    leveled_up: bool
    new_badges: list[BadgeOut]
