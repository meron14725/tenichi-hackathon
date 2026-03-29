import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { Ionicons } from '@expo/vector-icons';
import MapAddressPicker from '@/components/map-address-picker';
import { userApi } from '@/api/userApi';
import { scheduleListApi } from '@/api/scheduleListApi';
import { categoryApi, CategoryResponse } from '@/api/categoryApi';
import { useAuth } from '@/contexts/AuthContext';
import { AppColors as C } from '@/constants/app-colors';
import { getCategoryTheme } from '@/utils/category-helper';
import { Image } from 'expo-image';

const tabCalendarOutline = require('@/assets/images/tab-calendar-outline.svg');
const checkCircleSolid = require('@/assets/images/check-circle-solid.svg');
const tabRoutine = require('@/assets/images/tab-routine.svg');

type Step = 'method' | 'form' | 'routine';

type Routine = {
  id: string;
  title: string;
  accentColor: string;
  steps: string[];
};

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
  const params = useLocalSearchParams<{ step?: string; date?: string }>();
  const { isAuthenticated } = useAuth();

  const [step, setStep] = useState<Step>((params.step as Step) || 'method');
  const [name, setName] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [belongings, setBelongings] = useState<string[]>([]);
  const [newBelonging, setNewBelonging] = useState<string>('');

  const [departureAddress, setDepartureAddress] = useState<string>('');
  const [departureName, setDepartureName] = useState<string>('自宅');
  const [departureLat, setDepartureLat] = useState<number | null>(null);
  const [departureLng, setDepartureLng] = useState<number | null>(null);

  const departurePinPosition =
    departureLat !== null && departureLng !== null
      ? { lat: departureLat, lng: departureLng }
      : null;

  const handleDepartureChange = useCallback(
    (lat: number, lng: number, address: string, name?: string) => {
      setDepartureLat(lat);
      setDepartureLng(lng);
      setDepartureAddress(address);
      if (name) setDepartureName(name);
    },
    []
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    async function initData() {
      try {
        const [settings, cats] = await Promise.all([
          userApi.getSettings(),
          categoryApi.getCategories(),
        ]);

        if (settings.home_address) {
          setDepartureAddress(settings.home_address);
          setDepartureName('自宅');
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
  }, [isAuthenticated]);

  const [showDepartureModal, setShowDepartureModal] = useState<boolean>(false);
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
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dateStr = params.date || todayStr;

      const result = await scheduleListApi.create({
        name: reqName,
        date: dateStr,
        category_id: selectedCategoryId,
        memo: reqMemo,
        departure_name: departureName || departureAddress || null,
        departure_lat: departureLat,
        departure_lng: departureLng,
        packing_items: reqPacking,
      });

      const actualTodayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dateStr === actualTodayStr) {
        router.replace('/(tabs)');
      } else {
        router.replace({
          pathname: '/schedule/list',
          params: { id: result.id.toString() },
        });
      }
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

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack}>
              <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>予定を登録</Text>
            <TouchableOpacity onPress={canSave && !isSaving ? handleSave : undefined}>
              <Text style={[styles.saveText, (!canSave || isSaving) && { opacity: 0.3 }]}>
                保存
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
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
                  activeOpacity={0.7}
                >
                  {step === 'form' && (
                    <View style={styles.methodCheckIconBg}>
                      <Image
                        source={checkCircleSolid}
                        style={styles.methodCheckIcon}
                        contentFit="contain"
                      />
                    </View>
                  )}
                  <Image
                    source={tabCalendarOutline}
                    style={{ width: 32, height: 32, tintColor: C.primary }}
                    contentFit="contain"
                  />
                  <Text
                    style={[
                      styles.methodText,
                      step === 'form' && { color: C.primary, fontWeight: '700' },
                    ]}
                  >
                    新しく登録
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    step === 'routine' && styles.methodCardRoutineSelected,
                  ]}
                  onPress={() => setStep('routine')}
                  activeOpacity={0.7}
                >
                  {step === 'routine' && (
                    <View style={styles.methodCheckIconBg}>
                      <Image
                        source={checkCircleSolid}
                        style={styles.methodCheckIcon}
                        contentFit="contain"
                      />
                    </View>
                  )}
                  <Image
                    source={tabRoutine}
                    style={{ width: 32, height: 32, tintColor: C.primary }}
                    contentFit="contain"
                  />
                  <Text
                    style={[
                      styles.methodText,
                      step === 'routine' && { color: C.primary, fontWeight: '700' },
                    ]}
                  >
                    ルーティンで登録
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* New registration form */}
            {step === 'form' && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>予定のタイトル</Text>
                  <View style={styles.inputCard}>
                    <TextInput
                      style={styles.formInput}
                      placeholder="友達と一日遊ぶ日"
                      placeholderTextColor={C.placeholder}
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>一言メモ</Text>
                  <View style={styles.memoCard}>
                    <TextInput
                      style={styles.memoInput}
                      placeholder="お店の予約をする！"
                      placeholderTextColor={C.placeholder}
                      value={memo}
                      onChangeText={setMemo}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>予定の種類</Text>
                  <View style={styles.typeRow}>
                    {categories.map(cat => {
                      const isSelected = selectedCategoryId === cat.id;
                      const theme = getCategoryTheme(cat.id);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.typeButton, isSelected && styles.typeButtonSelected]}
                          onPress={() => setSelectedCategoryId(cat.id)}
                          activeOpacity={0.7}
                        >
                          {isSelected && (
                            <View style={styles.typeCheckIconBg}>
                              <Image
                                source={checkCircleSolid}
                                style={styles.typeCheckIcon}
                                contentFit="contain"
                              />
                            </View>
                          )}
                          <Image
                            source={theme.icon}
                            style={{ width: 21, height: 21 }}
                            contentFit="contain"
                          />
                          <Text style={styles.typeText}>{cat.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>持ち物</Text>

                  {/* Added belongings list */}
                  {belongings.length > 0 && (
                    <View style={[styles.belongingsCard, { marginBottom: 10 }]}>
                      {belongings.map((item, i) => (
                        <View key={`belonging-${i}`}>
                          <View style={styles.belongingRow}>
                            <Text style={styles.belongingText}>{item}</Text>
                            <TouchableOpacity onPress={() => removeBelonging(i)}>
                              <Ionicons name="remove-circle" size={21} color={C.primary} />
                            </TouchableOpacity>
                          </View>
                          {i < belongings.length - 1 && (
                            <View style={styles.dashedDividerWrapper}>
                              {Array.from({ length: 60 }).map((_, d) => (
                                <View key={`dash-${d}`} style={styles.dash} />
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Input field (always visible) */}
                  <View style={styles.belongingsCard}>
                    <View style={styles.belongingRow}>
                      <TextInput
                        style={styles.belongingInput}
                        placeholder="例：財布"
                        placeholderTextColor={C.placeholder}
                        value={newBelonging}
                        onChangeText={setNewBelonging}
                        onSubmitEditing={addBelonging}
                        returnKeyType="done"
                      />
                    </View>
                  </View>
                  <View style={styles.addBelongingRow}>
                    <TouchableOpacity style={styles.addBelongingButton} onPress={addBelonging}>
                      <Ionicons name="add" size={16} color={C.primary} />
                      <Text style={styles.addBelongingButtonText}>持ち物を追加</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>出発地</Text>
                  <TouchableOpacity
                    style={styles.departureCard}
                    onPress={() => setShowDepartureModal(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="location-outline" size={20} color={C.textSecondary} />
                    <Text style={styles.departureText}>
                      {departureName || departureAddress || '自宅'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                  </TouchableOpacity>
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

                  {/* Added routine belongings list */}
                  {routineBelongings.length > 0 && (
                    <View style={[styles.belongingsCard, { marginBottom: 10 }]}>
                      {routineBelongings.map((item, i) => (
                        <View key={`rb-${i}`}>
                          <View style={styles.belongingRow}>
                            <Text style={styles.belongingText}>{item}</Text>
                            <TouchableOpacity
                              onPress={() =>
                                setRoutineBelongings(prev => prev.filter((_, idx) => idx !== i))
                              }
                            >
                              <Ionicons name="remove-circle" size={21} color={C.primary} />
                            </TouchableOpacity>
                          </View>
                          {i < routineBelongings.length - 1 && (
                            <View style={styles.dashedDividerWrapper}>
                              {Array.from({ length: 60 }).map((_, d) => (
                                <View key={`dash-${d}`} style={styles.dash} />
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Input field (always visible) */}
                  <View style={styles.belongingsCard}>
                    <View style={styles.belongingRow}>
                      <TextInput
                        style={styles.belongingInput}
                        placeholder="例：名刺"
                        placeholderTextColor={C.placeholder}
                        value={newRoutineBelonging}
                        onChangeText={setNewRoutineBelonging}
                        onSubmitEditing={addRoutineBelonging}
                        returnKeyType="done"
                      />
                    </View>
                  </View>
                  <View style={styles.addBelongingRow}>
                    <TouchableOpacity
                      style={styles.addBelongingButton}
                      onPress={addRoutineBelonging}
                    >
                      <Ionicons name="add" size={16} color={C.primary} />
                      <Text style={styles.addBelongingButtonText}>持ち物を追加</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

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

      {/* Departure Modal */}
      <Modal visible={showDepartureModal} animationType="slide" transparent>
        <View style={styles.departureModalContainer}>
          <View style={[styles.departureModalHeader, { paddingTop: Math.max(insets.top, 14) }]}>
            <TouchableOpacity onPress={() => setShowDepartureModal(false)} style={{ padding: 10 }}>
              <Text style={styles.departureModalCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.departureModalTitle}>出発地を設定</Text>
            <TouchableOpacity onPress={() => setShowDepartureModal(false)} style={{ padding: 10 }}>
              <Text style={styles.departureModalSaveText}>完了</Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={styles.sublabel}>
              住所を入力するとマップが移動します。ピンをタップで微調整できます。
            </Text>
          </View>
          <View style={styles.departureModalBody}>
            <MapAddressPicker
              pinPosition={departurePinPosition}
              onPinChange={handleDepartureChange}
              onNameChange={setDepartureName}
              pinName={departureName}
            />
          </View>
        </View>
      </Modal>
    </>
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
  methodCardSelected: { backgroundColor: '#E6EDF6', borderWidth: 1.5, borderColor: C.primary },
  methodCardRoutineSelected: {
    backgroundColor: '#E6EDF6',
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  methodText: { fontSize: 14, fontWeight: '500', color: C.textPrimary },
  methodCheckIconBg: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: C.white,
    borderRadius: 14,
  },
  methodCheckIcon: {
    width: 24,
    height: 24,
    tintColor: C.primary,
  },

  // Form card
  inputCard: {
    backgroundColor: C.white,
    borderRadius: 7,
    paddingHorizontal: 14,
    justifyContent: 'center',
    height: 48,
  },
  formInput: { fontSize: 14, fontWeight: '500', color: C.textPrimary },
  memoCard: {
    backgroundColor: C.white,
    borderRadius: 7,
    paddingHorizontal: 14,
    height: 80,
  },
  memoInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
    paddingTop: 12,
    paddingBottom: 12,
  },

  // Type selector
  typeRow: { flexDirection: 'row', gap: 8 },
  typeButton: {
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
  typeButtonSelected: { borderColor: C.primary },
  typeText: { fontSize: 12.5, fontWeight: '700', color: C.textSecondary },
  typeCheckIconBg: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: C.bg, // 背景色(C.bg)による「切り抜き」風のボーダー効果
    padding: 2,
    borderRadius: 10,
  },
  typeCheckIcon: {
    width: 16,
    height: 16,
    tintColor: C.primary,
  },

  // Belongings
  belongingsCard: {
    backgroundColor: C.white,
    borderRadius: 7,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 4,
  },
  belongingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  belongingText: { flex: 1, fontSize: 14, fontWeight: '500', color: C.textPrimary },
  belongingInput: { flex: 1, fontSize: 14, fontWeight: '500', color: C.textPrimary },
  dashedDividerWrapper: {
    flexDirection: 'row',
    width: '100%',
    overflow: 'hidden',
  },
  dash: {
    width: 6,
    height: 1,
    backgroundColor: '#B5BFC5',
    marginRight: 4,
  },
  addBelongingRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    marginRight: 4,
  },
  addBelongingButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBelongingButtonText: { fontSize: 13, fontWeight: '500', color: C.primary },

  // Departure
  sublabel: { fontSize: 12.25, fontWeight: '400', color: C.textSecondary, marginBottom: 4 },
  departureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 7,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  departureText: { flex: 1, fontSize: 14, fontWeight: '500', color: C.textPrimary },
  departureModalContainer: { flex: 1, backgroundColor: C.bg },
  departureModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    paddingHorizontal: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  departureModalCancelText: { fontSize: 15, color: C.textSecondary },
  departureModalSaveText: { fontSize: 15, fontWeight: '700', color: C.primary },
  departureModalTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  departureModalBody: { flex: 1 },

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
});
