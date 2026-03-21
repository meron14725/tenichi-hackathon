import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { TokenResponse } from '@/api/authApi';

const TOKEN_KEY = 'tenichi_auth_tokens';

/**
 * [Security Consideration for Web]
 * To prevent XSS attacks from stealing tokens, we use memory-based storage for the Web.
 * Note: Tokens will be lost upon a full page reload on the Web.
 * For Native, we continue using the secure hardware storage (SecureStore).
 */
let memoryTokens: (TokenResponse & { saved_at?: number }) | null = null;

export const authStorage = {
  async saveTokens(tokens: TokenResponse): Promise<void> {
    try {
      const tokensWithMeta = {
        ...tokens,
        saved_at: Date.now(),
      };

      if (Platform.OS === 'web') {
        memoryTokens = tokensWithMeta;
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokensWithMeta));
      }
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw error;
    }
  },

  async getTokens(): Promise<(TokenResponse & { saved_at?: number }) | null> {
    try {
      if (Platform.OS === 'web') {
        return memoryTokens;
      } else {
        const tokensStr = await SecureStore.getItemAsync(TOKEN_KEY);
        if (tokensStr) {
          return JSON.parse(tokensStr) as TokenResponse & { saved_at?: number };
        }
      }
    } catch (error) {
      console.error('Error getting tokens:', error);
    }
    return null;
  },

  async clearTokens(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        memoryTokens = null;
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
