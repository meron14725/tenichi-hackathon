# リアルタイム運行状況エンドポイント

## 背景
フロントエンドからスケジュールリストに紐づく路線のリアルタイム運行状況を取得したい。
Gemini の Google Search grounding を使い、Web上の最新運行情報を検索して要約する。

## 作業内容
1. GET /api/v1/transit-status?schedule_list_id={id} エンドポイント新設
2. gemini_service に Google Search grounding 付きの運行状況生成関数追加（`_generate` にオプショナル `tools` パラメータ追加）
3. transit_status_service でDB取得→路線抽出→Gemini呼び出しのオーケストレーション
4. ユニットテスト作成（22件）

## 実装箇所
- backend/app/schemas/transit_status.py（新規）— TransitLineInfo, TransitStatusResponse
- backend/app/services/gemini_service.py（変更）— TRANSIT_STATUS_SYSTEM_INSTRUCTION, generate_transit_status(), _generate() にtools引数追加
- backend/app/services/transit_status_service.py（新規）— _extract_lines_from_route_data, _format_lines_for_prompt, get_transit_status
- backend/app/api/transit_status.py（新規）— GET /transit-status エンドポイント
- backend/app/main.py（変更）— transit_status_router 登録
- backend/tests/unit/test_transit_status.py（新規）— ユニット＋結合テスト22件

## テスト結果
- pytest tests/unit/test_transit_status.py -v: **22 passed**
- ruff check / ruff format: **pass**
