import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import OwlChatBubble from '@/components/owl-chat-bubble';
import TodoCard from '@/components/todo-card';
import ScheduleMapModal, { MapPin } from '@/components/schedule-map-modal';
import { scheduleListApi, ScheduleListResponse } from '@/api/scheduleListApi';
import { scheduleApi, ScheduleResponse, ScheduleRouteFullResponse } from '@/api/scheduleApi';
import { userApi, UserSettingsResponse } from '@/api/userApi';
import { suggestionApi, TodaySuggestionResponse } from '@/api/suggestionApi';
import { weatherApi, WeatherForecastDay } from '@/api/weatherApi';

const owlAvatar = require('@/assets/images/owl-avatar.png');

// Colors
const C = {
  headerBg: '#436F9B',
  routineBorder: '#6E8F8A',
  weatherBg: '#EDF0F2',
  trainBg: '#EEF0F1',
  eventGreen: '#EEF3F2',
  eventWarm: '#F3EFE6',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  textMuted: '#B5BFC5',
  black: '#000000',
  white: '#FFFFFF',
  fabBg: '#436F9B',
  warmText: '#AA8A5E',
  adviceBorder: '#A8C0DD',
};

// Mock data
interface TimelineItem {
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [scheduleList, setScheduleList] = useState<ScheduleListResponse | null>(null);
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [routes, setRoutes] = useState<Record<number, ScheduleRouteFullResponse>>({});
  const [userSettings, setUserSettings] = useState<UserSettingsResponse | null>(null);
  const [suggestionData, setSuggestionData] = useState<TodaySuggestionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mapVisible, setMapVisible] = useState(false);
  const [weatherMap, setWeatherMap] = useState<Record<string, WeatherForecastDay>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        // 設定とスケジュールリストを並列取得
        const [todayData, settings, listResults] = await Promise.all([
          suggestionApi.getToday(),
          userApi.getSettings(),
          scheduleListApi.list({
            start_date: dateStr,
            end_date: dateStr,
          }),
        ]);

        setSuggestionData(todayData);
        setUserSettings(settings);

        if (listResults && listResults.length > 0) {
          const list = listResults[0];
          setScheduleList(list);

          // 各スケジュールの詳細を取得
          if (list.schedules.length > 0) {
            const details = await Promise.all(list.schedules.map(s => scheduleApi.getById(s.id)));
            // start_at 順にソート
            details.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
            setSchedules(details);

            // ルートの詳細を取得
            const routePromises = details
              .filter(s => s.selected_route)
              .map(s => scheduleApi.getRoute(s.id));
            const routeResults = await Promise.all(routePromises);
            const routeMap: Record<number, ScheduleRouteFullResponse> = {};
            routeResults.forEach(r => {
              routeMap[r.schedule_id] = r;
            });
            setRoutes(routeMap);

            // 天気情報の取得
            const weatherLocations: { lat: number; lon: number }[] = [];
            // 出発地点 (自宅)
            if (settings.home_lat != null && settings.home_lon != null) {
              weatherLocations.push({ lat: settings.home_lat, lon: settings.home_lon });
            }
            // 各目的地の地点
            details.forEach(s => {
              if (s.destination_lat != null && s.destination_lon != null) {
                weatherLocations.push({ lat: s.destination_lat, lon: s.destination_lon });
              }
            });

            // 重複排除 (簡易的にキー文字列化してSet)
            const uniqueLocs = Array.from(
              new Set(weatherLocations.map(l => `${l.lat},${l.lon}`))
            ).map(s => {
              const [lat, lon] = s.split(',').map(Number);
              return { lat, lon };
            });

            const weatherResults = await Promise.all(
              uniqueLocs.map(l => weatherApi.getForecast(l.lat, l.lon).catch(() => null))
            );

            const newWeatherMap: Record<string, WeatherForecastDay> = {};
            weatherResults.forEach((res, i) => {
              if (res && res.forecast.length > 0) {
                const loc = uniqueLocs[i];
                newWeatherMap[`${loc.lat},${loc.lon}`] = res.forecast[0];
              }
            });
            setWeatherMap(newWeatherMap);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  async function handleToggleTodo(itemId: number) {
    if (!scheduleList) return;
    const item = scheduleList.packing_items.find(i => i.id === itemId);
    if (!item) return;

    try {
      const updated = await scheduleListApi.updatePackingItem(scheduleList.id, itemId, {
        is_checked: !item.is_checked,
      });

      // Stateの更新
      setScheduleList(prev => {
        if (!prev) return null;
        return {
          ...prev,
          packing_items: prev.packing_items.map(i => (i.id === itemId ? updated : i)),
        };
      });
    } catch (error) {
      console.error('Failed to toggle packing item:', error);
    }
  }

  function renderHeader() {
    return (
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTopRow}>
          <View />
          <TouchableOpacity style={styles.menuButton}>
            <Feather name="more-horizontal" size={20} color={C.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.owlLayer}>
          <OwlChatBubble
            message={
              suggestionData?.suggestion || '今日も一日頑張りましょう！\n準備は大丈夫ですか？'
            }
          />
        </View>
      </View>
    );
  }

  function renderWeatherTrainRow() {
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
    if (maxChanceOfRain >= 40) {
      weatherIcon = 'rainy';
    } else if (maxChanceOfRain >= 20) {
      weatherIcon = 'cloudy';
    }

    // 次の行動を特定
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
        {/* Weather card */}
        <View style={styles.weatherCard}>
          <Ionicons name={weatherIcon} size={26} color={C.textSecondary} />
          <Text style={styles.weatherTemp}>
            {weatherArray.length > 0 ? `${Math.round(maxTemp)}°/ ${Math.round(minTemp)}°` : '--°'}
          </Text>
          <Text style={styles.weatherNote}>
            {weatherArray.length > 0 ? `雨 ${maxChanceOfRain}%` : '更新中'}
          </Text>
        </View>
        {/* Train card */}
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

  function renderScheduleHeader() {
    const getFormattedDate = () => {
      const d = new Date();
      const days = ['日', '月', '火', '水', '木', '金', '土'];
      return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
    };

    return (
      <View style={styles.scheduleHeaderRow}>
        <View style={styles.scheduleHeaderLeft}>
          <Text style={styles.scheduleDate}>{getFormattedDate()}</Text>
          <Text style={styles.scheduleTitle}>{scheduleList?.name || '予定がありません'}</Text>
        </View>
        <TouchableOpacity style={styles.mapButton} onPress={() => setMapVisible(true)}>
          <Ionicons name="map-outline" size={14} color={C.textSecondary} />
          <Text style={styles.mapButtonText}>マップ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function formatTime(isoString: string): string {
    const d = new Date(isoString);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function renderTimelineEntry(item: TimelineItem, index: number, array: TimelineItem[]) {
    const isLast = index === array.length - 1;
    const textColor = item.past ? C.textMuted : C.black;

    return (
      <View key={`${item.time}-${item.title}-${index}`} style={styles.timelineRow}>
        {/* Time column */}
        <View style={styles.timeColumn}>
          <Text style={[styles.timeText, { color: textColor }]}>{item.time}</Text>
          {/* Dot */}
          <View
            style={[
              styles.timelineDot,
              {
                backgroundColor: item.past ? C.textMuted : C.headerBg,
              },
            ]}
          />
          {/* Vertical line */}
          {!isLast && (
            <View
              style={[
                styles.timelineLine,
                {
                  borderColor: C.textMuted,
                },
              ]}
            />
          )}
        </View>

        {/* Content column */}
        <View style={styles.timelineContent}>
          {item.hasChevron ? (
            /* Event/Schedule Card */
            <TouchableOpacity
              style={[styles.eventCard, { opacity: item.past ? 0.6 : 1 }]}
              onPress={() => {
                if (item.scheduleId) {
                  router.push({
                    pathname: '/schedule/unit/edit',
                    params: {
                      schedule_id: item.scheduleId.toString(),
                      schedule_list_id: scheduleList?.id?.toString(),
                    },
                  });
                }
              }}
            >
              <View
                style={[
                  styles.eventIcon,
                  { backgroundColor: item.past ? C.weatherBg : item.iconBg },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={item.past ? C.textMuted : C.textSecondary}
                />
              </View>
              <View style={styles.eventDetails}>
                <Text style={[styles.eventTitle, { color: textColor }]}>{item.title}</Text>
                {item.subtitle ? (
                  <Text style={[styles.eventSubtitle, { color: textColor }]}>{item.subtitle}</Text>
                ) : null}
                {item.weather && (
                  <View style={styles.eventWeatherInline}>
                    <Text style={[styles.weatherTempText, { color: textColor }]}>
                      {item.weather.max_temp_c}° / {item.weather.min_temp_c}°
                    </Text>
                    <Text style={styles.weatherDivider}> | </Text>
                    <Text
                      style={[
                        styles.weatherRainText,
                        { color: item.past ? C.textMuted : C.headerBg },
                      ]}
                    >
                      降水確率 {item.weather.chance_of_rain}%
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
            </TouchableOpacity>
          ) : (
            /* Transport/Station Row */
            <View style={[styles.stationRow, { opacity: item.past ? 0.6 : 1 }]}>
              <View style={{ flex: 1 }}>
                <View style={styles.stationTextContainer}>
                  {item.iconName && (
                    <MaterialCommunityIcons
                      name={item.iconName as any}
                      size={16}
                      color={item.past ? C.textMuted : C.textSecondary}
                      style={styles.stationIcon}
                    />
                  )}
                  <Text style={[styles.stationName, { color: textColor }]}>{item.title}</Text>
                  {item.lineName && (
                    <View
                      style={[
                        styles.lineNameBadge,
                        { backgroundColor: item.past ? C.textMuted : item.lineColor },
                      ]}
                    >
                      <Text style={styles.lineNameText}>{item.lineName}</Text>
                    </View>
                  )}
                  {item.walk && (
                    <View style={styles.walkRow}>
                      <Text style={styles.walkText}>{item.walk}</Text>
                    </View>
                  )}
                </View>
                {item.weather && (
                  <View style={styles.weatherTextRow}>
                    <Text style={styles.weatherSmallText}>
                      {item.weather.max_temp_c}° / {item.weather.min_temp_c}°
                    </Text>
                    <Text style={styles.weatherSmallText}>
                      {' '}
                      降水確率 {item.weather.chance_of_rain}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  function renderTimeline() {
    if (schedules.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>今日の予定はありません</Text>
        </View>
      );
    }

    const timelineItems: TimelineItem[] = [];
    const now = new Date();

    const appendStation = (name: string) => {
      if (!name) return '';
      if (name.includes('駅') || name.includes('ターミナル')) return name;
      return `${name}駅`;
    };

    // 起床時間の追加
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
          past: wakeTime < now,
        });
        timelineItems.push({
          time: '',
          title: '朝の準備',
          walk: `${userSettings.preparation_minutes}分`,
          iconName: 'moped',
          past: wakeTime < now,
        });
      }
    }

    schedules.forEach((s, idx) => {
      // 当該スケジュールに紐づくルート情報を展開
      const fullRoute = routes[s.id];
      if (fullRoute && fullRoute.route_data && fullRoute.route_data.legs.length > 0) {
        fullRoute.route_data.legs.forEach((leg, legIdx) => {
          let fromName = leg.from_name;

          if (legIdx === 0) {
            if (idx === 0) {
              // 一番最初のスケジュールの出発地は、リストの出発地名を優先
              if (scheduleList?.departure_name) {
                fromName = scheduleList.departure_name;
              }
            } else {
              // 二つ目以降のスケジュールの最初の行程は、一つ前の予定の目的地名を優先
              const prevSchedule = schedules[idx - 1];
              if (prevSchedule.destination_name) {
                fromName = prevSchedule.destination_name;
              }
            }
          }

          const mode = leg.mode.toUpperCase();
          const isTransit =
            mode === 'RAIL' || mode === 'BUS' || mode === 'TRANSIT' || mode === 'SUBWAY';

          if (isTransit) {
            fromName = appendStation(fromName);
          }

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
                      : 'walk'; // デフォルト

          // 出発地点
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
            lineColor: '#6E8F8A',
            walk: mode === 'WALK' ? `${leg.duration_minutes}分` : undefined,
            past: new Date(leg.departure_time) < now,
            iconName: modeIcon,
            weather: originKey ? weatherMap[originKey] : undefined,
          });

          // 行程の到着地点 = スケジュール本体 (最後のレグのみ表示)
          const isLastLeg = legIdx === fullRoute.route_data.legs.length - 1;
          if (isLastLeg) {
            timelineItems.push({
              time: formatTime(leg.arrival_time),
              title: s.title,
              subtitle: s.destination_name || s.memo || undefined,
              past: new Date(leg.arrival_time) < now,
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
        // ルートがない、または移動を含まない予定の場合
        timelineItems.push({
          time: formatTime(s.start_at),
          title: s.title,
          subtitle: s.destination_name || s.memo || undefined,
          past: new Date(s.start_at) < now,
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

    return <View style={styles.timeline}>{timelineItems.map(renderTimelineEntry)}</View>;
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingCenter]}>
        <ActivityIndicator color={C.white} size="large" />
      </View>
    );
  }

  function renderAdviceCard() {
    return (
      <TouchableOpacity style={styles.adviceCard}>
        <View style={styles.adviceContent}>
          <Image source={owlAvatar} style={styles.adviceOwl} resizeMode="contain" />
          <View style={styles.adviceTextWrapper}>
            <Text style={styles.adviceTitle}>明日の予定を確認！</Text>
            <Text style={styles.adviceSubtitle}>明日に備えて、今日の夜はぐっすり寝よう！</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={21} color={C.white} />
      </TouchableOpacity>
    );
  }

  function getMapPins(): MapPin[] {
    const pins: MapPin[] = [];

    // 出発地点
    if (scheduleList?.departure_lat != null && scheduleList?.departure_lng != null) {
      pins.push({
        lat: scheduleList.departure_lat,
        lng: scheduleList.departure_lng,
        label: scheduleList.departure_name || '出発地点',
        color: '#E74C3C',
      });
    }

    // 各スケジュールの到着地点
    schedules.forEach(s => {
      if (s.destination_lat != null && s.destination_lon != null) {
        pins.push({
          lat: s.destination_lat,
          lng: s.destination_lon,
          label: s.destination_name || s.title,
          color: '#436F9B',
        });
      }
    });

    return pins;
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <TodoCard
            todos={(scheduleList?.packing_items || []).map(item => ({
              id: item.id,
              label: item.name,
              checked: item.is_checked,
            }))}
            onToggle={handleToggleTodo}
          />
          {renderWeatherTrainRow()}
          {renderScheduleHeader()}
          {renderTimeline()}
          {renderAdviceCard()}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 100 + insets.bottom }]}
        onPress={() => {
          if (scheduleList) {
            router.push({
              pathname: '/schedule/unit/register',
              params: { schedule_list_id: String(scheduleList.id) },
            });
          } else {
            router.push('/schedule/list/register');
          }
        }}
      >
        <Ionicons name="add" size={28} color={C.white} />
      </TouchableOpacity>

      {/* Map Modal */}
      <ScheduleMapModal
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
        pins={getMapPins()}
        title={scheduleList?.name || '今日のルート'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.headerBg,
  },
  loadingCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: C.textSecondary,
    fontSize: 14,
  },
  // Header
  header: {
    backgroundColor: C.headerBg,
    paddingHorizontal: 14,
    gap: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  menuButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  owlLayer: {
    marginTop: -10,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // paddingBottom: 100,
  },

  mainContent: {
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingTop: 17.5,
    paddingBottom: 17.5,
    gap: 17.5,
    minHeight: 800,
  },

  // Weather + Train
  weatherTrainRow: {
    flexDirection: 'row',
    gap: 17.5,
  },
  weatherCard: {
    flex: 1,
    backgroundColor: C.weatherBg,
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 12.25,
    alignItems: 'center',
    gap: 7,
  },
  weatherTemp: {
    fontSize: 15.75,
    fontWeight: '700',
    color: C.textPrimary,
  },
  weatherNote: {
    fontSize: 12.25,
    color: C.textSecondary,
  },
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
  trainTime: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
  },
  trainDest: {
    fontSize: 11,
    fontWeight: '500',
    color: C.textSecondary,
    marginTop: -2,
  },

  // Schedule header
  scheduleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  scheduleHeaderLeft: {
    gap: 2,
  },
  scheduleDate: {
    fontSize: 12.25,
    fontWeight: '500',
    color: C.textSecondary,
  },
  scheduleTitle: {
    fontSize: 17.5,
    fontWeight: '700',
    color: C.black,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: C.textMuted,
    borderRadius: 10000,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mapButtonText: {
    fontSize: 12.25,
    fontWeight: '500',
    color: C.textSecondary,
  },

  // Routine card
  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: C.routineBorder,
    borderRadius: 7,
    borderLeftWidth: 6,
    borderLeftColor: C.routineBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  routineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
  },

  // Timeline
  timeline: {},
  timelineRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  timeColumn: {
    width: 70,
    alignItems: 'center',
    position: 'relative',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLine: {
    position: 'absolute',
    top: 36,
    bottom: 0,
    width: 0,
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 14,
    paddingLeft: 8,
  },

  // Station row
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  stationTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap', // 折り返しを有効にする
  },
  stationIcon: {
    width: 20,
    textAlign: 'center',
  },
  stationName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: -0.5,
  },
  eventWeatherInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  weatherTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingLeft: 28, // アイコン分ズラす
  },
  weatherTempText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textPrimary,
  },
  weatherDivider: {
    fontSize: 11,
    color: C.textMuted,
  },
  weatherRainText: {
    fontSize: 11,
    color: C.headerBg,
    fontWeight: '600',
  },
  weatherSmallText: {
    fontSize: 10,
    color: C.textSecondary,
    fontWeight: '500',
    marginRight: 8,
  },
  lineNameBadge: {
    borderRadius: 5.25,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lineNameText: {
    fontSize: 12.25,
    fontWeight: '500',
    color: C.white,
  },
  walkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  walkText: {
    fontSize: 12.25,
    fontWeight: '400',
    color: C.textSecondary,
  },

  // Event card
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.white,
    borderRadius: 8,
    paddingVertical: 4,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
  },
  eventSubtitle: {
    fontSize: 12.25,
    fontWeight: '400',
    color: C.textSecondary,
  },

  // Advice card
  adviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.headerBg,
    borderWidth: 3,
    borderColor: C.adviceBorder,
    borderRadius: 7,
    paddingRight: 12.25,
    gap: 7,
  },
  adviceContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
  },
  adviceOwl: {
    width: 56,
    height: 74.49,
  },
  adviceTextWrapper: {
    gap: 7,
    paddingVertical: 12.25,
  },
  adviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16.8,
    color: C.white,
  },
  adviceSubtitle: {
    fontSize: 12.25,
    fontWeight: '500',
    lineHeight: 14.7,
    color: C.white,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.fabBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
