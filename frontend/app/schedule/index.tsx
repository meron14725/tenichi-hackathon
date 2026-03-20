import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const owlAvatar = require('@/assets/images/owl-avatar.png');

const C = {
  headerBg: '#436F9B',
  primary: '#436F9B',
  accent: '#6E8F8A',
  todoBg: '#E6EDF6',
  todoBorder: '#A8C0DD',
  weatherBg: '#EDF0F2',
  trainBg: '#EEF0F1',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  textMuted: '#B5BFC5',
  black: '#000000',
  white: '#FFFFFF',
  warmText: '#AA8A5E',
};

export default function ScheduleIndexScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [todos, setTodos] = useState([
    { id: 1, label: '折りたたみ傘', checked: true },
    { id: 2, label: 'スーツ', checked: false },
  ]);

  const toggleTodo = (id: number) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t)));
  };

  const remainingCount = todos.filter((t) => !t.checked).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
          <Text style={styles.backText}>カレンダー</Text>
        </TouchableOpacity>
        <View style={styles.chatRow}>
          <Image source={owlAvatar} style={styles.owlAvatar} resizeMode="contain" />
          <View style={styles.chatBubbleWrapper}>
            <View style={styles.chatBubble}>
              <Text style={styles.chatText}>スケジュールを登録しよう！</Text>
            </View>
            <View style={styles.chatTriangle} />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          {/* Checklist */}
          <View style={styles.todoCardWrapper}>
            <View style={styles.todoCard}>
              <View style={styles.todoHeader}>
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={24.5}
                  color={C.textPrimary}
                />
                <Text style={styles.todoHeaderText}>前日までに準備すること！</Text>
              </View>
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

          {/* Weather + Train */}
          <View style={styles.infoRow}>
            <View style={styles.weatherCard}>
              <Ionicons name="cloud" size={23} color={C.textSecondary} />
              <Text style={styles.weatherTemp}>18℃ / 12℃</Text>
              <Text style={styles.weatherNote}>午後から雨</Text>
            </View>
            <View style={styles.trainCard}>
              <MaterialCommunityIcons
                name="chart-timeline-variant"
                size={28}
                color={C.textPrimary}
              />
              <Text style={styles.trainTime}>スケジュール未定</Text>
            </View>
          </View>

          {/* Schedule title */}
          <Text style={styles.scheduleTitle}>3/6 (金)の予定</Text>

          {/* Routine card */}
          <View style={styles.routineCard}>
            <View style={styles.routineInner}>
              <MaterialCommunityIcons name="bike" size={20} color={C.accent} />
              <View style={styles.routineTextWrap}>
                <Text style={styles.routineTitle}>友達と一日遊ぶ日</Text>
                <Text style={styles.routineMemo}>お店の予約をする！</Text>
              </View>
            </View>
          </View>

          {/* CTA */}
          <View style={styles.ctaSection}>
            <Text style={styles.ctaText}>スケジュールを追加しよう！</Text>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => router.push('/schedule/create')}
            >
              <Ionicons name="add" size={20} color={C.white} />
              <Text style={styles.registerButtonText}>スケジュール追加</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.headerBg },
  header: { backgroundColor: C.headerBg, paddingHorizontal: 14, paddingBottom: 24.5, gap: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, fontWeight: '500', color: C.white },
  chatRow: { flexDirection: 'row', alignItems: 'flex-end' },
  owlAvatar: { width: 165, height: 165 },
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
    position: 'absolute' as const,
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
  chatText: { fontSize: 14, fontWeight: '500' as const, lineHeight: 21, color: C.textPrimary },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  mainContent: {
    backgroundColor: C.white,
    borderTopLeftRadius: 10.5,
    borderTopRightRadius: 10.5,
    marginTop: -8,
    paddingHorizontal: 14,
    paddingTop: 17.5,
    paddingBottom: 17.5,
    gap: 17.5,
    minHeight: 600,
  },

  // Todo
  todoCardWrapper: { position: 'relative' as const },
  todoCard: { borderWidth: 2, borderColor: C.todoBorder, borderRadius: 14, overflow: 'hidden' },
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
  todoHeaderText: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  todoBody: { paddingHorizontal: 17.5, paddingVertical: 17.5, gap: 17.5 },
  todoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  todoCheckedText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
    textDecorationLine: 'line-through',
    textDecorationColor: C.textMuted,
  },
  todoText: { fontSize: 14, fontWeight: '500', color: C.textPrimary },
  checkedBox: {
    width: 17.5,
    height: 17.5,
    borderRadius: 3.5,
    backgroundColor: C.headerBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  uncheckedBox: {
    width: 17.5,
    height: 17.5,
    borderRadius: 3.5,
    borderWidth: 1,
    borderColor: C.textMuted,
  },
  remainingBadge: {
    position: 'absolute' as const,
    right: 0,
    bottom: -12,
    backgroundColor: '#A86A78',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  remainingBadgeText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: C.white,
  },
  dashedDivider: {
    height: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: C.todoBorder,
    borderStyle: 'dashed',
  },

  // Info row
  infoRow: { flexDirection: 'row', gap: 17.5 },
  weatherCard: {
    flex: 1,
    backgroundColor: C.weatherBg,
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 12.25,
    alignItems: 'center',
    gap: 7,
  },
  weatherTemp: { fontSize: 12.25, fontWeight: '500', color: C.textPrimary },
  weatherNote: { fontSize: 12.25, fontWeight: '500', color: C.warmText },
  trainCard: {
    flex: 1,
    backgroundColor: C.trainBg,
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 12.25,
    alignItems: 'center',
    gap: 7,
  },
  trainTime: { fontSize: 12.25, fontWeight: '500', color: C.textPrimary },

  // Schedule
  scheduleTitle: { fontSize: 17.5, fontWeight: '700', color: C.black },

  // Routine
  routineCard: {
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 7,
    borderLeftWidth: 6,
    borderLeftColor: C.accent,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  routineInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routineTextWrap: { flex: 1, gap: 4 },
  routineTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  routineMemo: { fontSize: 12.25, fontWeight: '400', color: C.textSecondary },

  // CTA
  ctaSection: { alignItems: 'center', gap: 14, paddingVertical: 20 },
  ctaText: { fontSize: 14, fontWeight: '500', color: C.textSecondary },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: C.primary,
    borderRadius: 10000,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  registerButtonText: { fontSize: 14, fontWeight: '700', color: C.white },
});
