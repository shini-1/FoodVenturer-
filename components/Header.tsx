import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

function Header() {
  const { isDark, toggleTheme, theme } = useTheme();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={toggleTheme}
        accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        accessibilityHint="Toggles between light and dark theme"
        style={styles.toggleButton}
      >
        <Text style={[styles.toggleText, { color: theme.text }]}>{isDark ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 10,
    zIndex: 1000,
  },
  toggleButton: {
    padding: 5,
  },
  toggleText: {
    fontSize: 24,
  },
});

export default Header;
