"""テストアカウントにモックデータを投入するスクリプト.

本番APIにHTTPリクエストを送り、スケジュール・テンプレート・
スケジュールリスト等のサンプルデータを作成する。

Usage:
    cd backend
    source .venv/bin/activate
    python scripts/seed_test_data.py
"""

import httpx

BASE_URL = "https://fastapi-backend-825512055944.asia-northeast1.run.app"
API = f"{BASE_URL}/api/v1"

# テストアカウント
EMAIL = "test-claude-api@example.com"
PASSWORD = "TestPass123"

# タグID (本番DBで確認済み)
TAG_SHIGOTO = 1  # 仕事
TAG_KAISHOKU = 2  # 会食
TAG_DATE = 3  # デート
TAG_UNDOU = 4  # 運動

# テンプレートカテゴリID
CAT_SHIGOTO = 1  # 仕事の日
CAT_ZAITAKU = 2  # 在宅勤務
CAT_KYUJITSU = 3  # 休日


def login(client: httpx.Client) -> str:
    """ログインしてアクセストークンを返す."""
    resp = client.post(
        f"{API}/auth/login",
        json={"email": EMAIL, "password": PASSWORD},
    )
    resp.raise_for_status()
    token = resp.json()["access_token"]
    print(f"✓ ログイン成功 (user: {EMAIL})")
    return token


def update_user_settings(client: httpx.Client) -> None:
    """ユーザー設定を更新."""
    resp = client.put(
        f"{API}/users/me/settings",
        json={
            "home_address": "東京都世田谷区三軒茶屋1-1-1",
            "home_lat": 35.643588,
            "home_lon": 139.670879,
            "preparation_minutes": 30,
            "reminder_minutes_before": 15,
        },
    )
    resp.raise_for_status()
    print("✓ ユーザー設定を更新")


def create_templates(client: httpx.Client) -> None:
    """テンプレートを作成."""
    templates = [
        {
            "name": "仕事の日ルーティン",
            "category_id": CAT_SHIGOTO,
            "schedules": [
                {
                    "title": "朝の準備・ストレッチ",
                    "start_time": "07:00",
                    "end_time": "07:30",
                    "tag_ids": [TAG_UNDOU],
                    "sort_order": 0,
                },
                {
                    "title": "通勤",
                    "start_time": "08:00",
                    "end_time": "08:30",
                    "destination_name": "渋谷オフィス",
                    "destination_address": "東京都渋谷区渋谷2-21-1",
                    "destination_lat": 35.658034,
                    "destination_lon": 139.703532,
                    "travel_mode": "transit",
                    "sort_order": 1,
                },
                {
                    "title": "午前の業務",
                    "start_time": "09:00",
                    "end_time": "12:00",
                    "tag_ids": [TAG_SHIGOTO],
                    "sort_order": 2,
                },
                {
                    "title": "昼休憩",
                    "start_time": "12:00",
                    "end_time": "13:00",
                    "sort_order": 3,
                },
                {
                    "title": "午後の業務",
                    "start_time": "13:00",
                    "end_time": "18:00",
                    "tag_ids": [TAG_SHIGOTO],
                    "sort_order": 4,
                },
                {
                    "title": "退勤",
                    "start_time": "18:30",
                    "end_time": "19:00",
                    "travel_mode": "transit",
                    "sort_order": 5,
                },
            ],
        },
        {
            "name": "在宅勤務の日",
            "category_id": CAT_ZAITAKU,
            "schedules": [
                {
                    "title": "朝食・準備",
                    "start_time": "08:00",
                    "end_time": "08:30",
                    "sort_order": 0,
                },
                {
                    "title": "リモートワーク（午前）",
                    "start_time": "09:00",
                    "end_time": "12:00",
                    "tag_ids": [TAG_SHIGOTO],
                    "sort_order": 1,
                },
                {
                    "title": "昼休憩・散歩",
                    "start_time": "12:00",
                    "end_time": "13:00",
                    "travel_mode": "walking",
                    "sort_order": 2,
                },
                {
                    "title": "リモートワーク（午後）",
                    "start_time": "13:00",
                    "end_time": "18:00",
                    "tag_ids": [TAG_SHIGOTO],
                    "sort_order": 3,
                },
            ],
        },
        {
            "name": "休日のお出かけ",
            "category_id": CAT_KYUJITSU,
            "schedules": [
                {
                    "title": "準備",
                    "start_time": "10:00",
                    "end_time": "10:30",
                    "sort_order": 0,
                },
                {
                    "title": "カフェでランチ",
                    "start_time": "11:00",
                    "end_time": "12:00",
                    "travel_mode": "transit",
                    "sort_order": 1,
                },
                {
                    "title": "ショッピング",
                    "start_time": "13:00",
                    "end_time": "16:00",
                    "travel_mode": "walking",
                    "sort_order": 2,
                },
                {
                    "title": "映画鑑賞",
                    "start_time": "17:00",
                    "end_time": "19:00",
                    "sort_order": 3,
                },
            ],
        },
    ]

    for tmpl in templates:
        resp = client.post(f"{API}/templates", json=tmpl)
        resp.raise_for_status()
        print(f"  ✓ テンプレート作成: {tmpl['name']}")
    print("✓ テンプレート 3件作成完了")


def create_schedule_lists_and_schedules(client: httpx.Client) -> None:
    """スケジュールリスト + スケジュール + 持ち物を作成."""

    # === 2026-03-20 出社の日 ===
    resp = client.post(
        f"{API}/schedule-lists",
        json={
            "name": "出社の日",
            "date": "2026-03-20",
            "packing_items": [
                {"name": "名刺", "sort_order": 0},
                {"name": "ノートPC", "sort_order": 1},
                {"name": "折りたたみ傘", "sort_order": 2},
                {"name": "充電器", "sort_order": 3},
            ],
        },
    )
    resp.raise_for_status()
    list_0320 = resp.json()["id"]
    print(f"  ✓ スケジュールリスト作成: 出社の日 (id={list_0320})")

    schedules_0320 = [
        {
            "title": "朝の準備",
            "start_at": "2026-03-20T07:00:00+09:00",
            "end_at": "2026-03-20T07:30:00+09:00",
            "schedule_list_id": list_0320,
        },
        {
            "title": "通勤",
            "start_at": "2026-03-20T08:00:00+09:00",
            "end_at": "2026-03-20T09:00:00+09:00",
            "destination_name": "渋谷ヒカリエ",
            "destination_address": "東京都渋谷区渋谷2-21-1",
            "destination_lat": 35.658034,
            "destination_lon": 139.703532,
            "travel_mode": "transit",
            "schedule_list_id": list_0320,
        },
        {
            "title": "チームMTG",
            "start_at": "2026-03-20T09:00:00+09:00",
            "end_at": "2026-03-20T12:00:00+09:00",
            "destination_name": "渋谷ヒカリエ",
            "destination_address": "東京都渋谷区渋谷2-21-1",
            "destination_lat": 35.658034,
            "destination_lon": 139.703532,
            "tag_ids": [TAG_SHIGOTO],
            "schedule_list_id": list_0320,
        },
        {
            "title": "ランチ",
            "start_at": "2026-03-20T12:00:00+09:00",
            "end_at": "2026-03-20T13:00:00+09:00",
            "destination_name": "六本木ヒルズ",
            "destination_address": "東京都港区六本木6-10-1",
            "destination_lat": 35.662836,
            "destination_lon": 139.731443,
            "schedule_list_id": list_0320,
        },
        {
            "title": "開発作業",
            "start_at": "2026-03-20T13:00:00+09:00",
            "end_at": "2026-03-20T17:00:00+09:00",
            "tag_ids": [TAG_SHIGOTO],
            "schedule_list_id": list_0320,
        },
        {
            "title": "取引先との会食",
            "start_at": "2026-03-20T18:00:00+09:00",
            "end_at": "2026-03-20T20:00:00+09:00",
            "destination_name": "銀座 鮨かねさか",
            "destination_address": "東京都中央区銀座8-10-3",
            "destination_lat": 35.671747,
            "destination_lon": 139.764611,
            "travel_mode": "transit",
            "tag_ids": [TAG_KAISHOKU],
            "memo": "田中部長と同行。手土産を忘れずに。",
            "schedule_list_id": list_0320,
        },
    ]
    for s in schedules_0320:
        resp = client.post(f"{API}/schedules", json=s)
        resp.raise_for_status()
    print("  ✓ 3/20 スケジュール 6件作成")

    # === 2026-03-21 デートの日 ===
    resp = client.post(
        f"{API}/schedule-lists",
        json={
            "name": "デートの日",
            "date": "2026-03-21",
            "packing_items": [
                {"name": "財布", "sort_order": 0},
                {"name": "モバイルバッテリー", "sort_order": 1},
            ],
        },
    )
    resp.raise_for_status()
    list_0321 = resp.json()["id"]
    print(f"  ✓ スケジュールリスト作成: デートの日 (id={list_0321})")

    schedules_0321 = [
        {
            "title": "準備",
            "start_at": "2026-03-21T10:00:00+09:00",
            "end_at": "2026-03-21T10:30:00+09:00",
            "schedule_list_id": list_0321,
        },
        {
            "title": "ブランチ",
            "start_at": "2026-03-21T11:00:00+09:00",
            "end_at": "2026-03-21T12:30:00+09:00",
            "destination_name": "IVY PLACE 代官山",
            "destination_address": "東京都渋谷区猿楽町16-15",
            "destination_lat": 35.648755,
            "destination_lon": 139.703055,
            "travel_mode": "transit",
            "schedule_list_id": list_0321,
        },
        {
            "title": "東京都現代美術館",
            "start_at": "2026-03-21T13:00:00+09:00",
            "end_at": "2026-03-21T15:00:00+09:00",
            "destination_name": "東京都現代美術館",
            "destination_address": "東京都江東区三好4-1-1",
            "destination_lat": 35.680367,
            "destination_lon": 139.806882,
            "travel_mode": "walking",
            "tag_ids": [TAG_DATE],
            "memo": "企画展「現代アートの冒険」開催中",
            "schedule_list_id": list_0321,
        },
        {
            "title": "カフェ",
            "start_at": "2026-03-21T15:30:00+09:00",
            "end_at": "2026-03-21T17:00:00+09:00",
            "destination_name": "ブルーボトルコーヒー 清澄白河",
            "destination_address": "東京都江東区平野1-4-8",
            "destination_lat": 35.680859,
            "destination_lon": 139.800992,
            "travel_mode": "walking",
            "schedule_list_id": list_0321,
        },
        {
            "title": "ディナー",
            "start_at": "2026-03-21T18:00:00+09:00",
            "end_at": "2026-03-21T20:00:00+09:00",
            "destination_name": "恵比寿 イタリアン",
            "destination_address": "東京都渋谷区恵比寿南1-1-1",
            "destination_lat": 35.646833,
            "destination_lon": 139.710073,
            "travel_mode": "transit",
            "tag_ids": [TAG_KAISHOKU],
            "memo": "予約済み 18:00〜 2名",
            "schedule_list_id": list_0321,
        },
    ]
    for s in schedules_0321:
        resp = client.post(f"{API}/schedules", json=s)
        resp.raise_for_status()
    print("  ✓ 3/21 スケジュール 5件作成")

    # === 2026-03-23 在宅勤務 ===
    resp = client.post(
        f"{API}/schedule-lists",
        json={
            "name": "在宅勤務",
            "date": "2026-03-23",
            "packing_items": [],
        },
    )
    resp.raise_for_status()
    list_0323 = resp.json()["id"]
    print(f"  ✓ スケジュールリスト作成: 在宅勤務 (id={list_0323})")

    schedules_0323 = [
        {
            "title": "朝食",
            "start_at": "2026-03-23T08:00:00+09:00",
            "end_at": "2026-03-23T08:30:00+09:00",
            "schedule_list_id": list_0323,
        },
        {
            "title": "リモートワーク",
            "start_at": "2026-03-23T09:00:00+09:00",
            "end_at": "2026-03-23T12:00:00+09:00",
            "tag_ids": [TAG_SHIGOTO],
            "schedule_list_id": list_0323,
        },
        {
            "title": "昼休憩・ジョギング",
            "start_at": "2026-03-23T12:00:00+09:00",
            "end_at": "2026-03-23T13:00:00+09:00",
            "travel_mode": "walking",
            "tag_ids": [TAG_UNDOU],
            "schedule_list_id": list_0323,
        },
        {
            "title": "コードレビュー",
            "start_at": "2026-03-23T13:00:00+09:00",
            "end_at": "2026-03-23T15:00:00+09:00",
            "tag_ids": [TAG_SHIGOTO],
            "schedule_list_id": list_0323,
        },
        {
            "title": "1on1ミーティング",
            "start_at": "2026-03-23T15:00:00+09:00",
            "end_at": "2026-03-23T16:00:00+09:00",
            "tag_ids": [TAG_SHIGOTO],
            "memo": "マネージャーとの週次1on1",
            "schedule_list_id": list_0323,
        },
        {
            "title": "開発作業",
            "start_at": "2026-03-23T16:00:00+09:00",
            "end_at": "2026-03-23T18:00:00+09:00",
            "tag_ids": [TAG_SHIGOTO],
            "schedule_list_id": list_0323,
        },
    ]
    for s in schedules_0323:
        resp = client.post(f"{API}/schedules", json=s)
        resp.raise_for_status()
    print("  ✓ 3/23 スケジュール 6件作成")

    print("✓ スケジュールリスト 3件 + スケジュール 17件作成完了")


def create_standalone_schedules(client: httpx.Client) -> None:
    """スケジュールリストに紐づかない単独スケジュールを作成."""
    schedules = [
        {
            "title": "ジム",
            "start_at": "2026-03-22T14:00:00+09:00",
            "end_at": "2026-03-22T15:30:00+09:00",
            "destination_name": "ゴールドジム渋谷",
            "destination_address": "東京都渋谷区神南1-12-14",
            "destination_lat": 35.660272,
            "destination_lon": 139.698791,
            "travel_mode": "walking",
            "tag_ids": [TAG_UNDOU],
            "memo": "レッグデイ。プロテイン持参。",
        },
        {
            "title": "友人との飲み会",
            "start_at": "2026-03-24T19:00:00+09:00",
            "end_at": "2026-03-24T21:00:00+09:00",
            "destination_name": "新宿 居酒屋",
            "destination_address": "東京都新宿区歌舞伎町1-1-1",
            "destination_lat": 35.689738,
            "destination_lon": 139.700471,
            "travel_mode": "transit",
            "tag_ids": [TAG_KAISHOKU],
            "memo": "大学の同期5人。幹事は佐藤。",
        },
        {
            "title": "歯医者",
            "start_at": "2026-03-25T10:00:00+09:00",
            "end_at": "2026-03-25T11:00:00+09:00",
            "destination_name": "渋谷デンタルクリニック",
            "destination_address": "東京都渋谷区道玄坂1-2-3",
            "destination_lat": 35.659517,
            "destination_lon": 139.700553,
            "travel_mode": "transit",
            "memo": "定期検診。保険証を忘れずに。",
        },
    ]

    for s in schedules:
        resp = client.post(f"{API}/schedules", json=s)
        resp.raise_for_status()
        print(f"  ✓ 単独スケジュール作成: {s['title']}")
    print("✓ 単独スケジュール 3件作成完了")


def main() -> None:
    """メイン処理."""
    print("=" * 50)
    print("テストアカウント モックデータ投入スクリプト")
    print(f"対象: {BASE_URL}")
    print("=" * 50)

    with httpx.Client(timeout=30) as client:
        # 1. ログイン
        token = login(client)
        client.headers["Authorization"] = f"Bearer {token}"

        # 2. ユーザー設定更新
        print("\n--- ユーザー設定 ---")
        update_user_settings(client)

        # 3. テンプレート作成
        print("\n--- テンプレート ---")
        create_templates(client)

        # 4. スケジュールリスト + スケジュール作成
        print("\n--- スケジュールリスト & スケジュール ---")
        create_schedule_lists_and_schedules(client)

        # 5. 単独スケジュール作成
        print("\n--- 単独スケジュール ---")
        create_standalone_schedules(client)

    print("\n" + "=" * 50)
    print("✓ 全データ投入完了!")
    print("=" * 50)


if __name__ == "__main__":
    main()
