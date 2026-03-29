import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import MapAddressPicker from '@/components/map-address-picker';
import { scheduleListApi } from '@/api/scheduleListApi';
import { categoryApi, CategoryResponse } from '@/api/categoryApi';
import { useAuth } from '@/contexts/AuthContext';
import { AppColors as C } from '@/constants/app-colors';
import { getCategoryTheme } from '@/utils/category-helper';

const checkCircleSolid = require('@/assets/images/check-circle-solid.svg');

export default function EditListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const listId = Number(params.id);
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [name, setName] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [belongings, setBelongings] = useState<{ id?: number; name: string }[]>([]);
  const [newBelonging, setNewBelonging] = useState<string>('');

  const [departureAddress, setDepartureAddress] = useState<string>('');
  const [departureName, setDepartureName] = useState<string>('');
  const [departureLat, setDepartureLat] = useState<number | null>(null);
  const [departureLng, setDepartureLng] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showDepartureModal, setShowDepartureModal] = useState<boolean>(false);

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

    async function fetchData() {
      try {
        setLoading(true);
        const [cats, listData] = await Promise.all([
          categoryApi.getCategories(),
          scheduleListApi.getById(listId),
        ]);

        setCategories(cats);
        setName(listData.name);
        setMemo(listData.memo || '');
        setSelectedCategoryId(listData.category?.id || null);
        setBelongings(listData.packing_items.map(i => ({ id: i.id, name: i.name })));
        setDepartureName(listData.departure_name || '');
        setDepartureLat(listData.departure_lat);
        setDepartureLng(listData.departure_lng);
        setDepartureAddress(listData.departure_name || '');
      } catch (e) {
        console.error('fetchData failed:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [isAuthenticated, listId]);

  async function handleSave() {
    setIsSaving(true);
    try {
      const reqPacking = belongings
        .filter(n => n.name.trim() !== '')
        .map((n, index) => ({ name: n.name.trim(), sort_order: index }));

      await scheduleListApi.update(listId, {
        name: name || '無題の予定',
        category_id: selectedCategoryId,
        memo: memo || null,
        departure_name: departureName || departureAddress || null,
        departure_lat: departureLat,
        departure_lng: departureLng,
        packing_items: reqPacking,
      });

      router.back();
    } catch (e) {
      console.error('Failed to update schedule-list:', e);
    } finally {
      setIsSaving(false);
    }
  }

  async function removeBelonging(index: number) {
    const item = belongings[index];
    if (item && item.id) {
      try {
        await scheduleListApi.deletePackingItem(listId, item.id);
      } catch (e) {
        console.error('Failed to delete packing item:', e);
      }
    }
    setBelongings(prev => prev.filter((_, i) => i !== index));
  }

  async function addBelonging() {
    const itemName = newBelonging.trim();
    if (itemName) {
      const newOrder = belongings.length;
      setBelongings(prev => [...prev, { name: itemName }]);
      setNewBelonging('');

      try {
        const createdItem = await scheduleListApi.addPackingItem(listId, {
          name: itemName,
          sort_order: newOrder,
        });

        setBelongings(prev =>
          prev.map((b, i) =>
            i === newOrder && !b.id && b.name === itemName ? { ...b, id: createdItem.id } : b
          )
        );
      } catch (e) {
        console.error('Failed to add packing item:', e);
      }
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingCenter]}>
        <ActivityIndicator color={C.primary} size="large" />
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>予定を編集</Text>
            <TouchableOpacity onPress={!isSaving ? handleSave : undefined}>
              <Text style={[styles.saveText, isSaving && { opacity: 0.3 }]}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
                    <View key={`belonging-${item.id || i}`}>
                      <View style={styles.belongingRow}>
                        <Text style={styles.belongingText}>{item.name}</Text>
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
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

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
  loadingCenter: { justifyContent: 'center', alignItems: 'center' },
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
    borderRadius: 12,
  },
  typeCheckIcon: {
    width: 20,
    height: 20,
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
});
