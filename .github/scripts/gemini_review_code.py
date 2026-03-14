"""Gemini-powered automated code review for Pull Requests."""

import os
import sys

from github import Github
from google import genai


def get_pr_diff(repo_name: str, pr_number: int, github_token: str) -> tuple[str, object]:
    """Fetch the PR diff using PyGithub."""
    g = Github(github_token)
    repo = g.get_repo(repo_name)
    pr = repo.get_pull(pr_number)

    files = pr.get_files()
    diff_text = ""
    for f in files:
        diff_text += f"--- {f.filename} ---\n"
        if f.patch:
            diff_text += f.patch + "\n\n"

    return diff_text, pr


def build_review_prompt(diff: str) -> str:
    """Build the structured prompt for Gemini."""
    return f"""あなたは経験豊富なソフトウェアエンジニアです。
以下のPull Requestの差分をレビューしてください。

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
- 問題がある場合は具体的なファイル名と行番号を示してください
- 各指摘に重要度を付けてください: 🔴 Critical / 🟡 Warning / 🔵 Info
- 良い点があればそれも言及してください
- 最後に全体の所感を簡潔にまとめてください
- 問題がなければ「LGTMです」と伝えてください

## Pull Request 差分
```diff
{diff}
```
"""


def call_gemini(prompt: str, project_id: str, region: str) -> str:
    """Send the prompt to Gemini via Vertex AI."""
    client = genai.Client(
        vertexai=True,
        project=project_id,
        location=region,
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    return response.text


def post_review_comment(pr, review_body: str) -> None:
    """Post the review as a PR comment."""
    comment = f"## 🤖 Gemini Code Review\n\n{review_body}"
    pr.create_issue_comment(comment)


def main() -> None:
    github_token = os.environ["GITHUB_TOKEN"]
    project_id = os.environ["GCP_PROJECT_ID"]
    region = os.environ["GCP_REGION"]
    pr_number = int(os.environ["PR_NUMBER"])
    repo_name = os.environ["REPO_NAME"]

    diff, pr = get_pr_diff(repo_name, pr_number, github_token)

    if not diff.strip():
        print("No diff found. Skipping review.")
        return

    # Truncate diff if too large (Gemini context limit)
    max_chars = 100_000
    if len(diff) > max_chars:
        diff = diff[:max_chars] + "\n\n... (diff truncated due to size)"

    prompt = build_review_prompt(diff)
    review = call_gemini(prompt, project_id, region)

    post_review_comment(pr, review)
    print("Review posted successfully.")


if __name__ == "__main__":
    main()
