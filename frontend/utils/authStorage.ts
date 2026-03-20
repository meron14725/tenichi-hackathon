import * as SecureStore from 'expo-secure-store';
import { TokenResponse } from '@/api/authApi';

const TOKEN_KEY = 'tenichi_auth_tokens';

export const authStorage = {
  async saveTokens(tokens: TokenResponse): Promise<void> {
    try {
      // saved_at を追加して、後で有効期限を判定できるようにする
      const tokensWithMeta = {
        ...tokens,
        saved_at: Date.now(),
      };
      await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokensWithMeta));
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw error; // 呼び出し元にエラーを伝播する
    }
  },

  async getTokens(): Promise<(TokenResponse & { saved_at?: number }) | null> {
    try {
      const tokensStr = await SecureStore.getItemAsync(TOKEN_KEY);
      if (tokensStr) {
        return JSON.parse(tokensStr) as TokenResponse & { saved_at?: number };
      }
    } catch (error) {
      console.error('Error getting tokens:', error);
    }
    return null;
  },

  async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },

  async getAccessToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.access_token ?? null;
  },
};
