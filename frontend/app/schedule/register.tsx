import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

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

type ScheduleType = '休日' | '旅行' | '仕事' | '出張';

const SCHEDULE_TYPES: { label: ScheduleType; icon: string; iconSet: 'ionicons' | 'fa5' | 'mci' }[] =
  [
    { label: '休日', icon: 'bicycle', iconSet: 'ionicons' },
    { label: '旅行', icon: 'suitcase-rolling', iconSet: 'fa5' },
    { label: '仕事', icon: 'briefcase-outline', iconSet: 'mci' },
    { label: '出張', icon: 'briefcase', iconSet: 'fa5' },
  ];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [step, setStep] = useState<'method' | 'form'>('method');
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [selectedType, setSelectedType] = useState<ScheduleType>('休日');
  const [belongings, setBelongings] = useState<string[]>(['財布', '充電器']);
  const [newBelonging, setNewBelonging] = useState('');
  const [showModal, setShowModal] = useState(false);

  function handleSave() {
    setShowModal(true);
  }

  function removeBelonging(index: number) {
    setBelongings(prev => prev.filter((_, i) => i !== index));
  }

  function addBelonging() {
    if (newBelonging.trim()) {
      setBelongings(prev => [...prev, newBelonging.trim()]);
      setNewBelonging('');
    }
  }

  function renderTypeIcon(item: (typeof SCHEDULE_TYPES)[number], color: string) {
    const size = 20;
    if (item.iconSet === 'ionicons')
      return <Ionicons name={item.icon as any} size={size} color={color} />;
    if (item.iconSet === 'fa5') return <FontAwesome5 name={item.icon} size={size} color={color} />;
    return <MaterialCommunityIcons name={item.icon as any} size={size} color={color} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (step === 'form') setStep('method');
            else router.back();
          }}
        >
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>予定を登録</Text>
        <TouchableOpacity onPress={step === 'form' ? handleSave : undefined}>
          <Text style={[styles.saveText, step !== 'form' && { opacity: 0.3 }]}>保存</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Registration method */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>登録方法</Text>
            <Ionicons name="help-circle-outline" size={17.5} color={C.textSecondary} />
          </View>
          <View style={styles.methodRow}>
            <TouchableOpacity
              style={[styles.methodCard, step === 'form' && styles.methodCardSelected]}
              onPress={() => setStep('form')}
            >
              <Ionicons name="calendar-outline" size={28} color={C.textPrimary} />
              <Text style={styles.methodText}>新しく登録</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.methodCard}>
              <MaterialCommunityIcons name="arrow-u-left-top" size={28} color={C.textPrimary} />
              <Text style={styles.methodText}>ルーティンで登録</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form (only visible after selecting method) */}
        {step === 'form' && (
          <>
            {/* Title */}
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>予定のタイトル</Text>
              <TextInput
                style={styles.formInput}
                placeholder="友達と一日遊ぶ日"
                placeholderTextColor={C.placeholder}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Memo */}
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>一言メモ</Text>
              <TextInput
                style={styles.formInput}
                placeholder="お店の予約をする！"
                placeholderTextColor={C.placeholder}
                value={memo}
                onChangeText={setMemo}
              />
            </View>

            {/* Schedule type */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>予定の種類</Text>
              <View style={styles.typeRow}>
                {SCHEDULE_TYPES.map(t => {
                  const isSelected = selectedType === t.label;
                  return (
                    <TouchableOpacity
                      key={t.label}
                      style={[styles.typeButton, isSelected && styles.typeButtonSelected]}
                      onPress={() => setSelectedType(t.label)}
                    >
                      {renderTypeIcon(t, isSelected ? C.white : C.textSecondary)}
                      <Text style={[styles.typeText, isSelected && styles.typeTextSelected]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Belongings */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>持ち物</Text>
              <View style={styles.belongingsCard}>
                {belongings.map((item, i) => (
                  <View key={`${item}-${i}`}>
                    <View style={styles.belongingRow}>
                      <Text style={styles.belongingText}>{item}</Text>
                      <TouchableOpacity onPress={() => removeBelonging(i)}>
                        <Ionicons name="remove-circle" size={22} color="#E57373" />
                      </TouchableOpacity>
                    </View>
                    {i < belongings.length - 1 && <View style={styles.belongingDivider} />}
                  </View>
                ))}
              </View>
              <View style={styles.addBelongingRow}>
                <TextInput
                  style={styles.addBelongingInput}
                  placeholder="持ち物を入力"
                  placeholderTextColor={C.placeholder}
                  value={newBelonging}
                  onChangeText={setNewBelonging}
                  onSubmitEditing={addBelonging}
                />
                <TouchableOpacity style={styles.addBelongingButton} onPress={addBelonging}>
                  <Ionicons name="add" size={16} color={C.primary} />
                  <Text style={styles.addBelongingButtonText}>持ち物を追加</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Departure */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>出発地</Text>
              <TouchableOpacity style={styles.departureCard}>
                <Ionicons name="location-outline" size={20} color={C.textSecondary} />
                <Text style={styles.departureText}>自宅</Text>
                <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={48} color={C.accent} />
            <Text style={styles.modalTitle}>予定を登録しました！</Text>
            <Text style={styles.modalDesc}>続けてスケジュールも作成しますか？</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => {
                  setShowModal(false);
                  router.back();
                }}
              >
                <Text style={styles.modalButtonSecondaryText}>閉じる</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => {
                  setShowModal(false);
                  // TODO: navigate to schedule creation
                }}
              >
                <Text style={styles.modalButtonPrimaryText}>スケジュール作成</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    height: 56,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 15.75, fontWeight: '700', color: C.textPrimary },
  saveText: { fontSize: 14, fontWeight: '700', color: C.primary },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: 14, paddingTop: 17.5, paddingBottom: 100, gap: 17.5 },

  // Section
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionLabel: { fontSize: 14, fontWeight: '500', color: C.textSecondary },

  // Method cards
  methodRow: { flexDirection: 'row', gap: 17.5 },
  methodCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 7,
    paddingVertical: 12.25,
    alignItems: 'center',
    gap: 7,
  },
  methodCardSelected: { borderWidth: 2, borderColor: C.primary },
  methodText: { fontSize: 14, fontWeight: '500', color: C.textPrimary },

  // Form card
  formCard: {
    backgroundColor: C.white,
    borderRadius: 7,
    padding: 14,
    gap: 8,
  },
  formLabel: { fontSize: 14, fontWeight: '500', color: C.textSecondary },
  formInput: { fontSize: 16, fontWeight: '500', color: C.textPrimary, paddingVertical: 4 },

  // Type selector
  typeRow: { flexDirection: 'row', gap: 10 },
  typeButton: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 7,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  typeButtonSelected: { backgroundColor: C.accent },
  typeText: { fontSize: 12.25, fontWeight: '500', color: C.textSecondary },
  typeTextSelected: { color: C.white },

  // Belongings
  belongingsCard: { backgroundColor: C.white, borderRadius: 7, padding: 14 },
  belongingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  belongingText: { fontSize: 14, fontWeight: '500', color: C.textPrimary },
  belongingDivider: { height: 1, backgroundColor: C.border },
  addBelongingRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addBelongingInput: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: C.textPrimary,
  },
  addBelongingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBelongingButtonText: { fontSize: 12.25, fontWeight: '500', color: C.primary },

  // Departure
  departureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 7,
    padding: 14,
    gap: 10,
  },
  departureText: { flex: 1, fontSize: 14, fontWeight: '500', color: C.textPrimary },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  modalContent: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  modalTitle: { fontSize: 17.5, fontWeight: '700', color: C.textPrimary },
  modalDesc: { fontSize: 14, fontWeight: '400', color: C.textSecondary, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  modalButtonSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 7,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonSecondaryText: { fontSize: 14, fontWeight: '700', color: C.textSecondary },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: 7,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonPrimaryText: { fontSize: 14, fontWeight: '700', color: C.white },
});
