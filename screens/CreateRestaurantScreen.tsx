import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';

interface CreateRestaurantScreenProps {
  navigation: any;
}

function CreateRestaurantScreen({ navigation }: CreateRestaurantScreenProps) {
  const { theme } = useTheme();

  // Form state
  const [restaurantName, setRestaurantName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [hours, setHours] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRestaurant = async () => {
    // Basic validation
    if (!restaurantName.trim() || !category.trim() || !location.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Category, Location)');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement restaurant creation logic
      console.log('Creating restaurant:', {
        restaurantName,
        description,
        category,
        priceRange,
        location,
        imageUrl,
        phone,
        website,
        hours,
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert('Success', 'Restaurant created successfully!');
      navigation.navigate('BusinessDashboard');
    } catch (error) {
      console.error('Error creating restaurant:', error);
      Alert.alert('Error', 'Failed to create restaurant');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.navigate('BusinessDashboard')} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.primary }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Create Restaurant</Text>

        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Restaurant Details</Text>

          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.primary,
                backgroundColor: theme.inputBackground,
                color: theme.text,
              },
            ]}
            placeholder="Restaurant Name *"
            placeholderTextColor={theme.textSecondary}
            value={restaurantName}
            onChangeText={setRestaurantName}
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
            placeholder="Category * (e.g., Italian, Chinese, Fast Food)"
            placeholderTextColor={theme.textSecondary}
            value={category}
            onChangeText={setCategory}
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
            placeholder="Location * (e.g., 123 Main St, City, State)"
            placeholderTextColor={theme.textSecondary}
            value={location}
            onChangeText={setLocation}
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
            placeholder="Price Range (e.g., $, $$, $$$, $$$$)"
            placeholderTextColor={theme.textSecondary}
            value={priceRange}
            onChangeText={setPriceRange}
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
            placeholder="Image URL"
            placeholderTextColor={theme.textSecondary}
            value={imageUrl}
            onChangeText={setImageUrl}
            keyboardType="url"
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
            placeholder="Phone Number"
            placeholderTextColor={theme.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
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
            placeholder="Website URL"
            placeholderTextColor={theme.textSecondary}
            value={website}
            onChangeText={setWebsite}
            keyboardType="url"
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
            placeholder="Hours (e.g., Mon-Fri: 9AM-10PM, Sat-Sun: 10AM-11PM)"
            placeholderTextColor={theme.textSecondary}
            value={hours}
            onChangeText={setHours}
            multiline
            numberOfLines={2}
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
            placeholder="Description"
            placeholderTextColor={theme.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: theme.primary }]}
            onPress={handleCreateRestaurant}
            disabled={isLoading}
          >
            <Text style={styles.createButtonText}>
              {isLoading ? 'Creating...' : 'Create Restaurant'}
            </Text>
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
  createButton: {
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateRestaurantScreen;
