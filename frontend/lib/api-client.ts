export const BASE_URL = 'https://fastapi-backend-825512055944.asia-northeast1.run.app/api/v1';

// TODO: ログイン機能実装後はlocalStorageから取得する
// 現在はテスト用トークンを使用
// 注意: Cloud RunのCORSが本番では無効のため、ブラウザからのloginリクエストは通らない
// そのためJSON APIでログインしてトークンをキャッシュする方式を取る
let cachedToken: string | null = null;

export function setToken(token: string) {
  cachedToken = token;
}

export function clearToken() {
  cachedToken = null;
}

async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test-claude-api@example.com',
      password: 'TestPass123',
    }),
  });

  if (!res.ok) {
    throw new Error(`Login failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  return cachedToken!;
}

async function fetchWithAuth(url: string, init: RequestInit): Promise<Response> {
  const token = await getToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    // トークン期限切れ → 再取得してリトライ
    cachedToken = null;
    const newToken = await getToken();
    return fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${newToken}` },
    });
  }

  return res;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetchWithAuth(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: {},
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}
