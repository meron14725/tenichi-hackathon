import { api } from '@/utils/apiClient';

export interface PackingItemCreate {
  name: string;
  sort_order?: number;
}

export interface ScheduleListCreateRequest {
  name: string;
  date: string; // YYYY-MM-DD
  category_id?: number | null;
  memo?: string | null;
  departure_name?: string | null;
  departure_lat?: number | null;
  departure_lng?: number | null;
  packing_items?: PackingItemCreate[];
}

export interface ScheduleListCategoryResponse {
  id: number;
  name: string;
}

export interface ScheduleSummary {
  id: number;
  title: string;
  start_at: string;
  end_at: string | null;
}

export interface PackingItemResponse {
  id: number;
  name: string;
  is_checked: boolean;
  sort_order: number;
}

export interface ScheduleListResponse {
  id: number;
  name: string;
  date: string;
  category: ScheduleListCategoryResponse | null;
  memo: string | null;
  departure_name: string | null;
  departure_lat: number | null;
  departure_lng: number | null;
  schedules: ScheduleSummary[];
  packing_items: PackingItemResponse[];
  created_at: string;
  updated_at: string;
}

export const scheduleListApi = {
  create: async (data: ScheduleListCreateRequest): Promise<ScheduleListResponse> => {
    return await api.post<ScheduleListResponse>('schedule-lists', data);
  },
  getById: async (id: number): Promise<ScheduleListResponse> => {
    return await api.get<ScheduleListResponse>(`schedule-lists/${id}`);
  },
};
