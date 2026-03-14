"""OTP2 結合テスト用フィクスチャ.

PostgreSQL / OTP2 がどちらも起動していない場合、
テスト収集段階で全テストをスキップする。
"""

import os
from datetime import datetime, timedelta, timezone

import httpx
import pytest

from app.config import settings

# --- 東京都内 GTFS カバー範囲の座標定数 ---

SHINJUKU = {"lat": 35.6896, "lon": 139.7006}
TOKYO_STATION = {"lat": 35.6812, "lon": 139.7671}
SHIBUYA = {"lat": 35.6580, "lon": 139.7016}
KOENJI = {"lat": 35.7057, "lon": 139.6496}
ROPPONGI = {"lat": 35.6627, "lon": 139.7311}
IKEBUKURO = {"lat": 35.7295, "lon": 139.7109}
SHINAGAWA = {"lat": 35.6284, "lon": 139.7387}
UENO = {"lat": 35.7141, "lon": 139.7774}
AKIHABARA = {"lat": 35.6984, "lon": 139.7731}
MEGURO = {"lat": 35.6340, "lon": 139.7158}

JST = timezone(timedelta(hours=9))


def _check_postgres() -> bool:
    """PostgreSQL への接続を同期的に確認する."""
    import socket

    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://tenichi:tenichi@localhost:5432/tenichi",
    )
    # URL からホスト・ポートを簡易抽出
    try:
        # postgresql+asyncpg://user:pass@host:port/db
        after_at = db_url.split("@")[1]
        host_port = after_at.split("/")[0]
        host, port_str = host_port.rsplit(":", 1)
        port = int(port_str)
    except (IndexError, ValueError):
        host, port = "localhost", 5432

    try:
        sock = socket.create_connection((host, port), timeout=3)
        sock.close()
        return True
    except OSError:
        return False


def _check_otp2() -> bool:
    """OTP2 サーバーが稼働中か確認する."""
    otp2_base = settings.OTP2_GRAPHQL_URL.rsplit("/otp/", 1)[0] + "/otp/"
    try:
        resp = httpx.get(otp2_base, timeout=5.0)
        return resp.status_code == 200
    except httpx.HTTPError:
        return False


# 結果をキャッシュ
_PG_OK = _check_postgres()
_OTP2_OK = _check_otp2()


def pytest_collection_modifyitems(config, items):
    """テスト収集後、サービス未起動なら全テストにスキップマーカーを付与."""
    reasons = []
    if not _PG_OK:
        reasons.append("PostgreSQL is not running")
    if not _OTP2_OK:
        reasons.append("OTP2 is not running")

    if reasons:
        skip_marker = pytest.mark.skip(reason=" / ".join(reasons))
        for item in items:
            if "integration" in str(item.fspath):
                item.add_marker(skip_marker)


@pytest.fixture
def future_arrival_time() -> str:
    """現在時刻 +2 時間の JST ISO 8601 文字列を返す."""
    future = datetime.now(JST) + timedelta(hours=2)
    return future.isoformat()
