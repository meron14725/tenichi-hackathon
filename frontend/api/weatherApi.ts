import { api } from '@/utils/apiClient';

// バックエンドのレスポンスの型をここに定義します（例）
export interface WeatherResponse {
  temperature_high: number;
  temperature_low: number;
  condition: string;
}

export const weatherApi = {
  /**
   * 天気情報を取得するAPIの呼び出し例
   */
  getTodayWeather: async (): Promise<WeatherResponse> => {
    // GETリクエストを送信
    // 実際のバックエンドのエンドポイントに合わせて修正してください
    return await api.get<WeatherResponse>('weather');
  },
};
