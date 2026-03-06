"""app/schemas/auth.py のユニットテスト."""

import pytest
from pydantic import ValidationError

from app.schemas.auth import LoginRequest, RegisterRequest


class TestRegisterRequest:
    def test_valid_input(self):
        data = RegisterRequest(
            email="test@example.com",
            password="Password123",
            name="Test User",
            home_address="東京都渋谷区",
            home_lat=35.6584,
            home_lon=139.7015,
            preparation_minutes=30,
            reminder_minutes_before=15,
        )
        assert data.email == "test@example.com"
        assert data.name == "Test User"

    def test_invalid_email(self):
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(
                email="not-an-email",
                password="Password123",
                name="Test User",
                home_address="東京都渋谷区",
                home_lat=35.6584,
                home_lon=139.7015,
                preparation_minutes=30,
                reminder_minutes_before=15,
            )
        assert "email" in str(exc_info.value).lower()

    def test_missing_required_field(self):
        with pytest.raises(ValidationError):
            RegisterRequest(
                email="test@example.com",
                password="Password123",
                # name が欠落
            )

    def test_short_password(self):
        with pytest.raises(ValidationError):
            RegisterRequest(
                email="test@example.com",
                password="short",
                name="Test User",
                home_address="東京都渋谷区",
                home_lat=35.6584,
                home_lon=139.7015,
                preparation_minutes=30,
                reminder_minutes_before=15,
            )


class TestLoginRequest:
    def test_valid_input(self):
        data = LoginRequest(
            email="test@example.com",
            password="Password123",
        )
        assert data.email == "test@example.com"

    def test_invalid_email(self):
        with pytest.raises(ValidationError):
            LoginRequest(
                email="invalid",
                password="Password123",
            )
