import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

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

type ScheduleCategory = '遊び' | '食事' | '仕事' | '帰宅';

const SCHEDULE_CATEGORIES: {
  label: ScheduleCategory;
  icon: string;
}[] = [
  { label: '遊び', icon: 'run-fast' },
  { label: '食事', icon: 'hamburger' },
  { label: '仕事', icon: 'account-group-outline' },
  { label: '帰宅', icon: 'exit-run' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function TimePickerModal({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (hour: number, minute: number) => void;
  onClose: () => void;
}) {
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={timePickerStyles.backdrop} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()} style={timePickerStyles.card}>
          <Text style={timePickerStyles.title}>到着時間を選択</Text>
          <View style={timePickerStyles.pickerRow}>
            {/* Hours */}
            <View style={timePickerStyles.column}>
              <Text style={timePickerStyles.columnLabel}>時</Text>
              <ScrollView
                style={timePickerStyles.scrollColumn}
                showsVerticalScrollIndicator={false}
              >
                {HOURS.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[timePickerStyles.cell, hour === h && timePickerStyles.cellSelected]}
                    onPress={() => setHour(h)}
                  >
                    <Text
                      style={[
                        timePickerStyles.cellText,
                        hour === h && timePickerStyles.cellTextSelected,
                      ]}
                    >
                      {String(h).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={timePickerStyles.separator}>:</Text>

            {/* Minutes */}
            <View style={timePickerStyles.column}>
              <Text style={timePickerStyles.columnLabel}>分</Text>
              <ScrollView
                style={timePickerStyles.scrollColumn}
                showsVerticalScrollIndicator={false}
              >
                {MINUTES.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[timePickerStyles.cell, minute === m && timePickerStyles.cellSelected]}
                    onPress={() => setMinute(m)}
                  >
                    <Text
                      style={[
                        timePickerStyles.cellText,
                        minute === m && timePickerStyles.cellTextSelected,
                      ]}
                    >
                      {String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={timePickerStyles.buttons}>
            <TouchableOpacity style={timePickerStyles.cancelButton} onPress={onClose}>
              <Text style={timePickerStyles.cancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={timePickerStyles.confirmButton}
              onPress={() => {
                onSelect(hour, minute);
                onClose();
              }}
            >
              <Text style={timePickerStyles.confirmText}>決定</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const timePickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 24,
    width: '100%',
    gap: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  column: {
    alignItems: 'center',
    gap: 8,
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textSecondary,
  },
  scrollColumn: {
    height: 180,
    width: 70,
  },
  cell: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 7,
  },
  cellSelected: {
    backgroundColor: C.primary,
  },
  cellText: {
    fontSize: 16,
    fontWeight: '500',
    color: C.textPrimary,
  },
  cellTextSelected: {
    color: C.white,
    fontWeight: '700',
  },
  separator: {
    fontSize: 24,
    fontWeight: '700',
    color: C.textPrimary,
    marginTop: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 7,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textSecondary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: 7,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
  },
});

export default function ScheduleCreateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ScheduleCategory | null>(null);
  const [arrivalTime, setArrivalTime] = useState<{ hour: number; minute: number } | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [useLastTrain, setUseLastTrain] = useState(false);
  const [memo, setMemo] = useState('');

  const canAdd = title.trim().length > 0;

  function handleAdd() {
    // TODO: API integration
    router.back();
  }

  function formatTime(time: { hour: number; minute: number } | null): string {
    if (!time) return '-- : --';
    return `${String(time.hour).padStart(2, '0')} : ${String(time.minute).padStart(2, '0')}`;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
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
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* スケジュールタイトル */}
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

        {/* スケジュールの種類 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>スケジュールの種類</Text>
          <View style={styles.categoryRow}>
            {SCHEDULE_CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat.label;
              return (
                <TouchableOpacity
                  key={cat.label}
                  style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                  onPress={() => setSelectedCategory(cat.label)}
                >
                  <MaterialCommunityIcons
                    name={cat.icon as any}
                    size={21}
                    color={isSelected ? C.white : C.textSecondary}
                  />
                  <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 目的地 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>目的地</Text>
          <TouchableOpacity style={styles.formButton} activeOpacity={0.7}>
            <View style={styles.formButtonLeft}>
              <Ionicons name="location-outline" size={24.5} color={C.placeholder} />
              <Text style={styles.formButtonPlaceholder}>目的地を探す</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 到着時間 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>到着時間</Text>
          <View style={styles.arrivalRow}>
            <TouchableOpacity
              style={[styles.timeSelect, useLastTrain && styles.timeSelectDisabled]}
              onPress={() => {
                if (!useLastTrain) setShowTimePicker(true);
              }}
              activeOpacity={useLastTrain ? 1 : 0.7}
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
              style={styles.checkboxRow}
              onPress={() => {
                setUseLastTrain(!useLastTrain);
                if (!useLastTrain) setArrivalTime(null);
              }}
              activeOpacity={0.7}
            >
              {useLastTrain ? (
                <View style={styles.checkboxChecked}>
                  <Ionicons name="checkmark" size={12} color={C.white} />
                </View>
              ) : (
                <View style={styles.checkboxUnchecked} />
              )}
              <Text style={styles.checkboxLabel}>終電で帰る</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 一言メモ */}
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
            />
          </View>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={showTimePicker}
        onSelect={(h, m) => setArrivalTime({ hour: h, minute: m })}
        onClose={() => setShowTimePicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
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

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: 14, paddingTop: 17.5, paddingBottom: 100, gap: 17.5 },

  // Section
  section: { gap: 7 },
  sectionLabel: { fontSize: 14, fontWeight: '500', color: C.textSecondary },

  // Input card
  inputCard: {
    backgroundColor: C.white,
    borderRadius: 7,
    paddingHorizontal: 12.25,
    justifyContent: 'center',
    height: 45.5,
  },
  textInput: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textPrimary,
  },

  // Category pills
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
  categoryPillSelected: {
    backgroundColor: C.accent,
  },
  categoryText: {
    fontSize: 12.25,
    fontWeight: '700',
    color: C.textSecondary,
  },
  categoryTextSelected: {
    color: C.white,
  },

  // Form button (目的地)
  formButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    borderRadius: 7,
    paddingHorizontal: 12.25,
    height: 45.5,
  },
  formButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  formButtonPlaceholder: {
    fontSize: 14,
    fontWeight: '400',
    color: C.placeholder,
  },

  // Arrival time
  arrivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12.25,
  },
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
  timeSelectDisabled: {
    opacity: 0.5,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '400',
    color: C.placeholder,
  },

  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
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
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textMuted,
  },

  // Memo
  memoCard: {
    backgroundColor: C.white,
    borderRadius: 10.5,
    paddingHorizontal: 14,
    height: 80,
  },
  memoInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: C.textPrimary,
    paddingTop: 17.5,
  },
});
