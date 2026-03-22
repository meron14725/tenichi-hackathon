import { WeatherForecastDay } from '@/api/weatherApi';

export interface TimelineItem {
  time: string;
  title: string;
  subtitle?: string;
  lineName?: string;
  lineColor?: string;
  walk?: string;
  iconBg?: string;
  past: boolean;
  hasChevron?: boolean;
  iconName?: string;
  scheduleId?: number;
  weather?: WeatherForecastDay;
}
