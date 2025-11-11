import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';

interface BusinessDashboardScreenProps {
  navigation: any;
}

function BusinessDashboardScreen({ navigation }: BusinessDashboardScreenProps) {
  const { theme } = useTheme();

  const quickActions = [
    { id: 'menu-list', label: 'Menu List', icon: '📋' },
    { id: 'add-menu', label: 'Add Menu Item', icon: '➕' },
    { id: 'edit-menu', label: 'Edit Menu Items', icon: '✏️' },
    { id: 'edit-profile', label: 'Edit Profile', icon: '👤' },
    { id: 'post-promo', label: 'Post Promo', icon: '📢' },
  ];

  const handleActionPress = (actionId: string) => {
    switch (actionId) {
      case 'menu-list':
        navigation.navigate('MenuList');
        break;
      case 'add-menu':
        navigation.navigate('AddMenuItem');
        break;
      case 'edit-menu':
        navigation.navigate('EditMenuItems');
        break;
      case 'edit-profile':
        navigation.navigate('EditProfile');
        break;
      case 'post-promo':
        navigation.navigate('PostPromo');
        break;
      default:
        break;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>Business Dashboard</Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>

        <View style={styles.gridContainer}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.actionCard,
                { borderColor: theme.primary },
                index === quickActions.length - 1 && styles.singleItemRow,
              ]}
              onPress={() => handleActionPress(action.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={[styles.actionLabel, { color: theme.text }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    aspectRatio: 1,
    borderWidth: 2,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  singleItemRow: {
    width: '48%',
  },
  actionIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default BusinessDashboardScreen;
