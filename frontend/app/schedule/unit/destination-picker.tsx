import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';

const C = {
  primary: '#436F9B',
  bg: '#EEF0F1',
  white: '#FFFFFF',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  textMuted: '#B5BFC5',
  placeholder: '#98A6AE',
  border: '#EEF0F1',
};

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Tokyo default center
const DEFAULT_CENTER = { lat: 35.6762, lng: 139.6503 };

interface SelectedPlace {
  lat: number;
  lng: number;
  name: string;
}

function PlacesAutocomplete({ onSelect }: { onSelect: (place: SelectedPlace) => void }) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showResults, setShowResults] = useState(false);
  const placesLib = useMapsLibrary('places');
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const map = useMap();

  useEffect(() => {
    if (!placesLib) return;
    autocompleteService.current = new placesLib.AutocompleteService();
    if (map) {
      placesService.current = new placesLib.PlacesService(map);
    }
  }, [placesLib, map]);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (!text.trim() || !autocompleteService.current) {
      setPredictions([]);
      setShowResults(false);
      return;
    }

    autocompleteService.current.getPlacePredictions(
      {
        input: text,
        componentRestrictions: { country: 'jp' },
      },
      results => {
        setPredictions(results || []);
        setShowResults(true);
      }
    );
  }, []);

  const handleSelectPrediction = useCallback(
    (prediction: google.maps.places.AutocompletePrediction) => {
      if (!placesService.current) return;

      placesService.current.getDetails(
        { placeId: prediction.place_id, fields: ['geometry', 'name'] },
        place => {
          if (place?.geometry?.location) {
            onSelect({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              name: prediction.structured_formatting.main_text,
            });
            setQuery(prediction.structured_formatting.main_text);
            setShowResults(false);
          }
        }
      );
    },
    [onSelect]
  );

  return (
    <View style={autocompleteStyles.container}>
      <View style={autocompleteStyles.inputRow}>
        <Ionicons name="search" size={21} color={C.placeholder} />
        <TextInput
          style={autocompleteStyles.input}
          placeholder="目的地を入力"
          placeholderTextColor={C.placeholder}
          value={query}
          onChangeText={handleSearch}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setPredictions([]);
              setShowResults(false);
            }}
          >
            <Ionicons name="close-circle" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {showResults && predictions.length > 0 && (
        <FlatList
          style={autocompleteStyles.resultsList}
          data={predictions}
          keyExtractor={item => item.place_id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={autocompleteStyles.resultItem}
              onPress={() => handleSelectPrediction(item)}
            >
              <Ionicons name="location-outline" size={18} color={C.textSecondary} />
              <View style={autocompleteStyles.resultTextContainer}>
                <Text style={autocompleteStyles.resultMain}>
                  {item.structured_formatting.main_text}
                </Text>
                <Text style={autocompleteStyles.resultSecondary} numberOfLines={1}>
                  {item.structured_formatting.secondary_text}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const autocompleteStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 7,
    paddingHorizontal: 10,
    height: 42,
    marginHorizontal: 14,
    marginTop: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: C.textPrimary,
  },
  resultsList: {
    backgroundColor: C.white,
    marginHorizontal: 14,
    borderRadius: 7,
    maxHeight: 250,
    marginTop: 4,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      },
    }),
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultMain: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
  },
  resultSecondary: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 2,
  },
});

function MapContent({
  selected,
  onSelect,
}: {
  selected: SelectedPlace | null;
  onSelect: (place: SelectedPlace) => void;
}) {
  const map = useMap();
  const geocodingLib = useMapsLibrary('geocoding');
  const geocoder = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (geocodingLib) {
      geocoder.current = new geocodingLib.Geocoder();
    }
  }, [geocodingLib]);

  useEffect(() => {
    if (map && selected) {
      map.panTo({ lat: selected.lat, lng: selected.lng });
      map.setZoom(15);
    }
  }, [map, selected]);

  const handleMapClick = useCallback(
    (e: any) => {
      const latLng = e.detail?.latLng;
      if (!latLng) return;

      const lat = latLng.lat;
      const lng = latLng.lng;

      if (geocoder.current) {
        geocoder.current.geocode({ location: { lat, lng } }, (results, status) => {
          const name =
            status === 'OK' && results?.[0]
              ? results[0].formatted_address
              : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          onSelect({ lat, lng, name });
        });
      } else {
        onSelect({ lat, lng, name: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      }
    },
    [onSelect]
  );

  return (
    <>
      <Map
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI={true}
        onClick={handleMapClick as any}
        style={{ width: '100%', height: '100%' }}
        mapId="destination-picker-map"
      />
      {selected && <AdvancedMarker position={{ lat: selected.lat, lng: selected.lng }} />}
    </>
  );
}

export default function DestinationPickerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [selected, setSelected] = useState<SelectedPlace | null>(null);

  const handleConfirm = () => {
    if (!selected) return;

    if (returnTo === 'auth/register') {
      router.navigate({
        pathname: '/auth/register',
        params: {
          home_lat: String(selected.lat),
          home_lon: String(selected.lng),
          home_address: selected.name,
        },
      });
    } else {
      router.navigate({
        pathname: '/schedule/unit/create',
        params: {
          destination_lat: String(selected.lat),
          destination_lon: String(selected.lng),
          destination_name: selected.name,
        },
      });
    }
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelText}>キャンセル</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.noKeyContainer}>
          <Ionicons name="map-outline" size={48} color={C.textMuted} />
          <Text style={styles.noKeyText}>Google Maps APIキーが設定されていません</Text>
          <Text style={styles.noKeySubtext}>
            EXPO_PUBLIC_GOOGLE_MAPS_API_KEY を設定してください
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>キャンセル</Text>
        </TouchableOpacity>
      </View>

      {/* Map + Search */}
      <View style={styles.mapContainer}>
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <MapContent selected={selected} onSelect={setSelected} />
          <PlacesAutocomplete onSelect={setSelected} />
        </APIProvider>
      </View>

      {/* Bottom confirmation */}
      {selected && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.selectedInfo}>
            <Ionicons name="location" size={20} color={C.primary} />
            <Text style={styles.selectedName} numberOfLines={1}>
              {selected.name}
            </Text>
          </View>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>決定</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cancelText: {
    fontSize: 12.25,
    fontWeight: '500',
    color: C.primary,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  bottomBar: {
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 12,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
  },
  confirmButton: {
    backgroundColor: C.primary,
    borderRadius: 7,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
  },
  noKeyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 40,
  },
  noKeyText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
  },
  noKeySubtext: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: 'center',
  },
});
