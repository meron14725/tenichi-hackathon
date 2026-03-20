import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type TodoItem = {
  id: number;
  label: string;
  checked: boolean;
};

const INITIAL_TODOS: TodoItem[] = [
  { id: 1, label: '折りたたみ傘', checked: true },
  { id: 2, label: 'スーツ', checked: false },
];

const C = {
  headerBg: '#436F9B',
  todoBg: '#E6EDF6',
  todoBorder: '#A8C0DD',
  textPrimary: '#1F2528',
  textMuted: '#B5BFC5',
  white: '#FFFFFF',
  badgeBg: '#A86A78',
};

export default function TodoCard(): React.JSX.Element {
  const [todos, setTodos] = useState<TodoItem[]>(INITIAL_TODOS);

  function toggleTodo(id: number): void {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, checked: !t.checked } : t)));
  }

  const remainingCount = todos.filter(t => !t.checked).length;

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={24.5} color={C.textPrimary} />
          <Text style={styles.headerText}>前日までに準備すること！</Text>
        </View>
        <View style={styles.body}>
          {todos.map((todo, index) => (
            <React.Fragment key={todo.id}>
              {index > 0 && <View style={styles.dashedDivider} />}
              <TouchableOpacity style={styles.row} onPress={() => toggleTodo(todo.id)}>
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
          ))}
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
  },
  card: {
    borderWidth: 2,
    borderColor: C.todoBorder,
    borderRadius: 14,
    overflow: 'hidden',
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
    right: 0,
    bottom: -12,
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
});
