from datetime import datetime
from pydantic import BaseModel


# Tipos canônicos de notificação
class NotifType:
    DAILY_REMINDER        = "daily_reminder"
    STREAK_AT_RISK        = "streak_at_risk"
    STREAK_BROKEN         = "streak_broken"
    BADGE_EARNED          = "badge_earned"
    LEVEL_UP              = "level_up"
    ESSAY_ANALYZED        = "essay_analyzed"
    EXAM_COMPLETED        = "exam_completed"
    SPRINT_COMPLETED      = "sprint_completed"
    DELAY_DETECTED        = "delay_detected"
    PLAN_UPDATED          = "plan_updated"
    SUBSCRIPTION_EXPIRING = "subscription_expiring"
    GOAL_NOT_REACHED      = "goal_not_reached"


class NotificationOut(BaseModel):
    id: str
    type: str | None
    title: str | None
    message: str | None
    related_entity_type: str | None
    related_entity_id: str | None
    is_read: bool
    created_at: datetime


class NotificationsResponse(BaseModel):
    notifications: list[NotificationOut]
    total: int
    unread_count: int
    page: int
    per_page: int
    total_pages: int


class UnreadCountResponse(BaseModel):
    count: int


class PushSubscriptionIn(BaseModel):
    endpoint: str
    keys: dict   # {"p256dh": str, "auth": str}


class VapidPublicKeyOut(BaseModel):
    public_key: str
