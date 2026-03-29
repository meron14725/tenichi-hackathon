import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import MapAddressPicker from '@/components/map-address-picker';
import { scheduleListApi } from '@/api/scheduleListApi';
import { categoryApi, CategoryResponse } from '@/api/categoryApi';
import { useAuth } from '@/contexts/AuthContext';
import { AppColors as C } from '@/constants/app-colors';
import { getCategoryIcon, getCategoryColor, CategoryIconInfo } from '@/utils/category-helper';

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

  function moveBelonging(index: number, direction: 'up' | 'down') {
    setBelongings(prev => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingCenter]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  function renderCategoryIcon(iconInfo: CategoryIconInfo, color: string) {
    const size = 20;
    if (iconInfo.iconSet === 'ionicons')
      return <Ionicons name={iconInfo.icon as any} size={size} color={color} />;
    if (iconInfo.iconSet === 'fa5')
      return <FontAwesome5 name={iconInfo.icon} size={size} color={color} />;
    return <MaterialCommunityIcons name={iconInfo.icon as any} size={size} color={color} />;
  }

  return (
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
                <View key={`${item.id || item.name}-${i}`}>
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
                    <Text style={styles.belongingText}>{item.name}</Text>
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
                onNameChange={setDepartureName}
                pinName={departureName}
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
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingCenter: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8EAEC',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  saveText: { fontSize: 16, fontWeight: '700', color: C.primary },
  scrollView: { flex: 1 },
  scrollContent: { paddingVertical: 16, paddingHorizontal: 16, gap: 16 },
  formCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  formLabel: { fontSize: 13, fontWeight: '500', color: C.textSecondary },
  formInput: { fontSize: 15, fontWeight: '600', color: C.textPrimary, paddingVertical: 4 },
  section: { gap: 10 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginLeft: 4 },
  sublabel: { fontSize: 12, color: C.textSecondary, marginLeft: 4, marginTop: -4, lineHeight: 18 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: '#E8EAEC',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  typeText: { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  typeTextSelected: { color: C.white },
  belongingsCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  belongingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  reorderButtons: { gap: 4 },
  belongingText: { flex: 1, fontSize: 14, fontWeight: '500', color: C.textPrimary },
  belongingDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E8EAEC' },
  addBelongingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 12,
    marginTop: 4,
  },
  addBelongingInput: { flex: 1, fontSize: 14, color: C.textPrimary },
  addBelongingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${C.primary}10`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBelongingButtonText: { fontSize: 12, fontWeight: '700', color: C.primary },
  mapWrapper: {
    backgroundColor: C.white,
    borderRadius: 12,
    height: 300,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EAEC',
  },
  selectedAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${C.primary}08`,
    padding: 12,
    borderRadius: 10,
  },
  selectedAddressText: { fontSize: 13, color: C.textPrimary, flex: 1, lineHeight: 18 },
});
