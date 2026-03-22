import { api } from '@/utils/apiClient';

export interface WeatherSummaryResponse {
  temp_c: number;
  condition: string;
  chance_of_rain: number;
}

export interface TodaySuggestionResponse {
  date: string;
  suggestion: string;
  weather_summary: WeatherSummaryResponse;
}

export interface ScheduleSuggestionResponse {
  schedule_id: number;
  suggestion: string;
}

export const suggestionApi = {
  getToday: async (): Promise<TodaySuggestionResponse> => {
    return await api.get<TodaySuggestionResponse>('suggestions/today');
  },
  getByScheduleId: async (scheduleId: number): Promise<ScheduleSuggestionResponse> => {
    return await api.get<ScheduleSuggestionResponse>(`suggestions/${scheduleId}`);
  },
};
