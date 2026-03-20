import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

const owlAvatar = require('@/assets/images/owl-avatar.png');

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
  fabBg: '#436F9B',
  warmText: '#AA8A5E',
  lineTJ: '#436F9B', // headerBgと同色だが路線カラーとして意味的に分離
  lineJS: '#E2725B',
};

// Mock data
const TIMELINE = [
  {
    time: '08:34',
    title: '志木発',
    lineCode: 'TJ',
    lineName: '東武東上線準急',
    lineColor: C.lineTJ,
    past: true,
  },
  {
    time: '08:52',
    title: '池袋乗換',
    lineCode: 'JS',
    lineName: 'JR湘南新宿ライン快速',
    lineColor: C.lineJS,
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
  const [todos, setTodos] = useState([
    { id: 1, label: '折りたたみ傘', checked: true },
    { id: 2, label: 'スーツ', checked: false },
  ]);

  const toggleTodo = (id: number) => {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, checked: !t.checked } : t)));
  };

  const remainingCount = todos.filter(t => !t.checked).length;

  function renderHeader() {
    return (
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTopRow}>
          {/* Left spacer */}
          <View style={{ width: 35 }} />
          {/* Menu button */}
          <TouchableOpacity style={styles.menuButton}>
            <Feather name="more-horizontal" size={20} color={C.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.chatRow}>
          {/* Owl Avatar */}
          <Image source={owlAvatar} style={styles.owlAvatar} resizeMode="contain" />
          {/* Chat bubble */}
          <View style={styles.chatBubbleWrapper}>
            <View style={styles.chatBubble}>
              <Text style={styles.chatText}>
                {'明日の準備をしよう！\nテキストテキスト\nテキスト'}
              </Text>
            </View>
            <View style={styles.chatTriangle} />
          </View>
        </View>
      </View>
    );
  }

  function renderTodoCard() {
    return (
      <View style={styles.todoCardWrapper}>
        <View style={styles.todoCard}>
          {/* Todo header */}
          <View style={styles.todoHeader}>
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={24.5}
              color={C.textPrimary}
            />
            <Text style={styles.todoHeaderText}>前日までに準備すること！</Text>
          </View>
          {/* Todo body */}
          <View style={styles.todoBody}>
            {todos.map((todo, index) => (
              <React.Fragment key={todo.id}>
                {index > 0 && <View style={styles.dashedDivider} />}
                <TouchableOpacity style={styles.todoRow} onPress={() => toggleTodo(todo.id)}>
                  {todo.checked ? (
                    <View style={styles.checkedBox}>
                      <Ionicons name="checkmark" size={13} color={C.white} />
                    </View>
                  ) : (
                    <View style={styles.uncheckedBox} />
                  )}
                  <Text style={todo.checked ? styles.todoCheckedText : styles.todoText}>
                    {todo.label}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>
        {remainingCount > 0 && (
          <View style={styles.remainingBadge}>
            <Text style={styles.remainingBadgeText}>残り{remainingCount}個！</Text>
          </View>
        )}
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
          <Text style={styles.scheduleDate}>3/5 (木)</Text>
          <Text style={styles.scheduleTitle}>明日の予定</Text>
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
          {/* Station with train line badges */}
          {item.lineCode && (
            <View style={styles.stationRow}>
              <Text style={[styles.stationName, { color: textColor }]}>{item.title}</Text>
              <View style={styles.lineBadgeRow}>
                <View style={styles.lineCodeBadge}>
                  <Text style={[styles.lineCodeText, { color: textColor }]}>{item.lineCode}</Text>
                </View>
                <View style={[styles.lineNameBadge, { backgroundColor: item.lineColor }]}>
                  <Text style={styles.lineNameText}>{item.lineName}</Text>
                </View>
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
          {!item.lineCode && !item.walk && !item.hasChevron && (
            <Text style={[styles.stationName, { color: textColor }]}>{item.title}</Text>
          )}
        </View>
      </View>
    );
  }

  function renderTimeline() {
    return <View style={styles.timeline}>{TIMELINE.map(renderTimelineEntry)}</View>;
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
    paddingBottom: 60,
    gap: 12.25,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: 'rgba(26,26,26,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  owlAvatar: {
    width: 165,
    height: 165,
  },
  chatBubbleWrapper: {
    flex: 1,
    marginLeft: -4,
    marginBottom: 20,
  },
  chatBubble: {
    backgroundColor: C.white,
    borderRadius: 10.5,
    borderWidth: 1,
    borderColor: C.white,
    paddingHorizontal: 12.25,
    paddingVertical: 7,
  },
  chatTriangle: {
    position: 'absolute',
    left: -8,
    bottom: 20,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
    borderRightWidth: 11,
    borderRightColor: C.white,
  },
  chatText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    color: C.textPrimary,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Main content (white area overlapping owl's lower body)
  mainContent: {
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingTop: 17.5,
    paddingBottom: 17.5,
    gap: 17.5,
    minHeight: 800,
    marginTop: -30,
  },

  // Todo card
  todoCardWrapper: {
    position: 'relative',
  },
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
  checkedBox: {
    width: 17.5,
    height: 17.5,
    borderRadius: 3.5,
    backgroundColor: C.headerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncheckedBox: {
    width: 17.5,
    height: 17.5,
    borderRadius: 3.5,
    borderWidth: 1,
    borderColor: C.textMuted,
  },
  remainingBadge: {
    position: 'absolute',
    right: 0,
    bottom: -12,
    backgroundColor: '#A86A78',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  remainingBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.white,
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
  lineBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lineCodeBadge: {
    borderWidth: 1,
    borderColor: C.textMuted,
    borderRadius: 5.25,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lineCodeText: {
    fontSize: 12.25,
    fontWeight: '500',
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
