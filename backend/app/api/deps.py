"""依存注入（Dependency Injection）の定義。

TODO: Phase 2（認証）・Phase 3（UserSettings）実装後に正式な実装に差し替える。

現在の状態:
- get_current_user: Phase 2（JWT 認証）実装後に差し替え
- 戻り値の型 User は Phase 2 で定義する SQLAlchemy モデルを想定
  - user.settings.home_lat / home_lon / preparation_minutes が利用される
"""
from fastapi import HTTPException, status


async def get_current_user():
    """認証済みユーザーを返す依存注入。

    Phase 2（JWT 認証）実装後に以下と差し替える:
    1. Authorization ヘッダーからトークンを取得
    2. JWT を検証してユーザー ID を取得
    3. DB から User + UserSettings を取得して返す
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="認証機能は Phase 2 で実装予定です",
    )
