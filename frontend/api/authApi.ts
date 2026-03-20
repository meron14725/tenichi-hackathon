import { api } from '@/utils/apiClient';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  home_address: string;
  home_lat: number;
  home_lon: number;
  preparation_minutes: number;
  reminder_minutes_before: number;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface RegisterResponse {
  user: UserResponse;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    return await api.post<TokenResponse>('auth/login', data);
  },

  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    return await api.post<RegisterResponse>('auth/register', data);
  },
};
