from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "postgresql+asyncpg://tenichi:tenichi@localhost:5432/tenichi"
    JWT_SECRET: str = "dev-secret-key"
    WEATHERAPI_KEY: str = ""
    GCP_PROJECT_ID: str = ""
    GCP_LOCATION: str = "asia-northeast1"
    OTP2_GRAPHQL_URL: str = "http://localhost:8080/otp/gtfs/v1"
    BATCH_SECRET: str = ""

    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }


settings = Settings()
