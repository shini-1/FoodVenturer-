import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import { promoService } from '../src/services/promoService';
import { restaurantService } from '../src/services/restaurantService';
import { supabase } from '../src/config/supabase';

interface PostPromoScreenProps {
  navigation: any;
}

function PostPromoScreen({ navigation }: PostPromoScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [discount, setDiscount] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePostPromo = async () => {
    if (!promoTitle.trim() || !promoDescription.trim() || !discount.trim() || !expiryDate.trim()) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    const discountValue = parseFloat(discount);
    if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
      Alert.alert('Validation Error', 'Please enter a valid discount percentage (1-100)');
      return;
    }

    // Validate expiry date
    const today = new Date().toISOString().split('T')[0];
    if (expiryDate < today) {
      Alert.alert('Validation Error', 'Expiry date must be in the future');
      return;
    }

    setIsLoading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get owner's restaurant
      const restaurant = await restaurantService.getRestaurantByOwnerId(user.id);
      if (!restaurant) {
        Alert.alert('Error', 'You must create a restaurant first before posting promos');
        navigation.navigate('CreateRestaurant');
        return;
      }

      console.log('Posting promo for restaurant:', restaurant.id, {
        promoTitle,
        promoDescription,
        discount: discountValue,
        expiryDate,
      });

      await promoService.createPromo({
        restaurantId: restaurant.id,
        title: promoTitle.trim(),
        description: promoDescription.trim(),
        discount: discountValue,
        expiryDate,
      });

      Alert.alert('Success', 'Promo posted successfully');
      setPromoTitle('');
      setPromoDescription('');
      setDiscount('');
      setExpiryDate('');
      navigation.navigate('BusinessDashboard');
    } catch (error: any) {
      console.error('Error posting promo:', error);
      Alert.alert('Error', error.message || 'Failed to post promo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { top: insets.top + 10 }]}>
          <Text style={[styles.backButtonText, { color: theme.primary }]}>✕</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Post Promo</Text>

        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Create New Promotion</Text>

          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.primary,
                backgroundColor: theme.inputBackground,
                color: theme.text,
              },
            ]}
            placeholder="Promo Title"
            placeholderTextColor={theme.textSecondary}
            value={promoTitle}
            onChangeText={setPromoTitle}
          />

          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.primary,
                backgroundColor: theme.inputBackground,
                color: theme.text,
              },
            ]}
            placeholder="Promo Description"
            placeholderTextColor={theme.textSecondary}
            value={promoDescription}
            onChangeText={setPromoDescription}
            multiline
            numberOfLines={4}
          />

          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.primary,
                backgroundColor: theme.inputBackground,
                color: theme.text,
              },
            ]}
            placeholder="Discount (%)"
            placeholderTextColor={theme.textSecondary}
            value={discount}
            onChangeText={setDiscount}
            keyboardType="decimal-pad"
          />

          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.primary,
                backgroundColor: theme.inputBackground,
                color: theme.text,
              },
            ]}
            placeholder="Expiry Date (e.g., 2024-12-31)"
            placeholderTextColor={theme.textSecondary}
            value={expiryDate}
            onChangeText={setExpiryDate}
          />

          <TouchableOpacity
            style={[styles.postButton, { backgroundColor: theme.primary }]}
            onPress={handlePostPromo}
            disabled={isLoading}
          >
            <Text style={styles.postButtonText}>{isLoading ? 'Posting...' : 'Post Promo'}</Text>
          </TouchableOpacity>
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
    marginBottom: 24,
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
    minHeight: 48,
  },
  postButton: {
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    alignItems: 'center',
  },
  postButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PostPromoScreen;
