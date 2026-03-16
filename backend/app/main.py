from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.healthz import router as healthz_router
from app.api.notifications import router as notifications_router
from app.api.routes import router as routes_router
from app.api.schedule_lists import router as schedule_lists_router
from app.api.schedule_routes import router as schedule_routes_router
from app.api.schedules import router as schedules_router
from app.api.suggestions import router as suggestions_router
from app.api.tags import router as tags_router
from app.api.templates import router as templates_router
from app.api.users import router as users_router
from app.api.weather import router as weather_router
from app.exceptions import (
    AppError,
    app_error_handler,
    generic_error_handler,
    validation_error_handler,
)

app = FastAPI(title="Tenichi API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, validation_error_handler)  # type: ignore[arg-type]
app.add_exception_handler(Exception, generic_error_handler)

app.include_router(healthz_router)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(tags_router, prefix="/api/v1")
app.include_router(schedules_router, prefix="/api/v1")
app.include_router(schedule_lists_router, prefix="/api/v1")
app.include_router(templates_router, prefix="/api/v1")
app.include_router(weather_router, prefix="/api/v1")
app.include_router(routes_router, prefix="/api/v1")
app.include_router(schedule_routes_router, prefix="/api/v1")
app.include_router(suggestions_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
