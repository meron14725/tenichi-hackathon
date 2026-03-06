"""app/utils/auth.py のユニットテスト."""

from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import jwt
import pytest

from app.utils.auth import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestHashPassword:
    def test_returns_different_from_plain(self):
        hashed = hash_password("mypassword")
        assert hashed != "mypassword"

    def test_returns_string(self):
        hashed = hash_password("mypassword")
        assert isinstance(hashed, str)

    def test_different_calls_return_different_hashes(self):
        hash1 = hash_password("mypassword")
        hash2 = hash_password("mypassword")
        assert hash1 != hash2  # salt が異なるため


class TestVerifyPassword:
    def test_correct_password(self):
        hashed = hash_password("mypassword")
        assert verify_password("mypassword", hashed) is True

    def test_wrong_password(self):
        hashed = hash_password("mypassword")
        assert verify_password("wrongpassword", hashed) is False


class TestCreateAccessToken:
    def test_returns_string(self):
        token = create_access_token(user_id=1)
        assert isinstance(token, str)

    def test_token_contains_correct_claims(self):
        token = create_access_token(user_id=42)
        payload = decode_access_token(token)
        assert payload["sub"] == "42"
        assert payload["type"] == "access"
        assert "iat" in payload
        assert "exp" in payload


class TestDecodeAccessToken:
    def test_decode_valid_token(self):
        token = create_access_token(user_id=1)
        payload = decode_access_token(token)
        assert payload["sub"] == "1"
        assert payload["type"] == "access"

    def test_decode_expired_token(self):
        with patch("app.utils.auth.datetime") as mock_datetime:
            mock_datetime.now.return_value = datetime(2020, 1, 1, tzinfo=UTC)
            mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)
            # 過去に作った期限切れトークンを直接生成
            past = datetime(2020, 1, 1, tzinfo=UTC)
            payload = {
                "sub": "1",
                "iat": past,
                "exp": past + timedelta(seconds=-1),
                "type": "access",
            }
            from app.config import settings

            expired_token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

        with pytest.raises(jwt.ExpiredSignatureError):
            decode_access_token(expired_token)

    def test_decode_invalid_token(self):
        with pytest.raises(jwt.DecodeError):
            decode_access_token("this-is-not-a-valid-token")


class TestCreateRefreshToken:
    def test_returns_string(self):
        token = create_refresh_token()
        assert isinstance(token, str)

    def test_returns_unique_values(self):
        token1 = create_refresh_token()
        token2 = create_refresh_token()
        assert token1 != token2

    def test_has_reasonable_length(self):
        token = create_refresh_token()
        assert len(token) > 20  # secrets.token_urlsafe(64) は ~86文字
