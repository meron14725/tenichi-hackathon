"""Gemini-powered automated code review for Pull Requests with context caching."""

import json
import os
import re

from github import Auth, Github
from google import genai
from google.genai import types

REVIEWABLE_EXTENSIONS = {
    ".py",
    ".yml",
    ".yaml",
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".html",
    ".css",
    ".scss",
    ".json",
    ".toml",
    ".cfg",
    ".sh",
    ".bash",
    ".sql",
    ".dockerfile",
    ".ini",
}

MAX_FILE_CHARS = 50_000

SYSTEM_INSTRUCTION = """あなたは経験豊富なソフトウェアエンジニアです。
プルリクエストの差分をレビューしてください。
キャッシュされたコンテンツにはレビュー対象ファイルの全文が含まれています。
差分だけでなく、ファイル全体の文脈を踏まえてレビューしてください。

## レビュー観点
1. **バグ・論理エラー**: 明らかなバグや論理的な誤りがないか
2. **セキュリティ**: SQLインジェクション、認証・認可の問題、機密情報の漏洩がないか
3. **パフォーマンス**: N+1クエリ、不要なループ、メモリリークの可能性がないか
4. **可読性・保守性**: 命名規則、コードの構造、コメントの適切さ
5. **エラーハンドリング**: 例外処理の適切さ、エッジケースの考慮

## コーディング規約
- Python 3.12, FastAPI
- ruff でリント・フォーマット（line-length=120, double quotes）
- asyncio ベースの非同期処理

## 出力形式
JSON配列で返してください。指摘がなければ空配列 [] を返してください。
```json
[
  {
    "line": <変更後ファイルの行番号（diffの+側の行番号）>,
    "severity": "MUST" | "WANT" | "NITS",
    "comment": "<具体的な指摘内容>"
  }
]
```

- MUST: 必ず修正すべき問題（バグ、セキュリティ）
- WANT: 修正した方が良い（パフォーマンス、可読性）
- NITS: 細かい指摘（命名、スタイル）
"""

DIFF_PROMPT_TEMPLATE = """以下のファイルの差分をレビューしてください。
キャッシュされたファイル全文を文脈として参照し、差分の変更箇所のみを対象にレビューしてください。

ファイル: {filename}
```diff
{patch}
```
"""

SEVERITY_EMOJI = {
    "MUST": "🔴",
    "WANT": "🟡",
    "NITS": "🔵",
}

GEMINI_MODEL = "gemini-2.5-flash"

# Gemini 2.5 Flash pricing (per 1M tokens)
PRICE_INPUT_PER_M = 0.15
PRICE_CACHED_PER_M = 0.0375
PRICE_OUTPUT_PER_M = 0.60


def is_reviewable_file(filename: str) -> bool:
    """Check if a file should be reviewed based on its extension."""
    if os.path.basename(filename).lower() == "dockerfile":
        return True
    _, ext = os.path.splitext(filename)
    return ext.lower() in REVIEWABLE_EXTENSIONS


def get_gemini_client(project_id: str, region: str) -> genai.Client:
    """Create a Gemini client via Vertex AI."""
    return genai.Client(
        vertexai=True,
        project=project_id,
        location=region,
    )


def fetch_file_contents(repo, pr, files) -> list[types.Part]:
    """Fetch full file contents for caching."""
    parts = []
    for f in files:
        try:
            content_file = repo.get_contents(f.filename, ref=pr.head.ref)
            full_content = content_file.decoded_content.decode("utf-8")
        except Exception as e:
            print(f"  Skipping {f.filename} (cannot read content: {e})")
            continue

        if len(full_content) > MAX_FILE_CHARS:
            print(f"  Skipping {f.filename} (too large: {len(full_content)} chars)")
            continue

        parts.append(types.Part(text=f"=== File: {f.filename} ===\n{full_content}"))
        print(f"  Cached: {f.filename}")

    return parts


def create_context_cache(client: genai.Client, file_parts: list[types.Part], pr_number: int):
    """Create a context cache with file contents and system instruction."""
    return client.caches.create(
        model=GEMINI_MODEL,
        config=types.CreateCachedContentConfig(
            contents=[types.Content(role="user", parts=file_parts)],
            system_instruction=SYSTEM_INSTRUCTION,
            display_name=f"pr-review-{pr_number}",
            ttl="300s",
        ),
    )


def review_file_with_cache(client: genai.Client, cache_name: str, filename: str, patch: str) -> tuple[list[dict], dict]:
    """Review a single file's diff using cached context. Returns (comments, usage_stats)."""
    prompt = DIFF_PROMPT_TEMPLATE.format(filename=filename, patch=patch)

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            cached_content=cache_name,
            response_mime_type="application/json",
        ),
    )

    usage = {
        "input_tokens": getattr(response.usage_metadata, "prompt_token_count", 0) or 0,
        "output_tokens": getattr(response.usage_metadata, "candidates_token_count", 0) or 0,
        "cached_tokens": getattr(response.usage_metadata, "cached_content_token_count", 0) or 0,
    }

    try:
        comments = json.loads(response.text)
    except json.JSONDecodeError:
        print(f"  Warning: Failed to parse JSON for {filename}, skipping.")
        return [], usage

    if not isinstance(comments, list):
        return [], usage

    return comments, usage


def review_file_no_cache(client: genai.Client, filename: str, patch: str) -> tuple[list[dict], dict]:
    """Review a single file's diff without cache (fallback)."""
    prompt = f"""{SYSTEM_INSTRUCTION}

以下のファイルの差分をレビューしてください。

ファイル: {filename}
```diff
{patch}
```
"""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    usage = {
        "input_tokens": getattr(response.usage_metadata, "prompt_token_count", 0) or 0,
        "output_tokens": getattr(response.usage_metadata, "candidates_token_count", 0) or 0,
        "cached_tokens": 0,
    }

    try:
        comments = json.loads(response.text)
    except json.JSONDecodeError:
        print(f"  Warning: Failed to parse JSON for {filename}, skipping.")
        return [], usage

    if not isinstance(comments, list):
        return [], usage

    return comments, usage


def parse_patch_lines(patch: str) -> set[int]:
    """Extract valid new-side line numbers from a unified diff patch."""
    valid_lines = set()
    current_line = 0

    for line in patch.split("\n"):
        hunk_match = re.match(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@", line)
        if hunk_match:
            current_line = int(hunk_match.group(1))
            continue

        if current_line == 0:
            continue

        if line.startswith("+"):
            valid_lines.add(current_line)
            current_line += 1
        elif line.startswith("-"):
            pass
        else:
            valid_lines.add(current_line)
            current_line += 1

    return valid_lines


def calculate_cost(total_input: int, total_cached: int, total_output: int) -> float:
    """Calculate estimated cost in USD."""
    non_cached_input = max(0, total_input - total_cached)
    cost = (
        (non_cached_input / 1_000_000) * PRICE_INPUT_PER_M
        + (total_cached / 1_000_000) * PRICE_CACHED_PER_M
        + (total_output / 1_000_000) * PRICE_OUTPUT_PER_M
    )
    return cost


def main() -> None:
    github_token = os.environ["GITHUB_TOKEN"]
    project_id = os.environ["GCP_PROJECT_ID"]
    region = os.environ["GCP_REGION"]
    pr_number = int(os.environ["PR_NUMBER"])
    repo_name = os.environ["REPO_NAME"]

    g = Github(auth=Auth.Token(github_token))
    repo = g.get_repo(repo_name)
    pr = repo.get_pull(pr_number)
    files = pr.get_files()

    reviewable_files = [f for f in files if f.patch and is_reviewable_file(f.filename)]

    if not reviewable_files:
        print("No reviewable files found. Skipping review.")
        return

    client = get_gemini_client(project_id, region)
    latest_commit = pr.get_commits().reversed[0]

    # Try to create context cache
    print("Fetching file contents for context cache...")
    file_parts = fetch_file_contents(repo, pr, reviewable_files)

    cache = None
    use_cache = len(file_parts) > 0
    if use_cache:
        try:
            print("Creating context cache...")
            cache = create_context_cache(client, file_parts, pr_number)
            print(f"Cache created: {cache.name}")
        except Exception as e:
            print(f"Cache creation failed (falling back to no-cache mode): {e}")
            use_cache = False

    # Review each file
    total_comments = 0
    total_input = 0
    total_output = 0
    total_cached = 0

    try:
        for f in reviewable_files:
            if not f.patch:
                continue

            print(f"Reviewing: {f.filename}")

            if use_cache:
                comments, usage = review_file_with_cache(client, cache.name, f.filename, f.patch)
            else:
                comments, usage = review_file_no_cache(client, f.filename, f.patch)

            total_input += usage["input_tokens"]
            total_output += usage["output_tokens"]
            total_cached += usage["cached_tokens"]

            if not comments:
                print("  No issues found.")
                continue

            valid_lines = parse_patch_lines(f.patch)

            for item in comments:
                line = item.get("line")
                severity = item.get("severity", "NITS")
                comment_text = item.get("comment", "")

                if not line or not comment_text:
                    continue

                if line not in valid_lines:
                    print(f"  Skipping comment on line {line} (not in diff range).")
                    continue

                emoji = SEVERITY_EMOJI.get(severity, "🔵")
                body = f"**[{emoji} {severity}]** {comment_text}"

                try:
                    pr.create_review_comment(
                        body=body,
                        commit=latest_commit,
                        path=f.filename,
                        line=line,
                    )
                    total_comments += 1
                    print(f"  Posted comment on {f.filename}:{line}")
                except Exception as e:
                    print(f"  Failed to post comment on {f.filename}:{line}: {e}")
    finally:
        # Clean up cache
        if cache:
            try:
                client.caches.delete(name=cache.name)
                print("Cache deleted.")
            except Exception as e:
                print(f"Failed to delete cache: {e}")

    # Post summary comment
    cost = calculate_cost(total_input, total_cached, total_output)

    summary_lines = ["## 🤖 Gemini Code Review\n"]
    if total_comments == 0:
        summary_lines.append("LGTM 👍 指摘事項はありませんでした。\n")
    else:
        summary_lines.append(f"{total_comments} 件の指摘をインラインコメントとして投稿しました。\n")

    summary_lines.append(
        f"📊 **API Usage**: Input {total_input:,} tokens"
        f" / Cached {total_cached:,} tokens"
        f" / Output {total_output:,} tokens"
    )
    summary_lines.append(f"💰 **Estimated cost**: ${cost:.4f}")

    pr.create_issue_comment("\n".join(summary_lines))
    print(f"Review completed. {total_comments} comments posted. Cost: ${cost:.4f}")


if __name__ == "__main__":
    main()
