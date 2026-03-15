import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
  FontAwesome5,
} from '@expo/vector-icons';

// Colors
const C = {
  headerBg: '#436F9B',
  todoBg: '#E6EDF6',
  todoBorder: '#A8C0DD',
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
  trainBadgeBg: '#B5BFC5',
  fabBg: '#436F9B',
  warmText: '#AA8A5E',
};

// Mock data
const TIMELINE = [
  {
    time: '08:34',
    title: '荻窪発',
    badge: '中央線快速',
    past: true,
  },
  {
    time: '08:52',
    title: '新宿乗換',
    badge: '山手線',
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
        <View style={styles.chatRow}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Ionicons name="person" size={22} color={C.white} />
          </View>
          {/* Chat bubble */}
          <View style={styles.chatBubble}>
            <Text style={styles.chatText}>
              おはよう！昨日はよく眠れたかな？{'\n'}
              本日15時から降水確率70%なので、傘が必要かも！
            </Text>
          </View>
        </View>
        {/* Menu button */}
        <TouchableOpacity style={styles.menuButton}>
          <Feather name="more-horizontal" size={20} color={C.white} />
        </TouchableOpacity>
      </View>
    );
  }

  function renderTodoCard() {
    return (
      <View style={styles.todoCard}>
        {/* Todo header */}
        <View style={styles.todoHeader}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={24.5}
            color={C.textPrimary}
          />
          <Text style={styles.todoHeaderText}>本日すること！</Text>
        </View>
        {/* Todo body */}
        <View style={styles.todoBody}>
          {/* Checked item */}
          <View style={styles.todoRow}>
            <Ionicons name="checkbox" size={22} color="#4CAF50" />
            <Text style={styles.todoCheckedText}>MTGの準備</Text>
          </View>
          {/* Dashed divider */}
          <View style={styles.dashedDivider} />
          {/* Unchecked item */}
          <View style={styles.todoRow}>
            <View style={styles.uncheckedBox} />
            <Text style={styles.todoText}>スーパーで買い物</Text>
          </View>
        </View>
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
      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleDate}>3/4 (木)</Text>
        <Text style={styles.scheduleTitle}>本日の予定</Text>
      </View>
    );
  }

  function renderRoutineCard() {
    return (
      <View style={styles.routineCard}>
        <FontAwesome5 name="briefcase" size={20} color={C.routineBorder} />
        <Text style={styles.routineTitle}>仕事ルーティン①</Text>
      </View>
    );
  }

  function renderTimelineEntry(
    item: (typeof TIMELINE)[number],
    index: number
  ) {
    const isLast = index === TIMELINE.length - 1;
    const textColor = item.past ? C.textMuted : C.black;

    return (
      <View key={`${item.time}-${item.title}`} style={styles.timelineRow}>
        {/* Time column */}
        <View style={styles.timeColumn}>
          <Text style={[styles.timeText, { color: textColor }]}>
            {item.time}
          </Text>
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
                  borderColor: item.past ? C.textMuted : C.textMuted,
                },
              ]}
            />
          )}
        </View>

        {/* Content column */}
        <View style={styles.timelineContent}>
          {/* Station with badge */}
          {item.badge && (
            <View style={styles.stationRow}>
              <Text style={[styles.stationName, { color: textColor }]}>
                {item.title}
              </Text>
              <View style={styles.trainBadge}>
                <Text style={styles.trainBadgeText}>{item.badge}</Text>
              </View>
            </View>
          )}

          {/* Walk info */}
          {item.walk && (
            <View style={styles.stationRow}>
              <Text style={[styles.stationName, { color: textColor }]}>
                {item.title}
              </Text>
              <Text style={styles.walkText}>
                🚶{item.walk}
              </Text>
            </View>
          )}

          {/* Event with icon + chevron */}
          {item.hasChevron && (
            <TouchableOpacity style={styles.eventCard}>
              <View
                style={[styles.eventIcon, { backgroundColor: item.iconBg }]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={C.textSecondary}
                />
              </View>
              <View style={styles.eventDetails}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={C.textMuted}
              />
            </TouchableOpacity>
          )}

          {/* Simple station (no badge, no walk, no chevron) */}
          {!item.badge && !item.walk && !item.hasChevron && (
            <Text style={[styles.stationName, { color: textColor }]}>
              {item.title}
            </Text>
          )}
        </View>
      </View>
    );
  }

  function renderTimeline() {
    return (
      <View style={styles.timeline}>{TIMELINE.map(renderTimelineEntry)}</View>
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
          {renderTodoCard()}
          {renderWeatherTrainRow()}
          {renderScheduleHeader()}
          {renderRoutineCard()}
          {renderTimeline()}
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
    paddingBottom: 24.5,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBubble: {
    flex: 1,
    backgroundColor: C.white,
    borderTopLeftRadius: 3.5,
    borderTopRightRadius: 10.5,
    borderBottomLeftRadius: 10.5,
    borderBottomRightRadius: 10.5,
    padding: 12,
  },
  chatText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    color: C.textPrimary,
  },
  menuButton: {
    position: 'absolute',
    right: 14,
    bottom: 32,
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

  // Main content
  mainContent: {
    backgroundColor: C.white,
    borderTopLeftRadius: 10.5,
    borderTopRightRadius: 10.5,
    marginTop: -8,
    paddingHorizontal: 14,
    paddingTop: 17.5,
    paddingBottom: 17.5,
    gap: 17.5,
    minHeight: 800,
  },

  // Todo card
  todoCard: {
    borderWidth: 2,
    borderColor: C.todoBorder,
    borderRadius: 14,
    overflow: 'hidden',
  },
  todoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.todoBg,
    borderBottomWidth: 2,
    borderBottomColor: C.todoBorder,
    paddingHorizontal: 17.5,
    paddingVertical: 12.25,
  },
  todoHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
  },
  todoBody: {
    paddingHorizontal: 17.5,
    paddingVertical: 17.5,
    gap: 17.5,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  todoCheckedText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
    textDecorationLine: 'line-through',
    textDecorationColor: C.textMuted,
  },
  todoText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
  },
  uncheckedBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.textMuted,
  },
  dashedDivider: {
    height: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: C.todoBorder,
    borderStyle: 'dashed',
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
  scheduleHeader: {
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
  },
  stationName: {
    fontSize: 14,
    fontWeight: '700',
  },
  trainBadge: {
    backgroundColor: C.trainBadgeBg,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  trainBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: C.white,
  },
  walkText: {
    fontSize: 12.25,
    fontWeight: '400',
    color: C.textSecondary,
    marginLeft: 4,
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
