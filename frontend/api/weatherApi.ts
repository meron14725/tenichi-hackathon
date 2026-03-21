import { api } from '@/utils/apiClient';

export interface WeatherLocation {
  name: string;
  lat: number;
  lon: number;
}

export interface WeatherForecastDay {
  date: string;
  avg_temp_c: number;
  max_temp_c: number;
  min_temp_c: number;
  condition: string;
  condition_icon_url: string;
  chance_of_rain: number;
}

export interface WeatherForecastResponse {
  location: WeatherLocation;
  forecast: WeatherForecastDay[];
}

export const weatherApi = {
  getForecast: async (lat: number, lon: number): Promise<WeatherForecastResponse> => {
    return await api.get<WeatherForecastResponse>(`weather/forecast?lat=${lat}&lon=${lon}`);
  },
};
