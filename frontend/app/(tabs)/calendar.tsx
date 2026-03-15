import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function CalendarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>カレンダー</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 17.5,
    fontWeight: '700',
    color: '#1F2528',
  },
});
