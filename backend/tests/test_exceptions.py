"""app/exceptions.py のユニットテスト."""

from app.exceptions import AppError


class TestAppError:
    def test_default_values(self):
        err = AppError(code="BAD_REQUEST", message="Something went wrong")
        assert err.code == "BAD_REQUEST"
        assert err.message == "Something went wrong"
        assert err.status_code == 400
        assert err.details == []

    def test_custom_values(self):
        err = AppError(
            code="NOT_FOUND",
            message="Resource not found",
            status_code=404,
            details=[{"field": "id", "message": "Invalid ID"}],
        )
        assert err.code == "NOT_FOUND"
        assert err.status_code == 404
        assert len(err.details) == 1
        assert err.details[0]["field"] == "id"

    def test_is_exception(self):
        err = AppError(code="ERROR", message="test")
        assert isinstance(err, Exception)
