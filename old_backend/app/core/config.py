from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "LIFELINK"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./lifelink.db"

    # Security
    JWT_SECRET: str = "lifelink_super_secure_secret_key_change_in_production_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Real Geography & Maps Provider
    MAPS_PROVIDER: Literal["osrm", "mapbox", "google"] = "osrm"
    MAPBOX_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""

    # Digital Twin Simulation — Pune Metropolitan Area
    SIMULATION_ENABLED: bool = True
    SIMULATION_TICK_SECONDS: float = 3.0
    DEFAULT_CITY: str = "Pune, Maharashtra, India"
    DEFAULT_CENTER_LAT: float = 18.5204
    DEFAULT_CENTER_LNG: float = 73.8567

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
