# 外部天気予報API調査

## 概要

ハッカソンプロジェクトで利用する天気予報APIの選定のため、無料枠があるAPIを中心に調査した。

---

## 各API 詳細

### 1. Open-Meteo

**概要**
オープンソースの天気予報APIで、登録不要・APIキー不要で利用できる。複数の気象モデルに対応しており、日本気象庁（JMA）モデルも採用している。

**無料枠**
- 完全無料（商用利用は有償プランが別途必要）
- レート制限: 10,000 calls/日（非商用）

**特徴**
- APIキー不要（登録なしで即利用可能）
- 日本気象庁（JMA）モデルを採用し、日本国内の精度が高い
- 予報期間: 最大16日先まで
- 過去データ・現在地天気・時間別予報に対応
- レスポンス形式: JSON

**制限**
- 非商用利用のみ（商用利用は有償プラン: $49/月〜）
- SLAの保証なし

**エンドポイント例**
```
GET https://api.open-meteo.com/v1/forecast?latitude=35.6762&longitude=139.6503&current_weather=true&hourly=temperature_2m,precipitation_probability,weathercode
```

**レスポンス例**
```json
{
  "latitude": 35.676,
  "longitude": 139.65,
  "current_weather": {
    "temperature": 18.2,
    "windspeed": 5.4,
    "weathercode": 1,
    "time": "2026-02-28T12:00"
  }
}
```

---

### 2. WeatherAPI.com

**概要**
商用利用可能な天気予報APIで、無料プランでも月100万コールまで利用できる。

**無料枠**
- 1,000,000 calls/月（無料プラン）
- リアルタイム天気・3日間予報・履歴データに対応

**特徴**
- 月100万コールは実質的に無制限に近い
- 日本気象庁（JMA）モデルのデータも使用
- 商用利用可能
- 日本語の天気状況テキストに対応
- レスポンス形式: JSON / XML

**制限**
- APIキー必要（無料登録で取得可能）
- 無料プランでは過去データは7日分まで

**エンドポイント例**
```
GET https://api.weatherapi.com/v1/current.json?key={API_KEY}&q=Tokyo&lang=ja
```

**レスポンス例**
```json
{
  "location": {
    "name": "Tokyo",
    "country": "Japan"
  },
  "current": {
    "temp_c": 18.2,
    "condition": {
      "text": "晴れ",
      "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png"
    },
    "humidity": 65
  }
}
```

---

### 3. OpenWeatherMap

**概要**
世界的に広く使われている天気APIで、豊富なドキュメントとコミュニティが強み。

**無料枠**
- 1,000 calls/日（Freeプラン）
- 現在の天気・5日間予報（3時間ごと）に対応

**特徴**
- ドキュメントが充実しており情報が豊富
- 全球対応（日本も含む）
- 商用利用可能
- レスポンス形式: JSON / XML

**制限**
- APIキー必要（無料登録で取得可能）
- 無料プランではcallsが1,000/日と少なめ
- 有料プランへの移行が必要になりやすい（$40/月〜）

**エンドポイント例**
```
GET https://api.openweathermap.org/data/2.5/weather?lat=35.6762&lon=139.6503&appid={API_KEY}&units=metric&lang=ja
```

---

### 4. 気象庁API（非公式）

**概要**
気象庁の公式サイトで使用されているAPIを直接利用する方法。公式ドキュメントはないが、コミュニティで解析されたエンドポイントが公開されている。

**無料枠**
- 完全無料
- 利用制限なし（公式ドキュメント外での利用）

**特徴**
- 完全無料・APIキー不要
- 日本専用で国内精度が最高
- 商用利用可能（帰属表示が必要）
- 利用条件: [気象庁ウェブサイトについて](https://www.jma.go.jp/jma/kishou/info/coment.html) に準拠

**制限**
- 非公式APIのため仕様変更のリスクあり
- ドキュメントが少ない
- 詳細な時間別予報の取得が難しい

**エンドポイント例**
```
GET https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json
```
（130000は東京都の地域コード）

---

### 5. Tomorrow.io

**概要**
高精度な気象データを提供するAPIで、ミクロスケールの予報が特徴。

**無料枠**
- 500 calls/日（Freeプラン）

**特徴**
- 高精度な予報モデル
- 全球対応
- 商用利用可能
- ウェザーイベント（雷雨・雪・霧など）の詳細な分類

**制限**
- APIキー必要
- 無料枠が500 calls/日と少ない
- 有料プラン: $199/月〜

**エンドポイント例**
```
GET https://api.tomorrow.io/v4/weather/realtime?location=35.6762,139.6503&apikey={API_KEY}
```

---

## 比較表

| API | 無料枠 | APIキー | 日本対応 | 商用利用 | 備考 |
|-----|--------|--------|---------|---------|------|
| Open-Meteo | 10,000 calls/日 | 不要 | JMAモデル採用（高精度） | 非商用のみ | 登録不要で即利用可能 |
| WeatherAPI.com | 1,000,000 calls/月 | 必要（無料登録） | JMAデータ使用 | 可 | 実質無制限に近い |
| OpenWeatherMap | 1,000 calls/日 | 必要（無料登録） | 全球対応 | 可 | ドキュメント充実 |
| 気象庁API | 完全無料 | 不要 | 日本専用（最高精度） | 可（帰属表示要） | 非公式・仕様変更リスクあり |
| Tomorrow.io | 500 calls/日 | 必要 | 全球対応 | 可 | 高精度だが無料枠が少ない |

---

## 推奨

### ハッカソン用途（非商用）: **Open-Meteo**

**理由:**
- 登録不要・APIキー不要で即開発開始できる
- JMAモデルを採用しており日本国内の予報精度が高い
- 10,000 calls/日の無料枠でハッカソン規模では十分
- 完全無料のため予算を気にせず開発に集中できる
- オープンソースでドキュメントも整備されている

**接続確認コマンド**
```bash
curl "https://api.open-meteo.com/v1/forecast?latitude=35.6762&longitude=139.6503&current_weather=true"
```

---

### 商用化も視野に入れる場合: **WeatherAPI.com**

**理由:**
- 月100万コールは商用サービスでも十分な量
- 無料登録のみでAPIキーを取得でき、コスト不要でスタートできる
- JMAデータを使用した日本精度の高い予報
- 商用利用可能で将来のスケールアップも容易
- 日本語レスポンス対応

---

## 参考リンク

- [Open-Meteo 公式ドキュメント](https://open-meteo.com/en/docs)
- [WeatherAPI.com 公式ドキュメント](https://www.weatherapi.com/docs/)
- [OpenWeatherMap 公式ドキュメント](https://openweathermap.org/api)
- [気象庁 天気予報API（非公式）](https://weather.tsukumijima.net/)
- [Tomorrow.io 公式ドキュメント](https://docs.tomorrow.io/)
