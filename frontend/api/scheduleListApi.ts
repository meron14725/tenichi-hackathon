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

export interface ScheduleListResponse {
  id: number;
  name: string;
  date: string;
  category_id: number | null;
  memo: string | null;
  departure_name: string | null;
  departure_lat: number | null;
  departure_lng: number | null;
  // 他のフィールドが返る場合もあるが、作成後のレスポンスに最低限必要なもの
}

export const scheduleListApi = {
  create: async (data: ScheduleListCreateRequest): Promise<ScheduleListResponse> => {
    return await api.post<ScheduleListResponse>('schedule-lists', data);
  },
};
