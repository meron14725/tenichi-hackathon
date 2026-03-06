import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.exceptions import AppError
from app.models.user import User
from app.utils.auth import decode_access_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise AppError("UNAUTHORIZED", "Token has expired", 401) from None
    except jwt.InvalidTokenError:
        raise AppError("UNAUTHORIZED", "Invalid token", 401) from None

    if payload.get("type") != "access":
        raise AppError("UNAUTHORIZED", "Invalid token type", 401)

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise AppError("UNAUTHORIZED", "User not found", 401)

    return user
