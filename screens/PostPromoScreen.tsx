import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';

interface PostPromoScreenProps {
  navigation: any;
}

function PostPromoScreen({ navigation }: PostPromoScreenProps) {
  const { theme } = useTheme();
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

    if (isNaN(parseFloat(discount))) {
      Alert.alert('Validation Error', 'Please enter a valid discount percentage');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Posting promo:', {
        promoTitle,
        promoDescription,
        discount: parseFloat(discount),
        expiryDate,
      });
      Alert.alert('Success', 'Promo posted successfully');
      setPromoTitle('');
      setPromoDescription('');
      setDiscount('');
      setExpiryDate('');
      navigation.goBack();
    } catch (error) {
      console.error('Error posting promo:', error);
      Alert.alert('Error', 'Failed to post promo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.primary }]}>← Back</Text>
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
    marginBottom: 16,
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
