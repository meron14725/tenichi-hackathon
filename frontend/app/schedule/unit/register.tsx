import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { tagApi, TagResponse } from '@/api/tagApi';
import { scheduleListApi, ScheduleListResponse } from '@/api/scheduleListApi';
import { scheduleApi } from '@/api/scheduleApi';
import { routeApi, TravelMode, RouteSearchResponse } from '@/api/routeApi';
import { userApi, UserSettingsResponse } from '@/api/userApi';
import { useAuth } from '@/contexts/AuthContext';
import TimePickerModal from '@/components/time-picker-modal';
import { scheduleNotification } from '@/utils/notifications';

const C = {
  primary: '#436F9B',
  accent: '#6E8F8A',
  bg: '#EEF0F1',
  white: '#FFFFFF',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  textMuted: '#B5BFC5',
  black: '#000000',
  border: '#EEF0F1',
  placeholder: '#98A6AE',
};

function getCategoryIcon(name: string): string {
  if (name.includes('遊')) return 'run-fast';
  if (name.includes('食')) return 'hamburger';
  if (name.includes('仕事')) return 'account-group-outline';
  if (name.includes('帰')) return 'exit-run';
  return 'label-outline';
}

const TRAVEL_MODES: { value: TravelMode; label: string; icon: string }[] = [
  { value: 'transit', label: '電車', icon: 'train' },
  { value: 'driving', label: '車', icon: 'car' },
  { value: 'walking', label: '徒歩', icon: 'walk' },
  { value: 'cycling', label: '自転車', icon: 'bicycle' },
];

interface Destination {
  lat: number;
  lon: number;
  name: string;
  address: string;
}

export default function ScheduleCreateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    schedule_list_id?: string;
    destination_lat?: string;
    destination_lon?: string;
    destination_name?: string;
    destination_address?: string;
    title?: string;
    memo?: string;
    selected_category_id?: string;
    travel_mode?: string;
    arrival_hour?: string;
    arrival_minute?: string;
    use_last_train?: string;
  }>();

  const scheduleListId = params.schedule_list_id ? Number(params.schedule_list_id) : null;
  const scheduleListRef = useRef<ScheduleListResponse | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const { isAuthenticated } = useAuth();

  const [title, setTitle] = useState<string>(params.title || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [arrivalTime, setArrivalTime] = useState<{ hour: number; minute: number } | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [useLastTrain, setUseLastTrain] = useState<boolean>(false);
  const [memo, setMemo] = useState<string>(params.memo || '');
  const [destination, setDestination] = useState<Destination | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>('transit');
  const [routeData, setRouteData] = useState<RouteSearchResponse | null>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [selectedItineraryIndex, setSelectedItineraryIndex] = useState<number | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettingsResponse | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !scheduleListId) return;
    async function fetchScheduleList() {
      try {
        const data = await scheduleListApi.getById(scheduleListId as number);
        scheduleListRef.current = data;
      } catch (error) {
        console.error('Failed to fetch schedule list:', error);
      }
    }
    fetchScheduleList();
  }, [isAuthenticated, scheduleListId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchTags() {
      try {
        const fetchedTags = await tagApi.getTags();
        setTags(fetchedTags);
        if (fetchedTags.length > 0 && selectedCategoryId === null) {
          setSelectedCategoryId(fetchedTags[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    }
    fetchTags();
  }, [isAuthenticated, selectedCategoryId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchUserSettings() {
      try {
        const settings = await userApi.getSettings();
        setUserSettings(settings);
      } catch (error) {
        console.error('Failed to fetch user settings:', error);
      }
    }
    fetchUserSettings();
  }, [isAuthenticated]);

  useEffect(() => {
    if (params.destination_lat && params.destination_lon && params.destination_name) {
      setDestination({
        lat: parseFloat(params.destination_lat),
        lon: parseFloat(params.destination_lon),
        name: params.destination_name,
        address: params.destination_address || params.destination_name,
      });
    }
  }, [
    params.destination_lat,
    params.destination_lon,
    params.destination_name,
    params.destination_address,
  ]);

  const isHomecoming = tags.find(t => t.id === selectedCategoryId)?.name === '帰宅';

  useEffect(() => {
    if (isHomecoming && userSettings && userSettings.home_lat && userSettings.home_lon) {
      setDestination({
        lat: userSettings.home_lat,
        lon: userSettings.home_lon,
        name: '自宅',
        address: userSettings.home_address,
      });
    }
  }, [isHomecoming, userSettings]);

  useEffect(() => {
    if (params.title !== undefined) setTitle(params.title);
  }, [params.title]);
  useEffect(() => {
    if (params.memo !== undefined) setMemo(params.memo);
  }, [params.memo]);
  useEffect(() => {
    if (params.selected_category_id !== undefined)
      setSelectedCategoryId(Number(params.selected_category_id));
  }, [params.selected_category_id]);
  useEffect(() => {
    if (params.travel_mode !== undefined) setTravelMode(params.travel_mode as TravelMode);
  }, [params.travel_mode]);
  useEffect(() => {
    if (params.arrival_hour !== undefined && params.arrival_minute !== undefined) {
      setArrivalTime({
        hour: Number(params.arrival_hour),
        minute: Number(params.arrival_minute),
      });
    }
  }, [params.arrival_hour, params.arrival_minute]);
  useEffect(() => {
    if (params.use_last_train !== undefined) setUseLastTrain(params.use_last_train === 'true');
  }, [params.use_last_train]);

  const canAdd = title.trim().length > 0;
  const isTransit = travelMode === 'transit';
  const isLastTrainEnabled = isHomecoming && isTransit;

  useEffect(() => {
    if (!isLastTrainEnabled && useLastTrain) {
      setUseLastTrain(false);
    }
  }, [isLastTrainEnabled, useLastTrain]);

  function formatTime(time: { hour: number; minute: number } | null): string {
    if (!time) return '-- : --';
    return `${String(time.hour).padStart(2, '0')} : ${String(time.minute).padStart(2, '0')}`;
  }

  const getOrigin = React.useCallback(async (): Promise<{
    lat: number;
    lon: number;
    name?: string;
  }> => {
    const list = scheduleListRef.current;
    if (!list) throw new Error('List failed to load');
    if ((arrivalTime || useLastTrain) && list.schedules.length > 0) {
      const now = new Date();
      let refDate: Date;
      if (useLastTrain) {
        refDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0);
      } else {
        refDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          arrivalTime!.hour,
          arrivalTime!.minute
        );
      }
      const earlierSchedules = list.schedules
        .filter(s => s.end_at && new Date(s.end_at) < refDate)
        .sort((a, b) => new Date(b.end_at!).getTime() - new Date(a.end_at!).getTime());
      if (earlierSchedules.length > 0) {
        try {
          const prevSchedule = await scheduleApi.getById(earlierSchedules[0].id);
          if (prevSchedule.destination_lat != null && prevSchedule.destination_lon != null) {
            return {
              lat: Number(prevSchedule.destination_lat),
              lon: Number(prevSchedule.destination_lon),
              name: prevSchedule.destination_name || '前の予定',
            };
          }
        } catch (error) {
          console.error(error);
        }
      }
    }
    if (list.departure_lat != null && list.departure_lng != null) {
      return {
        lat: list.departure_lat,
        lon: list.departure_lng,
        name: list.departure_name || '出発地',
      };
    }
    throw new Error('出発地を特定できませんでした。');
  }, [arrivalTime, useLastTrain]);

  const handleSearchRoutes = React.useCallback(async () => {
    if (!destination || (!arrivalTime && !useLastTrain)) return;
    setRouteLoading(true);
    setRouteError(null);
    setRouteData(null);
    setSelectedItineraryIndex(null);
    try {
      const origin = await getOrigin();
      const list = scheduleListRef.current;
      if (!list) return;

      const [y, m_str, d_str] = list.date.split('-').map(Number);
      let arrivalDate: Date;

      if (useLastTrain) {
        // Last train is usually early morning next day (e.g., 1:00 AM)
        arrivalDate = new Date(y, m_str - 1, d_str + 1, 1, 0);
      } else {
        arrivalDate = new Date(y, m_str - 1, d_str, arrivalTime!.hour, arrivalTime!.minute);
      }
      const result = await routeApi.search({
        origin_lat: origin.lat,
        origin_lon: origin.lon,
        destination_lat: destination.lat,
        destination_lon: destination.lon,
        travel_mode: travelMode,
        arrival_time: arrivalDate.toISOString(),
      });
      if (origin.name || destination.name) {
        result.itineraries.forEach(itinerary => {
          if (itinerary.legs && itinerary.legs.length > 0) {
            if (origin.name) itinerary.legs[0].from_name = origin.name;
            if (destination.name)
              itinerary.legs[itinerary.legs.length - 1].to_name = destination.name;
          }
        });
      }
      setRouteData(result);
    } catch (e: any) {
      setRouteError(`ルート取得エラー: ${e.message}`);
    } finally {
      setRouteLoading(false);
    }
  }, [destination, arrivalTime, useLastTrain, travelMode, getOrigin]);

  useEffect(() => {
    if (useLastTrain && destination) handleSearchRoutes();
  }, [useLastTrain, destination, handleSearchRoutes]);

  async function handleAdd() {
    if (!scheduleListId || !title.trim()) return;
    const list = scheduleListRef.current;
    if (!list) return;

    const [y, m_str, d_str] = list.date.split('-').map(Number);
    let start_at = new Date(y, m_str - 1, d_str).toISOString();
    let end_at = new Date(y, m_str - 1, d_str).toISOString();

    if (arrivalTime) {
      const arrivalDate = new Date(y, m_str - 1, d_str, arrivalTime.hour, arrivalTime.minute);
      end_at = arrivalDate.toISOString();
      start_at = end_at;
    }
    if (
      routeData &&
      selectedItineraryIndex !== null &&
      routeData.itineraries[selectedItineraryIndex]
    ) {
      const route = routeData.itineraries[selectedItineraryIndex];
      start_at = route.departure_time;
      end_at = route.arrival_time;
    }
    try {
      const newSchedule = await scheduleApi.create({
        title: title.trim(),
        start_at,
        end_at,
        destination_name: destination?.name ?? null,
        destination_address: destination?.address ?? destination?.name ?? null,
        destination_lat: destination?.lat ?? null,
        destination_lon: destination?.lon ?? null,
        travel_mode: travelMode,
        memo: memo.trim() || null,
        tag_ids: selectedCategoryId ? [selectedCategoryId] : [],
        schedule_list_id: scheduleListId,
      });
      if (
        routeData &&
        selectedItineraryIndex !== null &&
        routeData.itineraries[selectedItineraryIndex]
      ) {
        const route = routeData.itineraries[selectedItineraryIndex];
        await scheduleApi.saveRoute(newSchedule.id, {
          route_data: route,
          departure_time: route.departure_time,
          arrival_time: route.arrival_time,
          duration_minutes: route.duration_minutes,
        });
      }

      // Schedule push notification 10 minutes before departure
      await scheduleNotification(title.trim(), start_at);

      const list = scheduleListRef.current;
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (list && list.date === today) {
        router.push('/(tabs)');
      } else {
        router.push({ pathname: '/schedule/list', params: { id: scheduleListId.toString() } });
      }
    } catch (error) {
      console.error(error);
      Alert.alert('エラー', '予定の登録に失敗しました');
    }
  }

  function getLegIcon(mode: string): { name: string; color: string } {
    const m = mode.toLowerCase();
    if (m.includes('walk')) return { name: 'walk', color: C.textSecondary };
    if (m.includes('rail') || m.includes('train') || m.includes('subway') || m.includes('transit'))
      return { name: 'train', color: C.primary };
    if (m.includes('bus')) return { name: 'bus', color: '#FF9500' };
    if (m.includes('bike') || m.includes('cycling')) return { name: 'bike', color: '#4CD964' };
    return { name: 'dots-horizontal', color: C.textMuted };
  }

  function formatRouteTime(isoString: string): string {
    const d = new Date(isoString);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}分`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}時間${m}分` : `${h}時間`;
  }
  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={16} color={C.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>スケジュール追加</Text>
            <TouchableOpacity onPress={canAdd ? handleAdd : undefined}>
              <Text style={[styles.addText, !canAdd && { opacity: 0.3 }]}>追加</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>スケジュールタイトル</Text>
              <View style={styles.inputCard}>
                <TextInput
                  style={styles.textInput}
                  placeholder="例：ランチ"
                  placeholderTextColor={C.placeholder}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>スケジュールの種類</Text>
              <View style={styles.categoryRow}>
                {tags.map(tag => {
                  const isSelected = selectedCategoryId === tag.id;
                  const icon = getCategoryIcon(tag.name);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                      onPress={() => setSelectedCategoryId(tag.id)}
                    >
                      <MaterialCommunityIcons
                        name={icon as any}
                        size={21}
                        color={isSelected ? C.white : C.textSecondary}
                      />
                      <Text
                        style={[styles.categoryText, isSelected && styles.categoryTextSelected]}
                      >
                        {tag.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>目的地</Text>
              <TouchableOpacity
                style={styles.formButton}
                onPress={() => {
                  router.push({
                    pathname: '/schedule/unit/destination-picker',
                    params: {
                      initial_lat: destination?.lat.toString(),
                      initial_lng: destination?.lon.toString(),
                      initial_name: destination?.name,
                      initial_address: destination?.address,
                      title,
                      memo,
                      selected_category_id: selectedCategoryId?.toString(),
                      travel_mode: travelMode,
                      arrival_hour: arrivalTime?.hour.toString(),
                      arrival_minute: arrivalTime?.minute.toString(),
                      use_last_train: useLastTrain.toString(),
                      ...(scheduleListId ? { schedule_list_id: scheduleListId.toString() } : {}),
                    },
                  });
                }}
              >
                <View style={styles.formButtonLeft}>
                  <Ionicons
                    name={destination ? 'location' : 'location-outline'}
                    size={24.5}
                    color={destination ? C.primary : C.placeholder}
                  />
                  <Text
                    style={destination ? styles.formButtonValue : styles.formButtonPlaceholder}
                    numberOfLines={1}
                  >
                    {destination ? destination.name : '目的地を探す'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>移動手段</Text>
              <View style={styles.travelModeRow}>
                {TRAVEL_MODES.map(mode => {
                  const isActive = travelMode === mode.value;
                  return (
                    <TouchableOpacity
                      key={mode.value}
                      style={[styles.travelModePill, isActive && styles.travelModePillActive]}
                      onPress={() => setTravelMode(mode.value)}
                    >
                      <MaterialCommunityIcons
                        name={mode.icon as any}
                        size={18}
                        color={isActive ? C.white : C.textSecondary}
                      />
                      <Text
                        style={[styles.travelModeText, isActive && styles.travelModeTextActive]}
                      >
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>到着時間</Text>
              <View style={styles.arrivalRow}>
                <TouchableOpacity
                  style={[styles.timeSelect, useLastTrain && styles.timeSelectDisabled]}
                  onPress={() => {
                    if (!useLastTrain) setShowTimePicker(true);
                  }}
                >
                  <View style={styles.formButtonLeft}>
                    <Ionicons
                      name="time-outline"
                      size={21}
                      color={useLastTrain ? C.textMuted : C.placeholder}
                    />
                    <Text style={[styles.timeText, useLastTrain && { color: C.textMuted }]}>
                      {formatTime(arrivalTime)}
                    </Text>
                  </View>
                  <Ionicons
                    name="caret-down"
                    size={12}
                    color={useLastTrain ? C.textMuted : C.textSecondary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.checkboxRow, !isLastTrainEnabled && { opacity: 0.5 }]}
                  onPress={() => {
                    if (isLastTrainEnabled) {
                      const nextVal = !useLastTrain;
                      setUseLastTrain(nextVal);
                      if (nextVal) setArrivalTime(null);
                    }
                  }}
                >
                  <View style={useLastTrain ? styles.checkboxChecked : styles.checkboxUnchecked}>
                    {useLastTrain && <Ionicons name="checkmark" size={12} color={C.white} />}
                  </View>
                  <Text style={styles.checkboxLabel}>終電で帰る</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ルート検索結果 */}
            {destination && (arrivalTime || useLastTrain) && (
              <View style={styles.section}>
                <View style={styles.routeHeaderRow}>
                  <Text style={styles.sectionLabel}>ルート候補</Text>
                  <TouchableOpacity
                    style={styles.searchRouteButton}
                    onPress={handleSearchRoutes}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="search" size={14} color={C.white} />
                    <Text style={styles.searchRouteButtonText}>ルートを検索</Text>
                  </TouchableOpacity>
                </View>

                {routeLoading && (
                  <View style={styles.routeCenterContainer}>
                    <ActivityIndicator color={C.primary} size="large" />
                    <Text style={styles.routeLoadingText}>ルートを検索中...</Text>
                  </View>
                )}

                {routeError && (
                  <View style={styles.routeCenterContainer}>
                    <Ionicons name="alert-circle-outline" size={32} color={C.textMuted} />
                    <Text style={styles.routeErrorText}>{routeError}</Text>
                  </View>
                )}

                {!routeLoading &&
                  !routeError &&
                  routeData &&
                  routeData.itineraries.length === 0 && (
                    <View style={styles.routeCenterContainer}>
                      <Text style={styles.routeErrorText}>ルートが見つかりませんでした</Text>
                    </View>
                  )}

                {!routeLoading &&
                  !routeError &&
                  routeData &&
                  routeData.itineraries.map((itinerary, index) => {
                    const isSelected = selectedItineraryIndex === index;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.itineraryCard, isSelected && styles.itineraryCardSelected]}
                        onPress={() => setSelectedItineraryIndex(index)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.itinerarySummary}>
                          <View style={styles.itineraryTimeRange}>
                            <Text style={styles.itineraryTime}>
                              {formatRouteTime(itinerary.departure_time)}
                            </Text>
                            <Ionicons name="arrow-forward" size={12} color={C.textMuted} />
                            <Text style={styles.itineraryTimeArrival}>
                              {formatRouteTime(itinerary.arrival_time)}
                            </Text>
                          </View>
                          <View style={styles.itineraryMeta}>
                            <Text style={styles.itineraryDuration}>
                              {formatDuration(itinerary.duration_minutes)}
                            </Text>
                            {itinerary.number_of_transfers != null && (
                              <Text style={styles.itineraryTransfers}>
                                乗換{itinerary.number_of_transfers}回
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Legs Details */}
                        {itinerary.legs && itinerary.legs.length > 0 && (
                          <View style={styles.itineraryLegs}>
                            {itinerary.legs.map((leg, lIdx) => {
                              const icon = getLegIcon(leg.mode);
                              const lineName =
                                leg.route_short_name || leg.route_long_name || leg.mode;
                              return (
                                <View key={lIdx} style={styles.legItem}>
                                  <View style={styles.legIconContainer}>
                                    <MaterialCommunityIcons
                                      name={icon.name as any}
                                      size={16}
                                      color={icon.color}
                                    />
                                  </View>
                                  <View style={styles.legDetails}>
                                    <Text style={styles.legLine} numberOfLines={1}>
                                      {lineName}
                                      {leg.headsign ? ` (${leg.headsign}行)` : ''}
                                    </Text>
                                    <Text style={styles.legStation} numberOfLines={1}>
                                      {formatRouteTime(leg.departure_time)} {leg.from_name}
                                      {' → '}
                                      {formatRouteTime(leg.arrival_time)} {leg.to_name}
                                    </Text>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}

                        {isSelected && (
                          <View style={styles.selectedCheckContainer}>
                            <Ionicons name="checkmark-circle" size={22} color={C.primary} />
                            <Text style={styles.selectedCheckText}>選択中</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>一言メモ</Text>
              <View style={styles.memoCard}>
                <TextInput
                  style={styles.memoInput}
                  placeholder="例：4人でテーブル席で予約する"
                  placeholderTextColor={C.placeholder}
                  value={memo}
                  onChangeText={setMemo}
                  multiline
                  textAlignVertical="top"
                  onFocus={() => {
                    setTimeout(() => {
                      scrollRef.current?.scrollToEnd({ animated: true });
                    }, 150);
                  }}
                />
              </View>
            </View>
          </ScrollView>
        </View>

        <TimePickerModal
          visible={showTimePicker}
          onSelect={(h, m) => setArrivalTime({ hour: h, minute: m })}
          onClose={() => setShowTimePicker(false)}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: 60,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 15.75, fontWeight: '700', color: C.textPrimary },
  addText: { fontSize: 14, fontWeight: '700', color: C.primary },
  scrollView: { flex: 1 },
  scrollContent: { padding: 14, paddingTop: 17.5, paddingBottom: 100, gap: 17.5 },
  section: { gap: 7 },
  sectionLabel: { fontSize: 14, fontWeight: '500', color: C.textSecondary },
  inputCard: {
    backgroundColor: C.white,
    borderRadius: 7,
    paddingHorizontal: 12.25,
    justifyContent: 'center',
    height: 45.5,
  },
  textInput: { fontSize: 14, fontWeight: '400', color: C.textPrimary },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12.25 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10.5,
    paddingHorizontal: 12.25,
    backgroundColor: C.white,
    borderRadius: 10000,
  },
  categoryPillSelected: { backgroundColor: C.accent },
  categoryText: { fontSize: 12.25, fontWeight: '700', color: C.textSecondary },
  categoryTextSelected: { color: C.white },
  formButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    borderRadius: 7,
    paddingHorizontal: 12.25,
    height: 45.5,
  },
  formButtonLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  formButtonPlaceholder: { fontSize: 14, fontWeight: '400', color: C.placeholder },
  formButtonValue: { fontSize: 14, fontWeight: '500', color: C.textPrimary, flex: 1 },
  arrivalRow: { flexDirection: 'row', alignItems: 'center', gap: 12.25 },
  timeSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    borderRadius: 7,
    paddingHorizontal: 12.25,
    width: 140,
    height: 45.5,
  },
  timeSelectDisabled: { opacity: 0.5 },
  timeText: { fontSize: 14, fontWeight: '400', color: C.placeholder },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  checkboxUnchecked: {
    width: 17.5,
    height: 17.5,
    borderRadius: 3.5,
    borderWidth: 1,
    borderColor: C.textMuted,
    backgroundColor: C.white,
  },
  checkboxChecked: {
    width: 17.5,
    height: 17.5,
    borderRadius: 3.5,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: { fontSize: 14, fontWeight: '400', color: C.textMuted },
  memoCard: { backgroundColor: C.white, borderRadius: 10.5, paddingHorizontal: 14, height: 80 },
  memoInput: { flex: 1, fontSize: 14, fontWeight: '400', color: C.textPrimary, paddingTop: 17.5 },
  travelModeRow: { flexDirection: 'row', gap: 10 },
  travelModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: C.white,
    borderRadius: 10000,
    borderWidth: 1,
    borderColor: C.border,
  },
  travelModePillActive: { backgroundColor: C.primary, borderColor: C.primary },
  travelModeText: { fontSize: 12.25, fontWeight: '500', color: C.textSecondary },
  travelModeTextActive: { color: C.white, fontWeight: '700' },
  routeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  searchRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  searchRouteButtonText: { fontSize: 12, fontWeight: '700', color: C.white },
  routeCenterContainer: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  routeLoadingText: { fontSize: 13, color: C.textSecondary },
  routeErrorText: { fontSize: 13, color: C.textSecondary, textAlign: 'center' },
  itineraryCard: {
    backgroundColor: C.white,
    borderRadius: 10,
    padding: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: C.border,
    marginBottom: 8,
  },
  itineraryCardSelected: { borderColor: C.primary, backgroundColor: '#F0F5FA' },
  itinerarySummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itineraryTimeRange: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itineraryTime: { fontSize: 18, fontWeight: '500', color: C.textPrimary },
  itineraryTimeArrival: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  itineraryMeta: { alignItems: 'flex-end' },
  itineraryDuration: { fontSize: 13, fontWeight: '500', color: C.textSecondary },
  itineraryTransfers: { fontSize: 13, fontWeight: '500', color: C.textSecondary },
  itineraryLegs: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
    gap: 8,
  },
  legItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  legIconContainer: { width: 24, alignItems: 'center' },
  legDetails: { flex: 1, gap: 2 },
  legLine: { fontSize: 12, fontWeight: '700', color: C.textPrimary },
  legStation: { fontSize: 12, color: C.textSecondary },
  selectedCheckContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  selectedCheckText: { fontSize: 12, fontWeight: '700', color: C.primary },
});
