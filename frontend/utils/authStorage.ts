import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { TokenResponse } from '@/api/authApi';

const TOKEN_KEY = 'tenichi_auth_tokens';

export const authStorage = {
  async saveTokens(tokens: TokenResponse): Promise<void> {
    try {
      const tokensWithMeta = {
        ...tokens,
        saved_at: Date.now(),
      };
      const value = JSON.stringify(tokensWithMeta);

      if (Platform.OS === 'web') {
        localStorage.setItem(TOKEN_KEY, value);
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, value);
      }
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw error;
    }
  },

  async getTokens(): Promise<(TokenResponse & { saved_at?: number }) | null> {
    try {
      let tokensStr: string | null = null;
      if (Platform.OS === 'web') {
        tokensStr = localStorage.getItem(TOKEN_KEY);
      } else {
        tokensStr = await SecureStore.getItemAsync(TOKEN_KEY);
      }

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
      if (Platform.OS === 'web') {
        localStorage.removeItem(TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },

  async getAccessToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.access_token ?? null;
  },
};
