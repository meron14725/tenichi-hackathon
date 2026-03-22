import { TimelineItem } from '@/lib/types/timeline';
import { ScheduleResponse, ScheduleRouteFullResponse } from '@/api/scheduleApi';
import { UserSettingsResponse } from '@/api/userApi';
import { WeatherForecastDay } from '@/api/weatherApi';
import { ScheduleListResponse } from '@/api/scheduleListApi';
import { formatTime } from '@/utils/date-utils';
import { AppColors as C } from '@/constants/app-colors';

export function buildTimelineItems(
  schedules: ScheduleResponse[],
  routes: Record<number, ScheduleRouteFullResponse>,
  userSettings: UserSettingsResponse | null,
  weatherMap: Record<string, WeatherForecastDay>,
  scheduleList: ScheduleListResponse | null
): TimelineItem[] {
  const timelineItems: TimelineItem[] = [];
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = scheduleList ? scheduleList.date === todayStr : false;
  const isFutureDay = scheduleList ? scheduleList.date > todayStr : false;
  const isPastDay = scheduleList ? scheduleList.date < todayStr : false;

  const isPast = (timeStr: string) => {
    if (isFutureDay) return false;
    if (isPastDay) return true;
    if (!isToday) return false; // Default should not happen but be safe
    return new Date(timeStr) < now;
  };

  const appendStation = (name: string) => {
    if (!name) return '';
    if (name.includes('駅') || name.includes('ターミナル')) return name;
    return `${name}駅`;
  };

  // Preparation / Wake up
  if (userSettings && schedules.length > 0) {
    const firstSchedule = schedules[0];
    const firstFullRoute = routes[firstSchedule.id];
    const firstDepTime = firstFullRoute?.route_data?.legs?.[0]?.departure_time;

    if (firstDepTime) {
      const wakeTime = new Date(
        new Date(firstDepTime).getTime() - userSettings.preparation_minutes * 60 * 1000
      );
      timelineItems.push({
        time: formatTime(wakeTime.toISOString()),
        title: '起床',
        iconName: 'weather-sunny',
        past: isPast(wakeTime.toISOString()),
      });
      timelineItems.push({
        time: '',
        title: '朝の準備',
        walk: `${userSettings.preparation_minutes}分`,
        iconName: 'moped',
        past: isPast(wakeTime.toISOString()),
      });
    }
  }

  // Schedules and Routes
  schedules.forEach((s, idx) => {
    const fullRoute = routes[s.id];
    if (
      fullRoute &&
      fullRoute.route_data &&
      fullRoute.route_data.legs &&
      fullRoute.route_data.legs.length > 0
    ) {
      fullRoute.route_data.legs.forEach((leg, legIdx) => {
        let fromName = leg.from_name;
        if (legIdx === 0) {
          if (idx === 0) {
            if (scheduleList?.departure_name) fromName = scheduleList.departure_name;
          } else {
            const prevSchedule = schedules[idx - 1];
            if (prevSchedule.destination_name) fromName = prevSchedule.destination_name;
          }
        }

        const mode = leg.mode.toUpperCase();
        const isTransit =
          mode === 'RAIL' || mode === 'BUS' || mode === 'TRANSIT' || mode === 'SUBWAY';
        if (isTransit) fromName = appendStation(fromName);

        const modeIcon =
          mode === 'WALK'
            ? 'walk'
            : mode === 'RAIL' || mode === 'SUBWAY' || mode === 'TRANSIT'
              ? 'train'
              : mode === 'BUS'
                ? 'bus'
                : mode === 'BICYCLE'
                  ? 'bike'
                  : mode === 'CAR'
                    ? 'car'
                    : 'walk';

        let startLat = null;
        let startLon = null;
        if (legIdx === 0) {
          if (idx === 0) {
            startLat = scheduleList?.departure_lat;
            startLon = scheduleList?.departure_lng;
          } else {
            startLat = schedules[idx - 1].destination_lat;
            startLon = schedules[idx - 1].destination_lon;
          }
        }
        const originKey = startLat != null && startLon != null ? `${startLat},${startLon}` : null;

        timelineItems.push({
          time: formatTime(leg.departure_time),
          title: `${fromName}発`,
          lineName: isTransit
            ? leg.route_long_name || leg.route_short_name || leg.agency_name
            : undefined,
          lineColor: leg.route_color || '#6E8F8A',
          walk: mode === 'WALK' ? `${leg.duration_minutes}分` : undefined,
          past: isPast(leg.departure_time),
          iconName: modeIcon,
          weather: originKey ? weatherMap[originKey] : undefined,
        });

        if (legIdx === fullRoute.route_data.legs.length - 1) {
          timelineItems.push({
            time: formatTime(leg.arrival_time),
            title: s.title,
            subtitle: s.destination_name || s.memo || undefined,
            past: isPast(leg.arrival_time),
            hasChevron: true,
            iconBg: C.eventGreen,
            scheduleId: s.id,
            weather:
              s.destination_lat != null && s.destination_lon != null
                ? weatherMap[`${s.destination_lat},${s.destination_lon}`]
                : undefined,
          });
        }
      });
    } else {
      timelineItems.push({
        time: formatTime(s.start_at),
        title: s.title,
        subtitle: s.destination_name || s.memo || undefined,
        past: isPast(s.start_at),
        hasChevron: true,
        iconBg: C.eventGreen,
        scheduleId: s.id,
        weather:
          s.destination_lat != null && s.destination_lon != null
            ? weatherMap[`${s.destination_lat},${s.destination_lon}`]
            : undefined,
      });
    }
  });

  return timelineItems;
}
