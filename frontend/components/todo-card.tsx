import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export interface TodoItem {
  id: number;
  label: string;
  checked: boolean;
}

interface TodoCardProps {
  todos: TodoItem[];
  onToggle?: (id: number) => void;
}

const C = {
  headerBg: '#436F9B',
  todoBg: '#E6EDF6',
  todoBorder: '#A8C0DD',
  textPrimary: '#1F2528',
  textMuted: '#B5BFC5',
  white: '#FFFFFF',
  badgeBg: '#A86A78',
};

export default function TodoCard({ todos, onToggle }: TodoCardProps): React.JSX.Element {
  const remainingCount = todos.filter(t => !t.checked).length;

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={24.5} color={C.textPrimary} />
          <Text style={styles.headerText}>今日やること！</Text>
        </View>
        <View style={styles.body}>
          {todos.length === 0 ? (
            <Text style={styles.emptyText}>登録されている持ち物はありません</Text>
          ) : (
            todos.map((todo, index) => (
              <React.Fragment key={todo.id}>
                {index > 0 && <View style={styles.dashedDivider} />}
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => onToggle && onToggle(todo.id)}
                  activeOpacity={0.7}
                >
                  {todo.checked ? (
                    <View style={styles.checkedBox}>
                      <Ionicons name="checkmark" size={13} color={C.white} />
                    </View>
                  ) : (
                    <View style={styles.uncheckedBox} />
                  )}
                  <Text style={todo.checked ? styles.checkedText : styles.text}>{todo.label}</Text>
                </TouchableOpacity>
              </React.Fragment>
            ))
          )}
        </View>
      </View>
      {remainingCount > 0 && (
        <View style={styles.remainingBadge}>
          <Text style={styles.remainingBadgeText}>残り{remainingCount}個！</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 10,
  },
  card: {
    borderWidth: 2,
    borderColor: C.todoBorder,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: C.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.todoBg,
    borderBottomWidth: 2,
    borderBottomColor: C.todoBorder,
    paddingHorizontal: 17.5,
    paddingVertical: 12.25,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
  },
  body: {
    paddingHorizontal: 17.5,
    paddingVertical: 17.5,
    gap: 17.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkedText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
    textDecorationLine: 'line-through',
    textDecorationColor: C.textMuted,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
  },
  checkedBox: {
    width: 17.5,
    height: 17.5,
    borderRadius: 3.5,
    backgroundColor: C.headerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncheckedBox: {
    width: 17.5,
    height: 17.5,
    borderRadius: 3.5,
    borderWidth: 1,
    borderColor: C.textMuted,
  },
  remainingBadge: {
    position: 'absolute',
    right: 14,
    top: -12,
    backgroundColor: C.badgeBg,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  remainingBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.white,
  },
  dashedDivider: {
    height: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: C.todoBorder,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textMuted,
    textAlign: 'center',
  },
});
