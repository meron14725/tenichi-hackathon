import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors as C } from '@/constants/app-colors';
import { formatTime } from '@/utils/date-utils';
import { WeatherForecastDay } from '@/api/weatherApi';
import { ScheduleResponse, ScheduleRouteFullResponse } from '@/api/scheduleApi';

interface WeatherTrainBarProps {
  weatherMap: Record<string, WeatherForecastDay>;
  schedules: ScheduleResponse[];
  routes: Record<number, ScheduleRouteFullResponse>;
}

export default function WeatherTrainBar({ weatherMap, schedules, routes }: WeatherTrainBarProps) {
  const weatherArray = Object.values(weatherMap);
  let maxTemp = -Infinity;
  let minTemp = Infinity;
  let maxChanceOfRain = 0;

  if (weatherArray.length > 0) {
    weatherArray.forEach(w => {
      if (w.max_temp_c > maxTemp) maxTemp = w.max_temp_c;
      if (w.min_temp_c < minTemp) minTemp = w.min_temp_c;
      if (w.chance_of_rain > maxChanceOfRain) maxChanceOfRain = w.chance_of_rain;
    });
  }

  let weatherIcon: any = 'sunny';
  if (maxChanceOfRain >= 40) weatherIcon = 'rainy';
  else if (maxChanceOfRain >= 20) weatherIcon = 'cloudy';

  const now = new Date();
  let nextAction = {
    time: '--:--',
    label: '予定なし',
    icon: 'stopwatch-outline' as any,
    type: 'none',
  };

  const allEvents: { time: string; label: string; type: 'move' | 'event'; mode?: string }[] = [];
  schedules.forEach(s => {
    const route = routes[s.id];
    if (route && route.route_data) {
      route.route_data.legs.forEach(leg => {
        allEvents.push({
          time: leg.departure_time,
          label: `${leg.to_name}へ`,
          type: 'move',
          mode: leg.mode.toUpperCase(),
        });
      });
    }
    allEvents.push({ time: s.start_at, label: s.title, type: 'event' });
  });

  const sortedEvents = allEvents.sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
  const next = sortedEvents.find(e => new Date(e.time) > now);

  if (next) {
    let iconName: any = 'calendar-outline';
    if (next.type === 'move') {
      const m = next.mode;
      iconName =
        m === 'WALK'
          ? 'walk'
          : m === 'RAIL' || m === 'SUBWAY' || m === 'TRANSIT'
            ? 'train-outline'
            : m === 'BUS'
              ? 'bus-outline'
              : m === 'BICYCLE'
                ? 'bicycle-outline'
                : m === 'CAR'
                  ? 'car-outline'
                  : 'train-outline';
    }
    nextAction = {
      time: formatTime(next.time),
      label: next.label,
      icon: iconName,
      type: next.type,
    };
  }

  return (
    <View style={styles.weatherTrainRow}>
      <View style={styles.weatherCard}>
        <Ionicons name={weatherIcon} size={26} color={C.textSecondary} />
        <Text style={styles.weatherTemp}>
          {weatherArray.length > 0 ? `${Math.round(maxTemp)}°/ ${Math.round(minTemp)}°` : '--°'}
        </Text>
        <Text style={styles.weatherNote}>
          {weatherArray.length > 0 ? `雨 ${maxChanceOfRain}%` : '更新中'}
        </Text>
      </View>
      <View style={styles.trainCard}>
        <Ionicons name={nextAction.icon} size={28} color={C.textPrimary} />
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.trainTime}>
            {nextAction.time} {nextAction.type === 'move' ? '発' : '予定'}
          </Text>
          {nextAction.type !== 'none' && (
            <Text style={styles.trainDest} numberOfLines={1}>
              {nextAction.label}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weatherTrainRow: { flexDirection: 'row', gap: 17.5 },
  weatherCard: {
    flex: 1,
    backgroundColor: C.weatherBg,
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 12.25,
    alignItems: 'center',
    gap: 7,
  },
  weatherTemp: { fontSize: 15.75, fontWeight: '700', color: C.textPrimary },
  weatherNote: { fontSize: 12.25, color: C.textSecondary },
  trainCard: {
    flex: 1,
    backgroundColor: C.trainBg,
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  trainTime: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  trainDest: { fontSize: 11, fontWeight: '500', color: C.textSecondary, marginTop: -2 },
});
