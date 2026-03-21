import React, { useRef, useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

const C = {
  headerBg: '#436F9B',
  white: '#FFFFFF',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  textMuted: '#B5BFC5',
};

export interface MapPin {
  lat: number;
  lng: number;
  label: string;
  color?: string; // マーカー色 (hex, 赤 = 出発 / 青 = 到着)
}

interface ScheduleMapModalProps {
  visible: boolean;
  onClose: () => void;
  pins: MapPin[];
  title?: string;
}

// ==========================================================
// Web 向け: @vis.gl/react-google-maps 使用
// ==========================================================
let WebMapView: React.ComponentType<{ pins: MapPin[] }> | null = null;

if (Platform.OS === 'web') {
  const {
    APIProvider,
    Map,
    Marker,
    useMap,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
  } = require('@vis.gl/react-google-maps');

  function MapContent({ pins }: { pins: MapPin[] }) {
    const map = useMap();

    useEffect(() => {
      if (!map || pins.length === 0) return;
      const bounds = new google.maps.LatLngBounds();

      // 重なり対策を施した座標を計算して Bounds を拡張
      const processedPins = getProcessedPins(pins);
      processedPins.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));

      if (pins.length === 1) {
        map.setCenter({ lat: processedPins[0].lat, lng: processedPins[0].lng });
        map.setZoom(15);
      } else {
        map.fitBounds(bounds, { top: 60, bottom: 60, left: 40, right: 40 });
      }
    }, [map, pins]);

    const processedPins = getProcessedPins(pins);

    return (
      <>
        {processedPins.map((pin, i) => (
          <Marker
            key={i}
            position={{ lat: pin.lat, lng: pin.lng }}
            label={(i + 1).toString()}
            zIndex={100 + i}
          />
        ))}
      </>
    );
  }

  // 座標オフセット計算ロジック
  function getProcessedPins(pins: MapPin[]) {
    const coordsCount: Record<string, number> = {};
    return pins.map(pin => {
      const lat = Number(pin.lat);
      const lng = Number(pin.lng);
      const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      const count = coordsCount[key] || 0;
      coordsCount[key] = count + 1;

      if (count === 0) return { ...pin, lat, lng };

      // 重なっている場合、円状にわずかに移動 (約5m)
      const offset = 0.00005 * count;
      const angle = count * 45 * (Math.PI / 180);
      return {
        ...pin,
        lat: lat + offset * Math.sin(angle),
        lng: lng + offset * Math.cos(angle),
      };
    });
  }

  WebMapView = function WebMap({ pins }: { pins: MapPin[] }) {
    return (
      <View style={{ flex: 1 }}>
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            defaultCenter={{ lat: 35.6762, lng: 139.6503 }}
            defaultZoom={13}
            gestureHandling="greedy"
            disableDefaultUI={true}
            style={{ width: '100%', height: '100%' }}
          >
            <MapContent pins={pins} />
          </Map>
        </APIProvider>
      </View>
    );
  };
}

// ==========================================================
// ネイティブ向け: react-native-webview + Google Maps JS API
// ==========================================================
let NativeMapView: React.ComponentType<{ pins: MapPin[] }> | null = null;

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WebView } = require('react-native-webview');

  NativeMapView = function NativeMap({ pins }: { pins: MapPin[] }) {
    const webViewRef = useRef<any>(null);

    const pinsJson = JSON.stringify(
      pins.map((p, i) => ({
        lat: p.lat,
        lng: p.lng,
        label: p.label,
        color: p.color || '#436F9B',
        index: i + 1,
      }))
    );

    const center =
      pins.length > 0
        ? `{ lat: ${pins[0].lat}, lng: ${pins[0].lng} }`
        : '{ lat: 35.6762, lng: 139.6503 }';

    const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background-color: #f7f9fa; }
    #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    function initMap() {
      const map = new google.maps.Map(document.getElementById('map'), {
        center: ${center},
        zoom: 13,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
      });

      const pins = ${pinsJson};
      const bounds = new google.maps.LatLngBounds();

      google.maps.event.addListenerOnce(map, 'idle', function() {
        const seenCoords = {};
        const path = [];

        pins.forEach(function(pin) {
          let lat = Number(pin.lat);
          let lng = Number(pin.lng);
          const key = lat.toFixed(6) + ',' + lng.toFixed(6);
          const count = seenCoords[key] || 0;
          seenCoords[key] = count + 1;

          if (count > 0) {
            const offset = 0.00005 * count;
            const angle = (count * 45) * (Math.PI / 180);
            lat += offset * Math.sin(angle);
            lng += offset * Math.cos(angle);
          }

          const pos = { lat: lat, lng: lng };
          path.push(pos);

          new google.maps.Marker({
            map: map,
            position: pos,
            label: pin.index.toString(),
            zIndex: 100 + pin.index
          });
          bounds.extend(pos);
        });

        if (path.length > 0) {
          map.fitBounds(bounds, { top: 60, bottom: 60, left: 40, right: 40 });
        } else if (pins.length === 1) {
          map.setZoom(15);
          map.setCenter(path[0]);
        }
      });
    }
  </script>
  <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&v=weekly" async defer></script>
</body>
</html>`;

    return (
      <View style={{ flex: 1, borderRadius: 7, overflow: 'hidden' }}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
          bounces={false}
          originWhitelist={['*']}
        />
      </View>
    );
  };
}

// ==========================================================
// Legend (凡例)
// ==========================================================
function PinLegend({ pins }: { pins: MapPin[] }) {
  return (
    <View style={legendStyles.container}>
      {pins.map((pin, i) => (
        <View key={i} style={legendStyles.row}>
          <View style={[legendStyles.badge, { backgroundColor: pin.color || '#436F9B' }]}>
            <Text style={legendStyles.badgeText}>{i + 1}</Text>
          </View>
          <Text style={legendStyles.label} numberOfLines={1}>
            {pin.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const legendStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2528',
  },
});

// ==========================================================
// Modal本体
// ==========================================================
export default function ScheduleMapModal({
  visible,
  onClose,
  pins,
  title = '今日のルート',
}: ScheduleMapModalProps) {
  const insets = useSafeAreaInsets();

  const renderMap = () => {
    if (!GOOGLE_MAPS_API_KEY) {
      return (
        <View style={styles.noMapContainer}>
          <Ionicons name="map-outline" size={28} color={C.textMuted} />
          <Text style={styles.noMapText}>Google Maps APIキーが未設定です。</Text>
        </View>
      );
    }

    if (pins.length === 0) {
      return (
        <View style={styles.noMapContainer}>
          <Ionicons name="location-outline" size={28} color={C.textMuted} />
          <Text style={styles.noMapText}>
            表示する場所がありません。{'\n'}
            スケジュールに場所を登録してください。
          </Text>
        </View>
      );
    }

    if (Platform.OS === 'web' && WebMapView) {
      return <WebMapView pins={pins} />;
    }
    if (Platform.OS !== 'web' && NativeMapView) {
      return <NativeMapView pins={pins} />;
    }
    return null;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="chevron-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>{renderMap()}</View>

        {/* Legend */}
        {pins.length > 0 && <PinLegend pins={pins} />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.white,
  },
  header: {
    backgroundColor: C.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
  },
  mapContainer: {
    flex: 1,
  },
  noMapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  noMapText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#63747E',
    textAlign: 'center',
    lineHeight: 18,
  },
});
