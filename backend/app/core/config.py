from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me"
    FRONTEND_URL: str = "http://localhost:3000"

    DATABASE_URL: str = ""
    DATABASE_URL_SYNC: str = ""
    REDIS_URL: str = "redis://localhost:6379"

    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    JWT_ALGORITHM: str = "HS256"

    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@saas-enem.com.br"

    OPENAI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_ID_1M: str = ""
    STRIPE_PRICE_ID_3M: str = ""
    STRIPE_PRICE_ID_6M: str = ""

    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "saas-enem-assets"


settings = Settings()
