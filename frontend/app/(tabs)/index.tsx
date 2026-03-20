import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import OwlChatBubble from '@/components/owl-chat-bubble';
import TodoCard from '@/components/todo-card';

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
const TIMELINE = [
  {
    time: '08:34',
    title: '荻窪発',
    lineName: '中央線快速',
    lineColor: '#E2725B',
    past: true,
  },
  {
    time: '08:52',
    title: '新宿乗換',
    lineName: '山手線',
    lineColor: '#6E8F8A',
    past: true,
  },
  {
    time: '09:00',
    title: '渋谷着',
    walk: '12分',
    past: false,
  },
  {
    time: '09:30',
    title: 'デザインレビュー',
    subtitle: '渋谷オフィス4F',
    iconBg: C.eventGreen,
    past: false,
    hasChevron: true,
  },
  {
    time: '12:00',
    title: 'ランチ',
    subtitle: '恵比寿 CAFE BRISE',
    iconBg: C.eventWarm,
    past: false,
    hasChevron: true,
  },
  {
    time: '15:30',
    title: 'クライアント提案',
    subtitle: 'オンラインZoom',
    iconBg: C.eventGreen,
    past: false,
    hasChevron: true,
  },
  {
    time: '16:30',
    title: 'クライアント提案',
    subtitle: 'オンラインZoom',
    iconBg: C.eventGreen,
    past: false,
    hasChevron: true,
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  function renderHeader() {
    return (
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.menuSpacer} />
          <TouchableOpacity style={styles.menuButton}>
            <Feather name="more-horizontal" size={20} color={C.white} />
          </TouchableOpacity>
        </View>
        <OwlChatBubble message={'スケジュールを登録しよう！\nテキストテキスト\nテキスト'} />
      </View>
    );
  }

  function renderWeatherTrainRow() {
    return (
      <View style={styles.weatherTrainRow}>
        {/* Weather card */}
        <View style={styles.weatherCard}>
          <Ionicons name="cloud" size={23} color={C.textSecondary} />
          <Text style={styles.weatherTemp}>18℃ / 12℃</Text>
          <Text style={styles.weatherNote}>午後から雨</Text>
        </View>
        {/* Train card */}
        <View style={styles.trainCard}>
          <MaterialCommunityIcons name="train" size={28} color={C.textPrimary} />
          <Text style={styles.trainTime}>09:00 渋谷着</Text>
        </View>
      </View>
    );
  }

  function renderScheduleHeader() {
    return (
      <View style={styles.scheduleHeaderRow}>
        <View style={styles.scheduleHeaderLeft}>
          <Text style={styles.scheduleDate}>3/4 (木)</Text>
          <Text style={styles.scheduleTitle}>今日の予定</Text>
        </View>
        <TouchableOpacity style={styles.mapButton}>
          <Ionicons name="map-outline" size={14} color={C.textSecondary} />
          <Text style={styles.mapButtonText}>マップ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderRoutineCard() {
    return (
      <View style={styles.routineCard}>
        <MaterialCommunityIcons name="laptop" size={20} color={C.routineBorder} />
        <Text style={styles.routineTitle}>仕事ルーティン①</Text>
      </View>
    );
  }

  function renderTimelineEntry(item: (typeof TIMELINE)[number], index: number) {
    const isLast = index === TIMELINE.length - 1;
    const textColor = item.past ? C.textMuted : C.black;

    return (
      <View key={`${item.time}-${item.title}`} style={styles.timelineRow}>
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
          {/* Station with train line badge */}
          {item.lineName && (
            <View style={styles.stationRow}>
              <Text style={[styles.stationName, { color: textColor }]}>{item.title}</Text>
              <View
                style={[
                  styles.lineNameBadge,
                  { backgroundColor: item.past ? C.textMuted : item.lineColor },
                ]}
              >
                <Text style={styles.lineNameText}>{item.lineName}</Text>
              </View>
            </View>
          )}

          {/* Walk info */}
          {item.walk && (
            <View style={styles.stationRow}>
              <Text style={[styles.stationName, { color: textColor }]}>{item.title}</Text>
              <View style={styles.walkRow}>
                <MaterialCommunityIcons name="walk" size={16} color={C.textSecondary} />
                <Text style={styles.walkText}>{item.walk}</Text>
              </View>
            </View>
          )}

          {/* Event with icon + chevron */}
          {item.hasChevron && (
            <TouchableOpacity style={styles.eventCard}>
              <View style={[styles.eventIcon, { backgroundColor: item.iconBg }]}>
                <Ionicons name="calendar-outline" size={18} color={C.textSecondary} />
              </View>
              <View style={styles.eventDetails}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
            </TouchableOpacity>
          )}

          {/* Simple station (no badge, no walk, no chevron) */}
          {!item.lineName && !item.walk && !item.hasChevron && (
            <Text style={[styles.stationName, { color: textColor }]}>{item.title}</Text>
          )}
        </View>
      </View>
    );
  }

  function renderTimeline() {
    return <View style={styles.timeline}>{TIMELINE.map(renderTimelineEntry)}</View>;
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

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <TodoCard />
          {renderWeatherTrainRow()}
          {renderScheduleHeader()}
          {renderRoutineCard()}
          {renderTimeline()}
          {renderAdviceCard()}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: 100 + insets.bottom }]}>
        <Ionicons name="add" size={28} color={C.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.headerBg,
  },
  // Header
  header: {
    backgroundColor: C.headerBg,
    paddingHorizontal: 14,
    paddingBottom: 60,
    gap: 12.25,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuSpacer: {
    width: 35,
  },
  menuButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: 'rgba(26,26,26,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  mainContent: {
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingTop: 17.5,
    paddingBottom: 17.5,
    gap: 17.5,
    minHeight: 800,
    marginTop: -30,
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
    fontSize: 12.25,
    fontWeight: '500',
    color: C.textPrimary,
  },
  weatherNote: {
    fontSize: 12.25,
    fontWeight: '500',
    color: C.warmText,
  },
  trainCard: {
    flex: 1,
    backgroundColor: C.trainBg,
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 12.25,
    alignItems: 'center',
    gap: 7,
  },
  trainTime: {
    fontSize: 15.75,
    fontWeight: '500',
    color: C.textPrimary,
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
    flexWrap: 'wrap',
  },
  stationName: {
    fontSize: 14,
    fontWeight: '700',
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
