import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const owlAvatar = require('@/assets/images/owl-avatar.png');

type Props = {
  message: string;
};

export default function OwlChatBubble({ message }: Props): React.JSX.Element {
  return (
    <View style={styles.chatRow}>
      <Image source={owlAvatar} style={styles.owlAvatar} resizeMode="contain" />
      <View style={styles.chatBubbleWrapper}>
        <View style={styles.chatBubble}>
          <Text style={styles.chatText}>{message}</Text>
        </View>
        <View style={styles.chatTriangle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chatRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
  },
  owlAvatar: {
    width: 250,
    height: 250,
    marginLeft: -40,
    marginBottom: -70,
  },
  chatBubbleWrapper: {
    flex: 1,
    marginLeft: -25,
    marginBottom: 10,
  },
  chatBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chatTriangle: {
    position: 'absolute',
    left: -10,
    top: 20,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
    borderRightWidth: 12,
    borderRightColor: '#FFFFFF',
  },
  chatText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    color: '#1F2528',
  },
});
