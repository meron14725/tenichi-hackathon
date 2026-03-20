import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { authStorage } from '@/utils/authStorage';
import { TokenResponse } from '@/api/authApi';
import { api } from '@/utils/apiClient';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: TokenResponse) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** トークン期限切れ前にリフレッシュするバッファ（秒） */
const REFRESH_BUFFER_SEC = 60;

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const segments = useSegments();
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * トークンが有効期限内かどうかを判定する
   */
  const isTokenExpired = useCallback((tokens: TokenResponse & { saved_at?: number }): boolean => {
    if (!tokens.saved_at || !tokens.expires_in) {
      // saved_at が無い（旧データ）場合は期限切れとして扱う
      return true;
    }
    const expiresAt = tokens.saved_at + tokens.expires_in * 1000;
    return Date.now() >= expiresAt;
  }, []);

  /**
   * refresh_token を使ってアクセストークンを自動更新する
   */
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    try {
      const tokens = await authStorage.getTokens();
      if (!tokens?.refresh_token) return false;

      const newTokens = await api.post<TokenResponse>('auth/refresh', {
        refresh_token: tokens.refresh_token,
      });

      await authStorage.saveTokens(newTokens);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, []);

  /**
   * 有効期限の少し前にリフレッシュを実行するタイマーを設定
   */
  const scheduleTokenRefresh = useCallback(
    (tokens: TokenResponse & { saved_at?: number }) => {
      // 既存のタイマーをクリア
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }

      if (!tokens.saved_at || !tokens.expires_in) return;

      const expiresAt = tokens.saved_at + tokens.expires_in * 1000;
      const refreshAt = expiresAt - REFRESH_BUFFER_SEC * 1000;
      const delay = refreshAt - Date.now();

      if (delay <= 0) {
        // 既にリフレッシュすべきタイミングを過ぎている
        refreshAccessToken().then(success => {
          if (!success) {
            setIsAuthenticated(false);
            authStorage.clearTokens();
          }
        });
        return;
      }

      refreshTimer.current = setTimeout(async () => {
        const success = await refreshAccessToken();
        if (success) {
          // リフレッシュ成功後、新しいトークンで次回のタイマーを再設定
          const updatedTokens = await authStorage.getTokens();
          if (updatedTokens) {
            scheduleTokenRefresh(updatedTokens as TokenResponse & { saved_at?: number });
          }
        } else {
          setIsAuthenticated(false);
          await authStorage.clearTokens();
        }
      }, delay);
    },
    [refreshAccessToken]
  );

  useEffect(() => {
    // アプリ起動時に保存されているトークンを確認
    const checkTokens = async () => {
      try {
        const tokens = await authStorage.getTokens();
        if (!tokens?.access_token) {
          setIsAuthenticated(false);
          return;
        }

        const tokensWithMeta = tokens as TokenResponse & { saved_at?: number };

        if (isTokenExpired(tokensWithMeta)) {
          // 期限切れ → リフレッシュを試みる
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            setIsAuthenticated(true);
            const updatedTokens = await authStorage.getTokens();
            if (updatedTokens) {
              scheduleTokenRefresh(updatedTokens as TokenResponse & { saved_at?: number });
            }
          } else {
            await authStorage.clearTokens();
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(true);
          scheduleTokenRefresh(tokensWithMeta);
        }
      } catch (error) {
        console.error('Failed to restore tokens:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkTokens();

    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
    };
  }, [isTokenExpired, refreshAccessToken, scheduleTokenRefresh]);

  useEffect(() => {
    // ローディング中はリダイレクト処理を行わない
    if (isLoading) return;

    // 現在の画面のグループを判定
    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      // 認証されておらず、ログイン/サインアップ画面以外の場所にいる場合はログイン画面へリダイレクト
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      // 認証済みで、ログイン/サインアップ画面にいる場合はホーム(tabs)へリダイレクト
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  const login = async (tokens: TokenResponse) => {
    await authStorage.saveTokens(tokens);
    const savedTokens = await authStorage.getTokens();
    if (savedTokens) {
      scheduleTokenRefresh(savedTokens as TokenResponse & { saved_at?: number });
    }
    setIsAuthenticated(true);
  };

  const logout = async () => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    await authStorage.clearTokens();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
