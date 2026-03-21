import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const C = {
  primary: '#436F9B',
  white: '#FFFFFF',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  border: '#EEF0F1',
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

interface TimePickerModalProps {
  visible: boolean;
  onSelect: (hour: number, minute: number) => void;
  onClose: () => void;
  initialHour?: number;
  initialMinute?: number;
}

export default function TimePickerModal({
  visible,
  onSelect,
  onClose,
  initialHour = 8,
  initialMinute = 0,
}: TimePickerModalProps) {
  const [hour, setHour] = useState<number>(initialHour);
  const [minute, setMinute] = useState<number>(initialMinute);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()} style={styles.card}>
          <Text style={styles.title}>到着時間を選択</Text>
          <View style={styles.pickerRow}>
            {/* Hours */}
            <View style={styles.column}>
              <Text style={styles.columnLabel}>時</Text>
              <ScrollView style={styles.scrollColumn} showsVerticalScrollIndicator={false}>
                {HOURS.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.cell, hour === h && styles.cellSelected]}
                    onPress={() => setHour(h)}
                  >
                    <Text style={[styles.cellText, hour === h && styles.cellTextSelected]}>
                      {String(h).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.separator}>:</Text>

            {/* Minutes */}
            <View style={styles.column}>
              <Text style={styles.columnLabel}>分</Text>
              <ScrollView style={styles.scrollColumn} showsVerticalScrollIndicator={false}>
                {MINUTES.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.cell, minute === m && styles.cellSelected]}
                    onPress={() => setMinute(m)}
                  >
                    <Text style={[styles.cellText, minute === m && styles.cellTextSelected]}>
                      {String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => {
                onSelect(hour, minute);
                onClose();
              }}
            >
              <Text style={styles.confirmText}>決定</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
