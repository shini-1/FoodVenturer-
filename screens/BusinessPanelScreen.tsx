import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';

function BusinessPanelScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header />
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Business Owner Portal</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Access your business management tools
        </Text>
        {/* Authentication screens will be shown as modals */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
});

export default BusinessPanelScreen;
