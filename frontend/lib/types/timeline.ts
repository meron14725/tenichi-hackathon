import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  iconName?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconSource?: any;
  scheduleId?: number;
  weather?: WeatherForecastDay;
}
