import * as SecureStore from 'expo-secure-store';
import { TokenResponse } from '@/api/authApi';

const TOKEN_KEY = 'tenichi_auth_tokens';

export const authStorage = {
  async saveTokens(tokens: TokenResponse): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  },

  async getTokens(): Promise<TokenResponse | null> {
    try {
      const tokensStr = await SecureStore.getItemAsync(TOKEN_KEY);
      if (tokensStr) {
        return JSON.parse(tokensStr) as TokenResponse;
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
    return tokens?.access_token || null;
  },
};
