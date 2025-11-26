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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import { restaurantService, CreateRestaurantData } from '../src/services/restaurantService';
import * as ImagePicker from 'expo-image-picker';
import { LocationService } from '../services/expoLocationService';
import { reverseGeocode } from '../src/services/geocodingService';
import { uploadImageToRestaurantBucket } from '../services/imageService';

interface CreateRestaurantScreenProps {
  navigation: any;
}

function CreateRestaurantScreen({ navigation }: CreateRestaurantScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  console.log('🏪 CreateRestaurantScreen loaded - VERSION WITH LOCATION & IMAGE PICKER');

  // Form state
  const [restaurantName, setRestaurantName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priceRange, setPriceRange] = useState('₱₱');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [hours, setHours] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const handleGetLocation = async () => {
    try {
      setLocationLoading(true);
      console.log('📍 Getting current location...');

      const locationServiceInstance = new LocationService();
      const location = await locationServiceInstance.getCurrentLocation();
      
      if (location) {
        setLatitude(location.latitude.toString());
        setLongitude(location.longitude.toString());
        console.log('📍 Location obtained:', location);

        try {
          const address = await reverseGeocode(location.latitude, location.longitude);
          Alert.alert('Success', `Location updated!\n${address || 'Coordinates: ' + location.latitude.toFixed(4) + ', ' + location.longitude.toFixed(4)}`);
        } catch (geocodeError) {
          console.warn('📍 Reverse geocoding failed:', geocodeError);
          Alert.alert('Success', `Location updated!\nCoordinates: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
        }
      } else {
        console.warn('📍 Failed to get location');
        Alert.alert('Location Error', 'Unable to get your current location. Please check location permissions and try again.');
      }
    } catch (error: any) {
      console.error('📍 Location error:', error);
      Alert.alert('Location Error', `Failed to access location services: ${error.message}`);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSelectImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        console.log('📷 Selected image URI:', imageUri);
        setImageUploading(true);

        try {
          const tempRestaurantId = `temp_${Date.now()}`;
          const uploadedImageUrl = await uploadImageToRestaurantBucket(imageUri, tempRestaurantId);
          
          setImageUrl(uploadedImageUrl);
          Alert.alert('Success', 'Image uploaded successfully!');
        } catch (uploadError: any) {
          console.error('Image upload error:', uploadError);
          Alert.alert('Error', `Failed to upload image: ${uploadError?.message || 'Unknown error'}`);
        } finally {
          setImageUploading(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleCreateRestaurant = async () => {
    // Basic validation
    if (!restaurantName.trim() || !category.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Category)');
      return;
    }

    if (!latitude || !longitude) {
      Alert.alert('Error', 'Please use the "Get Location" button to set the restaurant location');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Error', 'Invalid location coordinates');
      return;
    }

    setIsLoading(true);
    try {
      const restaurantData: CreateRestaurantData = {
        name: restaurantName.trim(),
        description: description.trim(),
        category: category.trim(),
        priceRange: priceRange,
        location: `${lat},${lng}`,
        imageUrl: imageUrl.trim(),
        phone: phone.trim(),
        website: website.trim(),
        hours: hours.trim(),
      };

      console.log('🍽️ Creating restaurant with data:', restaurantData);

      const createdRestaurant = await restaurantService.createRestaurant(restaurantData);

      Alert.alert('Success', `Restaurant "${createdRestaurant.name}" created successfully!`);
      navigation.navigate('BusinessDashboard');
    } catch (error: any) {
      console.error('❌ Error creating restaurant:', error);
      Alert.alert('Error', error.message || 'Failed to create restaurant');
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

          <TouchableOpacity
            onPress={handleGetLocation}
            disabled={locationLoading}
            style={[
              styles.locationButton,
              { backgroundColor: locationLoading ? theme.border : '#28a745' }
            ]}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.locationButtonText}>📍 Get Location</Text>
            )}
          </TouchableOpacity>

          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.primary,
                backgroundColor: theme.inputBackground,
                color: theme.text,
              },
            ]}
            placeholder="Latitude *"
            placeholderTextColor={theme.textSecondary}
            value={latitude}
            editable={false}
            selectTextOnFocus={false}
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
            placeholder="Longitude *"
            placeholderTextColor={theme.textSecondary}
            value={longitude}
            editable={false}
            selectTextOnFocus={false}
          />

          <Text style={[styles.fieldLabel, { color: theme.text }]}>Price Range (₱)</Text>
          <View style={styles.priceRangeContainer}>
            {['₱','₱₱','₱₱₱','₱₱₱₱'].map((pr) => (
              <TouchableOpacity
                key={pr}
                onPress={() => setPriceRange(pr)}
                style={[
                  styles.priceRangeButton,
                  {
                    borderColor: theme.primary,
                    backgroundColor: priceRange === pr ? theme.primary : theme.inputBackground
                  }
                ]}
              >
                <Text style={[
                  styles.priceRangeText,
                  { color: priceRange === pr ? 'white' : theme.text }
                ]}>
                  {pr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: theme.text }]}>Restaurant Image</Text>
          <View style={styles.imagePickerContainer}>
            <TouchableOpacity
              onPress={handleSelectImage}
              disabled={imageUploading}
              style={[
                styles.imagePickerButton,
                { backgroundColor: imageUploading ? theme.border : theme.primary }
              ]}
            >
              {imageUploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.imagePickerButtonText}>📷 Select Image</Text>
              )}
            </TouchableOpacity>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
            ) : (
              <Text style={[styles.noImageText, { color: theme.textSecondary }]}>No image selected</Text>
            )}
          </View>

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
  locationButton: {
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  locationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  priceRangeButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRangeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  imagePickerButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  imagePickerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  noImageText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default CreateRestaurantScreen;
