from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.healthz import router as healthz_router
from app.config import settings
from app.exceptions import (
    AppError,
    app_error_handler,
    generic_error_handler,
    validation_error_handler,
)

app = FastAPI(title="Tenichi API")

if settings.ENVIRONMENT == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, generic_error_handler)

app.include_router(healthz_router)
