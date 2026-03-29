import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

const owlAvatar = require('@/assets/images/owl.svg');

type Props = {
  message: string;
};

export default function OwlChatBubble({ message }: Props): React.JSX.Element {
  return (
    <View style={styles.chatRow}>
      <Image source={owlAvatar} style={styles.owlAvatar} contentFit="contain" />
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
    alignItems: 'flex-start',
    minHeight: 200,
  },
  owlAvatar: {
    width: 200,
    height: 200,
    marginLeft: -15,
    marginBottom: 0,
  },
  chatBubbleWrapper: {
    flex: 1,
    marginLeft: 0,
    marginTop: 40,
    marginRight: 0,
    marginBottom: 20,
  },
  chatBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  chatTriangle: {
    position: 'absolute',
    left: -10,
    top: 10,
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
