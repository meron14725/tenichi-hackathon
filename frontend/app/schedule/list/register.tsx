import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import MapAddressPicker from '@/components/map-address-picker';
import { userApi } from '@/api/userApi';
import { scheduleListApi } from '@/api/scheduleListApi';
import { categoryApi, CategoryResponse } from '@/api/categoryApi';

const C = {
  primary: '#436F9B',
  accent: '#6E8F8A',
  holidayAccent: '#A86A78',
  bg: '#EEF0F1',
  white: '#FFFFFF',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  textMuted: '#B5BFC5',
  black: '#000000',
  border: '#EEF0F1',
  placeholder: '#98A6AE',
  searchBg: '#EEF0F1',
  stepConnector: '#C2A070',
};

type Step = 'method' | 'form' | 'routine';

type Routine = {
  id: string;
  title: string;
  accentColor: string;
  steps: string[];
};

const CATEGORY_ICON_MAP: Record<string, { icon: string; iconSet: 'ionicons' | 'fa5' | 'mci' }> = {
  休日: { icon: 'bicycle', iconSet: 'ionicons' },
  旅行: { icon: 'suitcase-rolling', iconSet: 'fa5' },
  仕事: { icon: 'briefcase-outline', iconSet: 'mci' },
  出張: { icon: 'briefcase', iconSet: 'fa5' },
};

function getCategoryIcon(name: string) {
  return CATEGORY_ICON_MAP[name] || { icon: 'bookmark-outline', iconSet: 'ionicons' };
}

const CATEGORY_COLORS: Record<number, string> = {
  4: '#D1AEB6',
  5: '#D6C093',
  6: '#C1D3D0',
  7: '#9284C2',
};

function getCategoryColor(id: number) {
  return CATEGORY_COLORS[id] || C.accent;
}

const ROUTINES: Routine[] = [
  {
    id: '1',
    title: '仕事ルーティン①',
    accentColor: C.accent,
    steps: ['荻窪発', '渋谷着', 'MTG'],
  },
  {
    id: '2',
    title: '仕事ルーティン②',
    accentColor: C.accent,
    steps: ['荻窪発', '渋谷着', 'MTG'],
  },
  { id: '3', title: '休日①', accentColor: C.holidayAccent, steps: ['荻窪発', '渋谷着', 'MTG'] },
];

function RoutinePickerModal({
  visible,
  routines,
  selectedId,
  onSelect,
  onClose,
  bottomInset,
}: {
  visible: boolean;
  routines: Routine[];
  selectedId: string;
  onSelect: (r: Routine) => void;
  onClose: () => void;
  bottomInset: number;
}) {
  const safeBottom = Math.max(bottomInset, 20);
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(600);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  function handleClose() {
    Animated.timing(slideAnim, {
      toValue: 600,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  }

  if (!visible) return null;

  return (
    <Modal visible transparent statusBarTranslucent>
      <Pressable style={pickerStyles.backdrop} onPress={handleClose}>
        <Pressable onPress={e => e.stopPropagation()} style={pickerStyles.cardWrap}>
          <Animated.View style={[pickerStyles.card, { transform: [{ translateY: slideAnim }] }]}>
            {/* Header */}
            <View style={pickerStyles.header}>
              <View style={pickerStyles.headerAccent} />
              <Text style={pickerStyles.title}>ルーティンを選択</Text>
              <Text style={pickerStyles.subtitle}>予定に適用するルーティンを選んでください</Text>
            </View>

            {/* Routine list */}
            <View style={pickerStyles.list}>
              {routines.map(routine => {
                const isSelected = selectedId === routine.id;
                return (
                  <TouchableOpacity
                    key={routine.id}
                    style={[pickerStyles.routineItem, isSelected && pickerStyles.routineItemActive]}
                    onPress={() => {
                      onSelect(routine);
                      handleClose();
                    }}
                    activeOpacity={0.65}
                  >
                    <View
                      style={[
                        pickerStyles.routineAccentBar,
                        { backgroundColor: routine.accentColor },
                      ]}
                    />
                    <View style={pickerStyles.routineBody}>
                      <View style={pickerStyles.routineTitleRow}>
                        <Text
                          style={[pickerStyles.routineTitle, isSelected && { color: C.primary }]}
                        >
                          {routine.title}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color={C.primary} />
                        )}
                      </View>
                      <View style={pickerStyles.stepsRow}>
                        {routine.steps.map((s: string, i: number) => (
                          <React.Fragment key={`${routine.id}-step-${i}`}>
                            <View
                              style={[
                                pickerStyles.stepChip,
                                {
                                  backgroundColor: isSelected
                                    ? `${routine.accentColor}18`
                                    : '#F5F6F7',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  pickerStyles.stepChipText,
                                  isSelected && { color: routine.accentColor },
                                ]}
                              >
                                {s}
                              </Text>
                            </View>
                            {i < routine.steps.length - 1 && (
                              <Ionicons
                                name="arrow-forward"
                                size={11}
                                color={C.textMuted}
                                style={{ marginHorizontal: 2 }}
                              />
                            )}
                          </React.Fragment>
                        ))}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Close */}
            <TouchableOpacity
              style={[pickerStyles.closeButton, { paddingBottom: 20 + safeBottom }]}
              onPress={handleClose}
            >
              <Text style={pickerStyles.closeText}>キャンセル</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 30, 0.55)',
    justifyContent: 'flex-end',
  },
  cardWrap: {
    maxHeight: '80%',
    width: '100%',
  },
  card: {
    backgroundColor: C.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#0F171E',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
  },
  headerAccent: {
    width: 32,
    height: 3,
    backgroundColor: C.primary,
    borderRadius: 2,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: C.textSecondary,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 4,
    gap: 6,
  },
  routineItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    overflow: 'hidden',
  },
  routineItemActive: {
    backgroundColor: '#EDF2F8',
    borderWidth: 1.5,
    borderColor: `${C.primary}40`,
  },
  routineAccentBar: {
    width: 4,
    borderRadius: 2,
    marginVertical: 8,
    marginLeft: 4,
  },
  routineBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  routineTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  stepChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  stepChipText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: C.textSecondary,
  },
  closeButton: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 34,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8EAEC',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textSecondary,
  },
});

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string }>();

  const [step, setStep] = useState<Step>((params.step as Step) || 'method');
  const [name, setName] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [belongings, setBelongings] = useState<string[]>([]);
  const [newBelonging, setNewBelonging] = useState<string>('');

  const [departureAddress, setDepartureAddress] = useState<string>('');
  const [departureLat, setDepartureLat] = useState<number | null>(null);
  const [departureLng, setDepartureLng] = useState<number | null>(null);

  const departurePinPosition =
    departureLat !== null && departureLng !== null
      ? { lat: departureLat, lng: departureLng }
      : null;

  const handleDepartureChange = useCallback((lat: number, lng: number, address: string) => {
    setDepartureLat(lat);
    setDepartureLng(lng);
    setDepartureAddress(address);
  }, []);

  useEffect(() => {
    async function initData() {
      try {
        const [settings, cats] = await Promise.all([
          userApi.getSettings(),
          categoryApi.getCategories(),
        ]);

        if (settings.home_address) {
          setDepartureAddress(settings.home_address);
          setDepartureLat(settings.home_lat);
          setDepartureLng(settings.home_lon);
        }

        setCategories(cats);
        if (cats.length > 0) {
          setSelectedCategoryId(cats[0].id);
        }
      } catch (e) {
        console.error('initData failed:', e);
      }
    }
    initData();
  }, []);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine>(ROUTINES[0]);
  const [showRoutinePicker, setShowRoutinePicker] = useState<boolean>(false);
  const [routineBelongings, setRoutineBelongings] = useState<string[]>([]);
  const [newRoutineBelonging, setNewRoutineBelonging] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      let reqName = '';
      let reqMemo: string | null = null;
      let reqPacking: { name: string; sort_order: number }[] = [];

      if (step === 'form') {
        reqName = name || '無題の予定';
        reqMemo = memo || null;
        reqPacking = belongings
          .filter(n => n.trim() !== '')
          .map((n, index) => ({ name: n.trim(), sort_order: index }));
      } else if (step === 'routine') {
        reqName = selectedRoutine.title;
        reqPacking = routineBelongings
          .filter(n => n.trim() !== '')
          .map((n, index) => ({ name: n.trim(), sort_order: index }));
      }

      const d = new Date();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      await scheduleListApi.create({
        name: reqName,
        date: dateStr,
        category_id: selectedCategoryId,
        memo: reqMemo,
        departure_name: departureAddress || null,
        departure_lat: departureLat,
        departure_lng: departureLng,
        packing_items: reqPacking,
      });

      setShowModal(true);
    } catch (e) {
      console.error('Failed to create schedule-list:', e);
    } finally {
      setIsSaving(false);
    }
  }

  function addRoutineBelonging() {
    if (newRoutineBelonging.trim()) {
      setRoutineBelongings(prev => [...prev, newRoutineBelonging.trim()]);
      setNewRoutineBelonging('');
    }
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

  function handleBack() {
    if (params.step) {
      router.back();
    } else if (step === 'form' || step === 'routine') {
      setStep('method');
      setSelectedRoutine(ROUTINES[0]);
    } else {
      router.back();
    }
  }

  const canSave = step === 'form' || step === 'routine';

  function moveBelonging(index: number, direction: 'up' | 'down') {
    setBelongings(prev => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function moveRoutineBelonging(index: number, direction: 'up' | 'down') {
    setRoutineBelongings(prev => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function renderCategoryIcon(
    iconInfo: { icon: string; iconSet: 'ionicons' | 'fa5' | 'mci' },
    color: string
  ) {
    const size = 20;
    if (iconInfo.iconSet === 'ionicons')
      return <Ionicons name={iconInfo.icon as any} size={size} color={color} />;
    if (iconInfo.iconSet === 'fa5')
      return <FontAwesome5 name={iconInfo.icon} size={size} color={color} />;
    return <MaterialCommunityIcons name={iconInfo.icon as any} size={size} color={color} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>予定を登録</Text>
        <TouchableOpacity onPress={canSave && !isSaving ? handleSave : undefined}>
          <Text style={[styles.saveText, (!canSave || isSaving) && { opacity: 0.3 }]}>保存</Text>
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
            <TouchableOpacity
              style={[styles.methodCard, step === 'routine' && styles.methodCardRoutineSelected]}
              onPress={() => setStep('routine')}
            >
              <MaterialCommunityIcons
                name="arrow-u-left-top"
                size={28}
                color={step === 'routine' ? C.textPrimary : C.textPrimary}
              />
              <Text style={[styles.methodText, step === 'routine' && { fontWeight: '700' }]}>
                ルーティンで登録
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* New registration form */}
        {step === 'form' && (
          <>
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>予定のタイトル</Text>
              <TextInput
                style={styles.formInput}
                placeholder="友達と一日遊ぶ日"
                placeholderTextColor={C.placeholder}
                value={name}
                onChangeText={setName}
              />
            </View>

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

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>予定の種類</Text>
              <View style={styles.typeRow}>
                {categories.map(cat => {
                  const isSelected = selectedCategoryId === cat.id;
                  const iconInfo = getCategoryIcon(cat.name);
                  const catColor = getCategoryColor(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.typeButton,
                        isSelected && { backgroundColor: catColor, borderColor: catColor },
                      ]}
                      onPress={() => setSelectedCategoryId(cat.id)}
                    >
                      {renderCategoryIcon(iconInfo, isSelected ? C.white : catColor)}
                      <Text style={[styles.typeText, isSelected && styles.typeTextSelected]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>持ち物</Text>
              <View style={styles.belongingsCard}>
                {belongings.map((item, i) => (
                  <View key={`${item}-${i}`}>
                    <View style={styles.belongingRow}>
                      <View style={styles.reorderButtons}>
                        <TouchableOpacity
                          onPress={() => moveBelonging(i, 'up')}
                          disabled={i === 0}
                          style={{ opacity: i === 0 ? 0.25 : 1 }}
                        >
                          <Ionicons name="chevron-up" size={18} color={C.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => moveBelonging(i, 'down')}
                          disabled={i === belongings.length - 1}
                          style={{ opacity: i === belongings.length - 1 ? 0.25 : 1 }}
                        >
                          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
                        </TouchableOpacity>
                      </View>
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

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>出発地</Text>
              <Text style={styles.sublabel}>
                住所を入力するとマップが移動します。ピンをタップで微調整できます。
              </Text>
              <View style={styles.mapWrapper}>
                <MapAddressPicker
                  pinPosition={departurePinPosition}
                  onPinChange={handleDepartureChange}
                />
              </View>
              {departureAddress ? (
                <View style={styles.selectedAddressRow}>
                  <Ionicons name="location" size={16} color={C.primary} />
                  <Text style={styles.selectedAddressText} numberOfLines={2}>
                    {departureAddress}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        )}

        {/* Routine registration */}
        {step === 'routine' && (
          <>
            {/* Selected routine */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ルーティン</Text>
              <TouchableOpacity
                style={styles.selectedRoutineCard}
                onPress={() => setShowRoutinePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.selectedRoutineInner}>
                  <View style={styles.selectedRoutineRow}>
                    <Ionicons name="briefcase-outline" size={21} color={C.accent} />
                    <Text style={styles.selectedRoutineTitle}>{selectedRoutine.title}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={21} color={C.textMuted} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Belongings for routine */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>持ち物</Text>
              <View style={styles.belongingsCard}>
                {routineBelongings.map((item, i) => (
                  <View key={`rb-${i}`}>
                    <View style={styles.belongingRow}>
                      <View style={styles.reorderButtons}>
                        <TouchableOpacity
                          onPress={() => moveRoutineBelonging(i, 'up')}
                          disabled={i === 0}
                          style={{ opacity: i === 0 ? 0.25 : 1 }}
                        >
                          <Ionicons name="chevron-up" size={18} color={C.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => moveRoutineBelonging(i, 'down')}
                          disabled={i === routineBelongings.length - 1}
                          style={{ opacity: i === routineBelongings.length - 1 ? 0.25 : 1 }}
                        >
                          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.belongingText}>{item}</Text>
                      <TouchableOpacity
                        onPress={() =>
                          setRoutineBelongings(prev => prev.filter((_, idx) => idx !== i))
                        }
                      >
                        <Ionicons name="remove-circle" size={22} color="#E57373" />
                      </TouchableOpacity>
                    </View>
                    {i < routineBelongings.length - 1 && <View style={styles.belongingDivider} />}
                  </View>
                ))}
              </View>
              <View style={styles.addBelongingRow}>
                <TextInput
                  style={styles.addBelongingInput}
                  placeholder="例：名刺"
                  placeholderTextColor={C.placeholder}
                  value={newRoutineBelonging}
                  onChangeText={setNewRoutineBelonging}
                  onSubmitEditing={addRoutineBelonging}
                />
                <TouchableOpacity style={styles.addBelongingButton} onPress={addRoutineBelonging}>
                  <Ionicons name="add" size={16} color={C.primary} />
                  <Text style={styles.addBelongingButtonText}>持ち物を追加</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Routine Picker Modal */}
      <RoutinePickerModal
        visible={showRoutinePicker}
        routines={ROUTINES}
        selectedId={selectedRoutine.id}
        onSelect={routine => {
          setSelectedRoutine(routine);
        }}
        onClose={() => setShowRoutinePicker(false)}
        bottomInset={insets.bottom}
      />

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
                  router.push('/schedule/unit/create');
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
  methodCardRoutineSelected: { backgroundColor: '#E6EDF6', borderWidth: 1, borderColor: C.primary },
  methodText: { fontSize: 14, fontWeight: '500', color: C.textPrimary },

  // Form card
  formCard: { backgroundColor: C.white, borderRadius: 7, padding: 14, gap: 8 },
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
  belongingsCard: { backgroundColor: C.white, borderRadius: 7, paddingHorizontal: 14 },
  belongingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  reorderButtons: {
    alignItems: 'center',
    gap: 0,
  },
  belongingText: { flex: 1, fontSize: 14, fontWeight: '500', color: C.textPrimary },
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
  addBelongingButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBelongingButtonText: { fontSize: 12.25, fontWeight: '500', color: C.primary },

  // Departure map
  sublabel: { fontSize: 12.25, fontWeight: '400', color: C.textSecondary, marginBottom: 4 },
  mapWrapper: { height: 200, borderRadius: 7, overflow: 'hidden', backgroundColor: C.border },
  selectedAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.white,
    padding: 12.25,
    borderRadius: 7,
  },
  selectedAddressText: { flex: 1, fontSize: 14, fontWeight: '500', color: C.textPrimary },
  departureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 7,
    padding: 14,
    gap: 10,
  },
  departureText: { flex: 1, fontSize: 14, fontWeight: '500', color: C.textPrimary },

  // Selected routine card
  selectedRoutineCard: {
    backgroundColor: C.white,
    borderRadius: 10.5,
    overflow: 'hidden',
  },
  selectedRoutineInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  selectedRoutineRow: { flexDirection: 'row', alignItems: 'center', gap: 10.5, flex: 1 },
  selectedRoutineTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },

  // (routine picker styles are in pickerStyles above)

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
