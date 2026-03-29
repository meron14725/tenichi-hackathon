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
import { Image } from 'expo-image';

import { tagApi, TagResponse } from '@/api/tagApi';
import { scheduleListApi, ScheduleListResponse } from '@/api/scheduleListApi';
import { scheduleApi } from '@/api/scheduleApi';
import { routeApi, TravelMode, RouteSearchResponse } from '@/api/routeApi';
import { userApi, UserSettingsResponse } from '@/api/userApi';
import { useAuth } from '@/contexts/AuthContext';
import { AppColors as C } from '@/constants/app-colors';
import { getScheduleTagTheme } from '@/utils/schedule-helper';
import { scheduleNotification, cancelNotification } from '@/utils/notifications';
import TimePickerModal from '@/components/time-picker-modal';

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

export default function ScheduleEditScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    schedule_id: string;
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

  const scheduleId = Number(params.schedule_id);
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
  const [loading, setLoading] = useState<boolean>(true);
  const initialFetchDone = useRef(false);

  // 初回データロード
  useEffect(() => {
    if (!isAuthenticated || !scheduleId) return;

    async function fetchInitialData() {
      try {
        const schedule = await scheduleApi.getById(scheduleId);

        // Prefer parameters from navigation (user returning from map) over stored data
        setTitle(params.title || schedule.title);
        setMemo(params.memo || schedule.memo || '');
        setSelectedCategoryId(
          params.selected_category_id
            ? Number(params.selected_category_id)
            : schedule.tags.length > 0
              ? schedule.tags[0].id
              : null
        );
        setTravelMode(
          (params.travel_mode as TravelMode) || (schedule.travel_mode as TravelMode) || 'transit'
        );
        setUseLastTrain(params.use_last_train === 'true');

        if (params.destination_lat && params.destination_lon) {
          setDestination({
            lat: parseFloat(params.destination_lat),
            lon: parseFloat(params.destination_lon),
            name: params.destination_name || '',
            address: params.destination_address || '',
          });
        } else if (schedule.destination_lat != null && schedule.destination_lon != null) {
          setDestination({
            lat: schedule.destination_lat,
            lon: schedule.destination_lon,
            name: schedule.destination_name || '',
            address: schedule.destination_address || '',
          });
        }

        if (params.arrival_hour && params.arrival_minute) {
          setArrivalTime({
            hour: Number(params.arrival_hour),
            minute: Number(params.arrival_minute),
          });
        } else if (schedule.end_at) {
          const d = new Date(schedule.end_at);
          setArrivalTime({ hour: d.getHours(), minute: d.getMinutes() });
        }

        if (schedule.schedule_list_id) {
          const list = await scheduleListApi.getById(schedule.schedule_list_id);
          scheduleListRef.current = list;
        }

        // 保存済みルートがあれば表示
        const savedRoute = await scheduleApi.getRoute(scheduleId).catch(() => null);
        if (savedRoute) {
          setRouteData({ itineraries: [savedRoute.route_data] });
          setSelectedItineraryIndex(0);
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        Alert.alert('エラー', 'データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    }

    if (initialFetchDone.current) return;
    fetchInitialData().then(() => {
      initialFetchDone.current = true;
    });
  }, [
    isAuthenticated,
    scheduleId,
    params.title,
    params.memo,
    params.selected_category_id,
    params.travel_mode,
    params.destination_lat,
    params.destination_lon,
    params.destination_name,
    params.destination_address,
    params.arrival_hour,
    params.arrival_minute,
    params.use_last_train,
  ]);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchTags() {
      try {
        const fetchedTags = await tagApi.getTags();
        setTags(fetchedTags);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    }
    fetchTags();
  }, [isAuthenticated]);

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

  // Handle returning from picker with high priority
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

  // Automatically set home as destination when "帰宅" is selected
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

  // Params updates
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

  const canUpdate = title.trim().length > 0;
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

    if (!list) {
      throw new Error(`[エラー] scheduleListRefが空です。`);
    }

    if ((arrivalTime || useLastTrain) && list.schedules.length > 0) {
      const now = new Date();
      let refDate: Date;

      if (useLastTrain) {
        refDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 1, 0);
      } else {
        refDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          arrivalTime!.hour,
          arrivalTime!.minute
        );
      }

      // 自分自身を除外して計算する必要がある
      const earlierSchedules = list.schedules
        .filter(s => s.id !== scheduleId && s.end_at && new Date(s.end_at) < refDate)
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
        } catch (error: any) {
          console.error('Failed to fetch previous schedule details:', error);
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
  }, [arrivalTime, useLastTrain, scheduleId]);

  const handleSearchRoutes = React.useCallback(async () => {
    if (!destination || (!arrivalTime && !useLastTrain)) return;

    setRouteLoading(true);
    setRouteError(null);
    setRouteData(null);
    setSelectedItineraryIndex(null);

    let origin: { lat: number; lon: number; name?: string };
    try {
      origin = await getOrigin();
    } catch (e: any) {
      setRouteLoading(false);
      setRouteError(`出発地特定エラー: ${e.message}`);
      return;
    }

    const list = scheduleListRef.current;
    if (!list) return;

    const [y, m_str, d_str] = list.date.split('-').map(Number);
    let arrivalDate: Date;

    if (useLastTrain) {
      arrivalDate = new Date(y, m_str - 1, d_str + 1, 1, 0);
    } else {
      arrivalDate = new Date(y, m_str - 1, d_str, arrivalTime!.hour, arrivalTime!.minute);
    }

    try {
      const searchParams = {
        origin_lat: origin!.lat,
        origin_lon: origin!.lon,
        destination_lat: destination!.lat,
        destination_lon: destination!.lon,
        travel_mode: travelMode,
        arrival_time: arrivalDate.toISOString(),
      };

      const result = await routeApi.search(searchParams);

      if (origin.name || destination?.name) {
        result.itineraries.forEach(itinerary => {
          if (itinerary.legs && itinerary.legs.length > 0) {
            if (origin.name) itinerary.legs[0].from_name = origin.name;
            if (destination?.name)
              itinerary.legs[itinerary.legs.length - 1].to_name = destination.name;
          }
        });
      }

      setRouteData(result);
    } catch (e: any) {
      console.error(e);
      setRouteError(`ルート取得エラー: ${e.message}`);
    } finally {
      setRouteLoading(false);
    }
  }, [destination, arrivalTime, useLastTrain, travelMode, getOrigin]);

  useEffect(() => {
    if (useLastTrain && destination) {
      handleSearchRoutes();
    }
  }, [useLastTrain, destination, handleSearchRoutes]);

  async function handleUpdate() {
    if (!scheduleId || !title.trim()) return;

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
      await scheduleApi.update(scheduleId, {
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
      });

      if (
        routeData &&
        selectedItineraryIndex !== null &&
        routeData.itineraries[selectedItineraryIndex]
      ) {
        const route = routeData.itineraries[selectedItineraryIndex];
        await scheduleApi.saveRoute(scheduleId, {
          route_data: route,
          departure_time: route.departure_time,
          arrival_time: route.arrival_time,
          duration_minutes: route.duration_minutes,
        });
      }

      // Reschedule push notification with updated time
      await scheduleNotification(title.trim(), start_at, scheduleId);

      router.back();
    } catch (error: any) {
      console.error('Failed to update schedule:', error);
      Alert.alert('エラー', '予定の更新に失敗しました');
    }
  }

  async function handleDelete() {
    Alert.alert('確認', 'この予定を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelNotification(scheduleId);
            await scheduleApi.delete(scheduleId);
            router.back();
          } catch (error) {
            console.error('Failed to delete schedule:', error);
            Alert.alert('エラー', '予定の削除に失敗しました');
          }
        },
      },
    ]);
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

  function getLegIcon(mode: string): { name: string; color: string } {
    const m = mode.toLowerCase();
    if (m.includes('walk')) return { name: 'walk', color: C.textSecondary };
    if (m.includes('rail') || m.includes('train') || m.includes('subway') || m.includes('transit'))
      return { name: 'train', color: C.primary };
    if (m.includes('bus')) return { name: 'bus', color: '#FF9500' };
    if (m.includes('bike') || m.includes('cycling')) return { name: 'bike', color: '#4CD964' };
    return { name: 'dots-horizontal', color: C.textMuted };
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
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
            <Text style={styles.headerTitle}>スケジュール編集</Text>
            <TouchableOpacity onPress={canUpdate ? handleUpdate : undefined}>
              <Text style={[styles.addText, !canUpdate && { opacity: 0.3 }]}>保存</Text>
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
                {tags
                  .filter(tag => [1, 2, 3, 5].includes(tag.id))
                  .map(tag => {
                    const isSelected = selectedCategoryId === tag.id;
                    const theme = getScheduleTagTheme(tag.id);
                    return (
                      <TouchableOpacity
                        key={tag.id}
                        style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                        onPress={() => setSelectedCategoryId(tag.id)}
                        activeOpacity={0.7}
                      >
                        {isSelected && (
                          <View style={styles.categoryCheckBg}>
                            <Image
                              source={require('@/assets/images/check-circle-solid.svg')}
                              style={styles.categoryCheckIcon}
                              contentFit="contain"
                            />
                          </View>
                        )}
                        <Image
                          source={theme.icon}
                          style={{ width: 21, height: 21 }}
                          contentFit="contain"
                        />
                        <Text style={styles.categoryText}>{tag.name}</Text>
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
                      schedule_id: scheduleId.toString(),
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

            {/* Delete */}
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color={C.danger} />
              <Text style={styles.deleteButtonText}>予定を削除</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>

        <TimePickerModal
          visible={showTimePicker}
          onSelect={(h, m) => setArrivalTime({ hour: h, minute: m })}
          onClose={() => setShowTimePicker(false)}
          initialHour={arrivalTime?.hour}
          initialMinute={arrivalTime?.minute}
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
  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryPill: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 24,
    paddingVertical: 10.5,
    paddingHorizontal: 12.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryPillSelected: { borderColor: C.primary },
  categoryText: { fontSize: 12.5, fontWeight: '700', color: C.textSecondary },
  categoryCheckBg: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: C.bg,
    borderRadius: 12,
  },
  categoryCheckIcon: {
    width: 20,
    height: 20,
    tintColor: C.primary,
  },
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 16,
  },
  deleteButtonText: { color: C.danger, fontSize: 14, fontWeight: '700' },
});
