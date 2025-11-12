import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import MapBoxWebView from '../components/MapBoxWebView';
import { restaurantService } from '../src/services/restaurantService';
import { reverseGeocode } from '../src/services/geocodingService';

import { Restaurant } from '../types';

interface CategorizedRestaurant extends Restaurant {
  category: string; // Override to make category required
}

// Placeholder image URLs based on category (using unsplash for consistent placeholders)
const getPlaceholderImage = (category: string): string => {
  const placeholders: { [key: string]: string } = {
    italian: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=100&h=100&fit=crop&crop=center',
    cafe: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=100&h=100&fit=crop&crop=center',
    fast_food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100&h=100&fit=crop&crop=center',
    asian: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=100&h=100&fit=crop&crop=center',
    japanese: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=100&h=100&fit=crop&crop=center',
    bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop&crop=center',
    grill: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=100&h=100&fit=crop&crop=center',
    seafood: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=100&h=100&fit=crop&crop=center',
    mexican: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=100&h=100&fit=crop&crop=center',
    thai: 'https://images.unsplash.com/photo-1559847844-d413744b7da0?w=100&h=100&fit=crop&crop=center',
    buffet: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&h=100&fit=crop&crop=center',
    fine_dining: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=100&h=100&fit=crop&crop=center',
    fast_casual: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&h=100&fit=crop&crop=center',
    family: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&h=100&fit=crop&crop=center',
    diner: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=100&h=100&fit=crop&crop=center',
    casual: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&h=100&fit=crop&crop=center'
  };

  return placeholders[category] || placeholders.casual;
};

function HomeScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [addressCache, setAddressCache] = useState<{[key: string]: string}>({});
  const [geocodingInProgress, setGeocodingInProgress] = useState<Set<string>>(new Set());
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  // Clear address cache to refresh with new geocoding logic
  const clearAddressCache = () => {
    setAddressCache({});
    setGeocodingInProgress(new Set());
    console.log('🗺️ Address cache cleared - addresses will be re-fetched');
  };

  // Get address for restaurant - try name parsing first, then geocoding
  const getRestaurantAddress = async (restaurant: Restaurant): Promise<string> => {
    // Check if restaurant has valid location data
    if (!restaurant.location || typeof restaurant.location.latitude !== 'number' || typeof restaurant.location.longitude !== 'number') {
      console.warn('⚠️ Restaurant missing location data:', restaurant.name, restaurant.location);
      // Try parsing address from name
      const parsedAddress = parseAddressFromName(restaurant.name);
      if (parsedAddress !== restaurant.name && parsedAddress.length > 10) {
        return `📍 ${parsedAddress}`;
      }
      return '📍 Location not available';
    }

    const cacheKey = restaurant.id;

    // Check if already cached
    if (addressCache[cacheKey]) {
      return addressCache[cacheKey];
    }

    // If geocoding is already in progress for this restaurant, return loading
    if (geocodingInProgress.has(cacheKey)) {
      return '📍 Loading address...';
    }

    // Try parsing address from name first
    const parsedAddress = parseAddressFromName(restaurant.name);
    if (parsedAddress !== restaurant.name && parsedAddress.length > 10) {
      // Name parsing gave us a reasonable address, cache and return it
      setAddressCache(prev => ({ ...prev, [cacheKey]: `📍 ${parsedAddress}` }));
      return `📍 ${parsedAddress}`;
    }

    // Fall back to reverse geocoding
    try {
      setGeocodingInProgress(prev => new Set(prev).add(cacheKey));
      const geocodedAddress = await reverseGeocode(
        restaurant.location.latitude,
        restaurant.location.longitude
      );
      setAddressCache(prev => ({ ...prev, [cacheKey]: `📍 ${geocodedAddress}` }));
      return `📍 ${geocodedAddress}`;
    } catch (error) {
      console.warn('Failed to geocode restaurant:', restaurant.name, error);
      // Fallback to coordinates
      const coordAddress = `${restaurant.location.latitude.toFixed(4)}, ${restaurant.location.longitude.toFixed(4)}`;
      setAddressCache(prev => ({ ...prev, [cacheKey]: `📍 ${coordAddress}` }));
      return `📍 ${coordAddress}`;
    } finally {
      setGeocodingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(cacheKey);
        return newSet;
      });
    }
  };

  // Available restaurant categories for filtering
  const restaurantCategories = [
    { value: 'all', label: 'All Types', emoji: '🍽️' },
    { value: 'italian', label: 'Italian', emoji: '🍕' },
    { value: 'cafe', label: 'Cafe', emoji: '☕' },
    { value: 'fast_food', label: 'Fast Food', emoji: '🍔' },
    { value: 'asian', label: 'Asian', emoji: '🥢' },
    { value: 'japanese', label: 'Japanese', emoji: '🍱' },
    { value: 'bakery', label: 'Bakery', emoji: '🥖' },
    { value: 'grill', label: 'Grill', emoji: '🥩' },
    { value: 'seafood', label: 'Seafood', emoji: '🦞' },
    { value: 'mexican', label: 'Mexican', emoji: '🌮' },
    { value: 'thai', label: 'Thai', emoji: '🍜' },
    { value: 'buffet', label: 'Buffet', emoji: '🍽️' },
    { value: 'fine_dining', label: 'Fine Dining', emoji: '🍾' },
    { value: 'fast_casual', label: 'Fast Casual', emoji: '🏃' },
    { value: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
    { value: 'diner', label: 'Diner', emoji: '🍳' },
    { value: 'casual', label: 'Casual', emoji: '🍽️' }
  ];

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        console.log('🏠 HomeScreen: Fetching restaurants...');
        const data = await restaurantService.getAllRestaurants();
        console.log('🏠 HomeScreen: Fetched restaurants:', data.length);
        setRestaurants(data);

        // Clear address cache to refresh with new OSM-first geocoding logic
        clearAddressCache();

        // Pre-fetch addresses for all restaurants
        const addressPromises = data.map(async (restaurant: Restaurant) => {
          try {
            const address = await getRestaurantAddress(restaurant);
            console.log(`🏠 Got address for ${restaurant.name}: ${address}`);
          } catch (error) {
            console.warn(`Failed to get address for ${restaurant.name}:`, error);
          }
        });

        // Don't block UI on address fetching
        Promise.allSettled(addressPromises).then(() => {
          console.log('🏠 Address fetching completed');
        });

      } catch (error) {
        console.error('Failed to fetch restaurants:', error);
        Alert.alert('Error', 'Failed to load restaurants');
      }
    };

    fetchRestaurants();
  }, []);

  useEffect(() => {
    console.log('🏠 HomeScreen: Restaurants state updated:', restaurants.length);
  }, [restaurants]);

  // Categorize restaurants by type (same logic as MapBoxWebView)
  const categorizedRestaurants = useMemo(() => restaurants.map((restaurant) => {
    const name = restaurant.name.toLowerCase();
    let category = 'casual';
    let color = '#4a90e2'; // Default blue
    let emoji = '🍽️';

    if (name.includes('pizza') || name.includes('pizzeria')) {
      category = 'italian';
      color = '#e74c3c';
      emoji = '🍕';
    } else if (name.includes('cafe') || name.includes('coffee') || name.includes('starbucks')) {
      category = 'cafe';
      color = '#8b4513';
      emoji = '☕';
    } else if (name.includes('burger') || name.includes('mcdonald') || name.includes('wendy')) {
      category = 'fast_food';
      color = '#ff6b35';
      emoji = '🍔';
    } else if (name.includes('chinese') || name.includes('china') || name.includes('wok')) {
      category = 'asian';
      color = '#e67e22';
      emoji = '🥢';
    } else if (name.includes('sushi') || name.includes('japanese') || name.includes('tokyo')) {
      category = 'japanese';
      color = '#9b59b6';
      emoji = '🍱';
    } else if (name.includes('bakery') || name.includes('bread') || name.includes('pastry')) {
      category = 'bakery';
      color = '#f39c12';
      emoji = '🥖';
    } else if (name.includes('steak') || name.includes('grill') || name.includes('barbecue')) {
      category = 'grill';
      color = '#e74c3c';
      emoji = '🥩';
    } else if (name.includes('seafood') || name.includes('fish') || name.includes('lobster')) {
      category = 'seafood';
      color = '#3498db';
      emoji = '🦞';
    } else if (name.includes('mexican') || name.includes('taco') || name.includes('burrito')) {
      category = 'mexican';
      color = '#e67e22';
      emoji = '🌮';
    } else if (name.includes('thai') || name.includes('vietnam')) {
      category = 'thai';
      color = '#27ae60';
      emoji = '🍜';
    } else if (name.includes('buffet') || name.includes('all you can eat')) {
      category = 'buffet';
      color = '#f1c40f';
      emoji = '🍽️';
    } else if (name.includes('fine') || name.includes('elegant') || name.includes('upscale')) {
      category = 'fine_dining';
      color = '#8e44ad';
      emoji = '🍾';
    } else if (name.includes('fast') || name.includes('quick')) {
      category = 'fast_casual';
      color = '#16a085';
      emoji = '🏃';
    } else if (name.includes('family') || name.includes('kids')) {
      category = 'family';
      color = '#f39c12';
      emoji = '👨‍👩‍👧‍👦';
    } else if (name.includes('diner')) {
      category = 'diner';
      color = '#95a5a6';
      emoji = '🍳';
    }

    const categorized = {
      ...restaurant,
      category
    };

    console.log('🏷️ Categorized restaurant:', restaurant.name, '->', category, 'color:', color, 'emoji:', emoji);

    return categorized;
  }), [restaurants]);

  const parseAddressFromName = (fullName: string): string => {
    const parts = fullName.split(', ');
    if (parts.length >= 2) {
      // Remove the restaurant name (first part) and return the address
      const addressParts = parts.slice(1);
      return addressParts.join(', ');
    }
    return fullName; // Fallback to full name if parsing fails
  };

  const filteredRestaurants = useMemo(() => categorizedRestaurants.filter((restaurant) => {
    // Text search filter
    const matchesSearch = restaurant.name.toLowerCase().includes(searchText.toLowerCase());

    // Category filter
    const matchesCategory = selectedCategory === 'all' || restaurant.category === selectedCategory;

    return matchesSearch && matchesCategory;
  }), [categorizedRestaurants, searchText, selectedCategory]);

  // Load addresses for filtered restaurants
  useEffect(() => {
    filteredRestaurants.forEach((restaurant) => {
      const cacheKey = restaurant.id;
      if (!addressCache[cacheKey] && !geocodingInProgress.has(cacheKey)) {
        // Trigger address loading
        getRestaurantAddress(restaurant).catch((error) => {
          console.warn(`Failed to get address for ${restaurant.name}:`, error);
        });
      }
    });
  }, [filteredRestaurants]);

  // RestaurantCard component that handles address display
  const RestaurantCard = useCallback(({ restaurant }: { restaurant: CategorizedRestaurant }) => {
    const address = addressCache[restaurant.id] || '📍 Loading address...';

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('RestaurantDetail', {
          restaurantId: restaurant.id,
          restaurant: restaurant
        })}
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.primary }]}
      >
        <View style={styles.cardContent}>
          <Image
            source={{
              uri: restaurant.image || getPlaceholderImage(restaurant.category || 'casual')
            }}
            style={styles.restaurantImage}
            contentFit="cover"
            placeholder={require('../assets/icon.png')}
            onError={() => {
              console.log('Image load error for', restaurant.name);
            }}
          />
          <View style={styles.cardTextContent}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{restaurant.name.split(', ')[0]}</Text>
            <Text style={[styles.cardLocation, { color: theme.textSecondary }]}>
              {address}
            </Text>
            <Text style={[styles.cardCategory, { color: theme.primary }]}>
              {restaurantCategories.find(cat => cat.value === (restaurant.category || 'casual'))?.emoji || '🍽️'} {restaurant.category || 'casual'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [addressCache, navigation, theme, restaurantCategories]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header />
      <TouchableOpacity
        onPress={() => navigation.navigate('RoleSelection')}
        style={styles.backButton}
      >
        <Text style={[styles.backText, { color: '#E81CFF' }]}>←</Text>
      </TouchableOpacity>
      <TextInput
        placeholder="Search restaurants"
        value={searchText}
        onChangeText={setSearchText}
        style={[styles.searchBar, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
        placeholderTextColor={theme.textSecondary}
      />

      {/* Category Filter Button */}
      <TouchableOpacity
        onPress={() => setShowCategoryModal(true)}
        style={[styles.categoryButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <Text style={{ color: theme.text, fontSize: 16 }}>
          {restaurantCategories.find(cat => cat.value === selectedCategory)?.emoji || '🍽️'}
        </Text>
        <Text style={{ color: theme.text, fontSize: 12, marginLeft: 4 }}>
          ▼
        </Text>
      </TouchableOpacity>

      {/* Category Filter Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Filter by Type</Text>
            <FlatList
              data={restaurantCategories}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCategory(item.value);
                    setShowCategoryModal(false);
                  }}
                  style={[
                    styles.categoryOption,
                    selectedCategory === item.value && { backgroundColor: theme.primary + '20' }
                  ]}
                >
                  <Text style={{ fontSize: 18, marginRight: 10 }}>{item.emoji}</Text>
                  <Text style={[styles.categoryText, { color: theme.text }]}>
                    {item.label}
                  </Text>
                  {selectedCategory === item.value && (
                    <Text style={{ color: theme.primary, fontSize: 16 }}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
            />
            <TouchableOpacity
              onPress={() => setShowCategoryModal(false)}
              style={[styles.closeButton, { backgroundColor: theme.primary }]}
            >
              <Text style={[styles.closeButtonText, { color: theme.background }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.mapContainer}>
        {filteredRestaurants.length > 0 ? (
          (() => {
            console.log('🗺️ Passing restaurants to MapBoxWebView:', filteredRestaurants.length, filteredRestaurants);
            return <MapBoxWebView restaurants={filteredRestaurants} />;
          })()
        ) : (
          <View style={[styles.loadingContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.loadingText, { color: theme.text }]}>
              {restaurants.length === 0 ? '🔄 Loading restaurants...' : '🔍 No restaurants match your search'}
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.cardsContainer}>
        {filteredRestaurants.length === 0 ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {restaurants.length === 0 ? 'No restaurants loaded yet' : 'No restaurants match your search'}
            </Text>
          </View>
        ) : (
          filteredRestaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80, // Account for header
  },
  backButton: {
    position: 'absolute',
    top: 25,
    left: 5,
    padding: 18,
    borderRadius: 10,
    zIndex: 10,
  },
  backText: {
    fontSize: 35,
    fontWeight: 'bold',
  },
  searchBar: {
    position: 'absolute',
    top: 60,
    left: 80,
    right: 20,
    height: 40,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    zIndex: 10,
  },
  mapContainer: {
    flex: 1,
    marginTop: 10, // Reduced from 20
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  card: {
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  cardTextContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardLocation: {
    fontSize: 14,
    marginTop: 5,
  },
  cardCategory: {
    fontSize: 12,
    marginTop: 3,
    fontWeight: '600',
  },
  categoryButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 50,
    height: 40,
    borderWidth: 1,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 300,
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginVertical: 2,
  },
  categoryText: {
    flex: 1,
    fontSize: 16,
  },
  closeButton: {
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default HomeScreen;
