import { api } from '@/utils/apiClient';

export interface UserSettingsResponse {
  home_address: string;
  home_lat: number | null;
  home_lon: number | null;
  preparation_minutes: number;
  reminder_minutes_before: number;
  timezone: string;
}

export const userApi = {
  getSettings: async (): Promise<UserSettingsResponse> => {
    return await api.get<UserSettingsResponse>('users/me/settings');
  },
};
