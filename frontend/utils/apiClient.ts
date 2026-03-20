import { authStorage } from './authStorage';

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * ヘッダーの生成
   * ここで必要に応じて認証トークンなどを付与します
   */
  private async getHeaders(initHeaders?: HeadersInit): Promise<Headers> {
    const headers = new Headers(initHeaders);

    // Content-Typeが設定されていない場合のみデフォルトを指定
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const token = await authStorage.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * fetchのラッパーメソッド
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.getHeaders(options.headers);

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        // サーバー側がエラーを返した場合のハンドリング
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.detail ||
          errorData?.message ||
          `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      // レスポンスが空の場合の対応（例: 204 No Content）
      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error(`[APIClient Error] ${options.method || 'GET'} ${url}:`, error);
      throw error;
    }
  }

  // ==== HTTPメソッドヘルパー ====

  public get<T>(endpoint: string, options?: Omit<RequestInit, 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any, options?: Omit<RequestInit, 'method' | 'body'>) {
    const isFormData = body instanceof FormData;

    // FormDataの場合はContent-Typeを自動設定させるために削除し、bodyはそのまま渡す
    const customOptions = { ...options };
    if (isFormData && customOptions.headers) {
      const headers = new Headers(customOptions.headers);
      headers.delete('Content-Type');
      customOptions.headers = headers;
    }

    return this.request<T>(endpoint, {
      ...customOptions,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  public put<T>(endpoint: string, body?: any, options?: Omit<RequestInit, 'method' | 'body'>) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  public delete<T>(endpoint: string, options?: Omit<RequestInit, 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// ===== シングルトンインスタンスの作成 =====
// 環境変数からAPIのベースURLを取得します。未設定の場合はデフォルト値を設定します。
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const api = new ApiClient(BASE_URL);

// --- 使い方（例） ---
// import { api } from '@/utils/apiClient';
//
// // データ取得
// const users = await api.get('/api/v1/users');
//
// // データ作成
// const newUser = await api.post('/api/v1/users', { name: "taro" });
