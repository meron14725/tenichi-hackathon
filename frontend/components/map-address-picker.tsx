import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  primary: '#436F9B',
  white: '#FFFFFF',
  textSecondary: '#63747E',
  textMuted: '#B5BFC5',
  placeholder: '#98A6AE',
};

const DEFAULT_CENTER = { lat: 35.6762, lng: 139.6503 };
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// ==================================================================
// Props 型定義
// ==================================================================
type MapAddressPickerProps = {
  pinPosition: { lat: number; lng: number } | null;
  onPinChange: (lat: number, lng: number, address: string, name?: string) => void;
  pinName?: string;
};

// ==================================================================
// Web 向け実装 (@vis.gl/react-google-maps)
// ==================================================================
let WebMapAddressPicker: React.ComponentType<MapAddressPickerProps> | null = null;

if (Platform.OS === 'web') {
  // Web 環境でのみ @vis.gl/react-google-maps を読み込む
  // （ネイティブ環境では <div> が存在しないためクラッシュする）
  const {
    APIProvider,
    Map,
    AdvancedMarker,
    useMap,
    useMapsLibrary,
  } = require('@vis.gl/react-google-maps'); // eslint-disable-line

  const GeocoderContext = React.createContext<google.maps.Geocoder | null>(null);

  function GeocoderProvider({ children }: { children: React.ReactNode }) {
    const geocodingLib = useMapsLibrary('geocoding');
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);
    const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);

    useEffect(() => {
      if (geocodingLib && !geocoderRef.current) {
        geocoderRef.current = new geocodingLib.Geocoder();
        setGeocoder(geocoderRef.current);
      }
    }, [geocodingLib]);

    return <GeocoderContext.Provider value={geocoder}>{children}</GeocoderContext.Provider>;
  }

  function useSharedGeocoder() {
    return React.useContext(GeocoderContext);
  }

  function MapContent({ pinPosition, onPinChange }: MapAddressPickerProps) {
    const map = useMap();
    const geocoder = useSharedGeocoder();

    useEffect(() => {
      if (map && pinPosition) {
        map.panTo(pinPosition);
        map.setZoom(16);
      }
    }, [map, pinPosition]);

    const handleMapClick = useCallback(
      (e: any) => {
        const latLng = e.detail?.latLng;
        if (!latLng) return;
        const lat = latLng.lat;
        const lng = latLng.lng;

        if (geocoder) {
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            const name =
              status === 'OK' && results?.[0]
                ? results[0].formatted_address
                : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            onPinChange(lat, lng, name);
          });
        } else {
          onPinChange(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      },
      [geocoder, onPinChange]
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
          mapId="register-address-map"
        />
        {pinPosition && <AdvancedMarker position={pinPosition} />}
      </>
    );
  }

  function AddressGeocoder({
    onGeocode,
  }: {
    onGeocode: (lat: number, lng: number, address: string) => void;
  }) {
    const [query, setQuery] = useState('');
    const geocoder = useSharedGeocoder();
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleChangeText = useCallback(
      (text: string) => {
        setQuery(text);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (!text.trim() || !geocoder) return;

        debounceTimer.current = setTimeout(() => {
          geocoder?.geocode({ address: text, region: 'jp' }, (results, status) => {
            if (status === 'OK' && results?.[0]?.geometry?.location) {
              const loc = results[0].geometry.location;
              onGeocode(loc.lat(), loc.lng(), results[0].formatted_address);
            }
          });
        }, 800);
      },
      [geocoder, onGeocode]
    );

    return (
      <View style={webGeocoderStyles.container}>
        <Ionicons name="search" size={18} color={C.placeholder} />
        <TextInput
          style={webGeocoderStyles.input}
          placeholder="住所を入力してマップを移動"
          placeholderTextColor={C.placeholder}
          value={query}
          onChangeText={handleChangeText}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const webGeocoderStyles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 8,
      left: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.white,
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 40,
      gap: 8,
      ...Platform.select({
        web: { boxShadow: '0 2px 6px rgba(0,0,0,0.15)' },
      }),
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: '#1F2528',
      height: '100%',
    },
  });

  WebMapAddressPicker = function WebMap({ pinPosition, onPinChange }: MapAddressPickerProps) {
    return (
      <View style={{ width: '100%', height: '100%' }}>
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <GeocoderProvider>
            <MapContent pinPosition={pinPosition} onPinChange={onPinChange} />
            <AddressGeocoder onGeocode={onPinChange} />
          </GeocoderProvider>
        </APIProvider>
      </View>
    );
  };
}

// ==================================================================
// ネイティブ (iOS/Android) 向け実装 (react-native-webview)
// WebView に Google Maps の HTML を埋め込んで表示する
// ==================================================================
let NativeMapAddressPicker: React.ComponentType<MapAddressPickerProps> | null = null;

if (Platform.OS !== 'web') {
  const { WebView } = require('react-native-webview'); // eslint-disable-line

  NativeMapAddressPicker = function NativeMap({
    pinPosition,
    onPinChange,
    pinName,
  }: MapAddressPickerProps) {
    const webViewRef = useRef<any>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // ピン位置が変わったら WebView 内のマップを更新
    useEffect(() => {
      if (webViewRef.current && pinPosition) {
        webViewRef.current.injectJavaScript(`
          if (window.updatePin) {
            window.updatePin(${pinPosition.lat}, ${pinPosition.lng});
          }
          true;
        `);
      }
    }, [pinPosition]);

    // ピン名称が変わったら入力欄を更新
    useEffect(() => {
      if (pinName) {
        setSearchQuery(pinName);
      }
    }, [pinName]);

    const handleSearch = useCallback(() => {
      if (!searchQuery.trim() || !webViewRef.current) return;
      webViewRef.current.injectJavaScript(`
        if (window.searchAddress) {
          window.searchAddress(${JSON.stringify(searchQuery)});
        }
        true;
      `);
    }, [searchQuery]);

    const handleMessage = useCallback(
      (event: any) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'pinChange') {
            onPinChange(data.lat, data.lng, data.address, data.name);
          }
        } catch {
          // ignore
        }
      },
      [onPinChange]
    );

    const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let map, marker, geocoder;

    function initMap() {
      const center = ${pinPosition ? `{ lat: ${pinPosition.lat}, lng: ${pinPosition.lng} }` : `{ lat: ${DEFAULT_CENTER.lat}, lng: ${DEFAULT_CENTER.lng} }`};
      
      map = new google.maps.Map(document.getElementById('map'), {
        center: center,
        zoom: ${pinPosition ? 16 : 12},
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        mapId: 'native-address-map',
      });

      geocoder = new google.maps.Geocoder();

      ${
        pinPosition
          ? `
      marker = new google.maps.marker.AdvancedMarkerElement({
        map: map,
        position: center,
      });
      `
          : ''
      }

      map.addListener('click', function(e) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        
        if (marker) {
          marker.position = { lat, lng };
        } else {
          marker = new google.maps.marker.AdvancedMarkerElement({
            map: map,
            position: { lat, lng },
          });
        }

        geocoder.geocode({ location: { lat, lng } }, function(results, status) {
          const address = (status === 'OK' && results[0])
            ? results[0].formatted_address
            : lat.toFixed(6) + ', ' + lng.toFixed(6);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'pinChange', lat: lat, lng: lng, address: address
          }));
        });
      });
    }

    window.updatePin = function(lat, lng) {
      const pos = { lat, lng };
      map.panTo(pos);
      map.setZoom(16);
      if (marker) {
        marker.position = pos;
      } else {
        marker = new google.maps.marker.AdvancedMarkerElement({
          map: map,
          position: pos,
        });
      }
    };

    window.searchAddress = function(query) {
      geocoder.geocode({ address: query, region: 'jp' }, function(results, status) {
        if (status === 'OK' && results[0] && results[0].geometry) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          window.updatePin(lat, lng);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'pinChange', lat: lat, lng: lng, address: results[0].formatted_address, name: query
          }));
        }
      });
    };
  </script>
  <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&libraries=marker&v=weekly" async defer></script>
</body>
</html>`;

    return (
      <View style={nativeStyles.container}>
        <View style={nativeStyles.webviewWrapper}>
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={nativeStyles.webview}
            onMessage={handleMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scrollEnabled={false}
            bounces={false}
            originWhitelist={['*']}
          />
        </View>
        <View style={nativeStyles.searchRow}>
          <Ionicons name="search" size={18} color={C.placeholder} />
          <TextInput
            style={nativeStyles.searchInput}
            placeholder="住所を入力してマップを移動"
            placeholderTextColor={C.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleSearch} style={nativeStyles.searchButton}>
              <Text style={nativeStyles.searchButtonText}>検索</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };
}

const nativeStyles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    borderRadius: 7,
    overflow: 'hidden',
  },
  webviewWrapper: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  searchRow: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    paddingHorizontal: 10,
    height: 44,
    gap: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2528',
    height: '100%',
  },
  searchButton: {
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  searchButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.white,
  },
});

// ==================================================================
// メインの共通コンポーネント
// Web: @vis.gl/react-google-maps
// Native (iOS/Android): react-native-webview + Google Maps JS API
// ==================================================================
export default function MapAddressPicker({
  pinPosition,
  onPinChange,
  pinName,
}: MapAddressPickerProps) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <View style={fallbackStyles.noMapContainer}>
        <Ionicons name="map-outline" size={28} color={C.textMuted} />
        <Text style={fallbackStyles.noMapText}>
          Google Maps APIキーが未設定です。{'\n'}
          EXPO_PUBLIC_GOOGLE_MAPS_API_KEY を設定してください。
        </Text>
      </View>
    );
  }

  if (Platform.OS === 'web' && WebMapAddressPicker) {
    return (
      <WebMapAddressPicker pinPosition={pinPosition} onPinChange={onPinChange} pinName={pinName} />
    );
  }

  if (Platform.OS !== 'web' && NativeMapAddressPicker) {
    return (
      <NativeMapAddressPicker
        pinPosition={pinPosition}
        onPinChange={onPinChange}
        pinName={pinName}
      />
    );
  }

  return null;
}

const fallbackStyles = StyleSheet.create({
  noMapContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F7F9FA',
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8EAEC',
    borderStyle: 'dashed',
    gap: 8,
  },
  noMapText: {
    fontSize: 12.25,
    fontWeight: '500',
    color: '#63747E',
    textAlign: 'center',
    lineHeight: 18,
  },
});
