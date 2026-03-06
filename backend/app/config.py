from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "postgresql+asyncpg://tenichi:tenichi@localhost:5432/tenichi"
    JWT_SECRET: str = "dev-secret-key"
    WEATHERAPI_KEY: str = ""
    GEMINI_API_KEY: str = ""
    OTP2_GRAPHQL_URL: str = "http://localhost:8080/otp/gtfs/v1"

    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }


settings = Settings()
