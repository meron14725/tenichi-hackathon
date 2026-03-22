"""railways.json から transit_lines テーブルにデータをインポートするスクリプト.

データソース: https://github.com/nagix/mini-tokyo-3d/tree/master/data

Usage:
    cd backend
    python scripts/import_railways.py
"""

import asyncio
import json
import urllib.request

from sqlalchemy import select

from app.database import async_session, engine
from app.models.transit_line import TransitLine

RAILWAYS_URL = "https://raw.githubusercontent.com/nagix/mini-tokyo-3d/master/data/railways.json"


async def import_railways() -> None:
    print(f"Fetching railways.json from {RAILWAYS_URL} ...")
    with urllib.request.urlopen(RAILWAYS_URL) as resp:
        data = json.loads(resp.read().decode())

    print(f"Found {len(data)} railways.")

    async with async_session() as session:
        existing = await session.execute(select(TransitLine.line_key))
        existing_keys = {row[0] for row in existing.all()}

        inserted = 0
        skipped = 0
        for r in data:
            line_key = r["id"]
            if line_key in existing_keys:
                skipped += 1
                continue

            operator = line_key.split(".")[0] if "." in line_key else None
            title = r.get("title", {})

            line = TransitLine(
                line_key=line_key,
                name_ja=title.get("ja", ""),
                name_en=title.get("en"),
                color=r.get("color", "#888888"),
                operator=operator,
            )
            session.add(line)
            inserted += 1

        await session.commit()
        print(f"Done: {inserted} inserted, {skipped} skipped (already exist).")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(import_railways())
