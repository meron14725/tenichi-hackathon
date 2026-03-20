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
  },
  owlAvatar: {
    width: 165,
    height: 165,
  },
  chatBubbleWrapper: {
    flex: 1,
    marginLeft: -4,
    marginBottom: 20,
  },
  chatBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10.5,
    paddingHorizontal: 12.25,
    paddingVertical: 7,
  },
  chatTriangle: {
    position: 'absolute',
    left: -8,
    bottom: 20,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
    borderRightWidth: 11,
    borderRightColor: '#FFFFFF',
  },
  chatText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    color: '#1F2528',
  },
});
