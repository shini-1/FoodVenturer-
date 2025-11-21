import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import { restaurantService } from '../src/services/restaurantService';
import { supabase } from '../src/config/supabase';

interface BusinessDashboardScreenProps {
  navigation: any;
}

function BusinessDashboardScreen({ navigation }: BusinessDashboardScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [hasRestaurant, setHasRestaurant] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkRestaurantStatus();
  }, []);

  const checkRestaurantStatus = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('User not authenticated');
        return;
      }

      const restaurant = await restaurantService.getRestaurantByOwnerId(user.id);
      setHasRestaurant(!!restaurant);
    } catch (error) {
      console.error('Error checking restaurant status:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    ...(hasRestaurant ? [] : [{ id: 'create-restaurant', label: 'Create Restaurant', icon: '🏪' }]),
    ...(hasRestaurant ? [
      { id: 'menu-list', label: 'Menu List', icon: '📋' },
      { id: 'add-menu', label: 'Add Menu Item', icon: '➕' },
      { id: 'edit-menu', label: 'Edit Menu Items', icon: '✏️' },
      { id: 'post-promo', label: 'Post Promo', icon: '📢' },
    ] : []),
    { id: 'edit-profile', label: 'Edit Profile', icon: '👤' },
  ];

  const handleActionPress = (actionId: string) => {
    switch (actionId) {
      case 'create-restaurant':
        navigation.navigate('CreateRestaurant');
        break;
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { top: insets.top + 10 }]}>
          <Text style={[styles.backButtonText, { color: theme.primary }]}>✕</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Business Dashboard</Text>

        {loading ? (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Loading...
            </Text>
          </View>
        ) : !hasRestaurant ? (
          <View style={{ alignItems: 'center', padding: 20 }}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, textAlign: 'center' }]}>
              Welcome! Create your restaurant to start managing menus and promotions.
            </Text>
          </View>
        ) : null}

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
  backButton: {
    position: 'absolute',
    left: 20,
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
