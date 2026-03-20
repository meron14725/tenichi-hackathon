import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { authStorage } from '@/utils/authStorage';
import { TokenResponse } from '@/api/authApi';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: TokenResponse) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  useEffect(() => {
    // アプリ起動時に保存されているトークンを確認
    const checkTokens = async () => {
      try {
        const tokens = await authStorage.getTokens();
        if (tokens?.access_token) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Failed to restore tokens:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkTokens();
  }, []);

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
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await authStorage.clearTokens();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
