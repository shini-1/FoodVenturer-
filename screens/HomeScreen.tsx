import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import MapBoxWebView from '../components/MapBoxWebView';
import { reverseGeocode } from '../src/services/geocodingService';
import { resolveCategoryConfig, getAllCategoryOptions } from '../src/config/categoryConfig';
import { restaurantService } from '../src/services/restaurantService';
import { DatabaseService } from '../src/services/database';
import { RestaurantRow } from '../src/types/database';

import { Restaurant } from '../types';

interface CategorizedRestaurant extends Restaurant {
  category: string; // Override to make category required
}

// Design colors matching the mockup exactly
const DESIGN_COLORS = {
  background: '#E6F3FF',      // Light blue - main screen background
  cardBackground: '#FFFFFF',   // White - card backgrounds
  border: '#000000',           // Black - all borders
  textPrimary: '#000000',      // Black - primary text (names, types)
  textSecondary: '#666666',    // Gray - secondary text (locations)
  textPlaceholder: '#999999',  // Light gray - placeholder text
  buttonBackground: '#FFFFFF', // White - button backgrounds
  infoBg: '#000000',          // Black - info button background
  infoText: '#FFFFFF',        // White - info button text
};

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

function isValidHttpUrl(value?: string): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function HomeScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  // const { isOnline } = useNetwork(); // Disabled - not using offline features for now
  const [searchText, setSearchText] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [addressCache, setAddressCache] = useState<{[key: string]: string}>({});
  const [geocodingInProgress, setGeocodingInProgress] = useState<Set<string>>(new Set());
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const GEOCODE_CONCURRENCY = 3;
  const geocodeActiveRef = useRef(0);
  const geocodeQueueRef = useRef<string[]>([]);
  const queuedRef = useRef<Set<string>>(new Set());
  const autoLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);
  const refreshingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const SERVER_PAGE_SIZE = 20;
  const [serverPage, setServerPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Favorites removed for stability

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

  // Get restaurant categories from centralized config
  const restaurantCategories = useMemo(() => getAllCategoryOptions(), []);

  const loadPage = useCallback(async (targetPage: number) => {
    if (isLoadingRef.current) {
      console.log('⏳ Already loading, skipping...');
      return;
    }
    try {
      isLoadingRef.current = true;
      setIsLoadingPage(true);
      console.log(`🏠 HomeScreen: Fetching restaurants page ${targetPage} (size ${SERVER_PAGE_SIZE})`);

      // Check database readiness
      const isDbReady = DatabaseService.isDatabaseReady();
      console.log('📊 Database ready for loadPage:', isDbReady);

      // Offline-first approach: Try local database first
      let localRestaurants: RestaurantRow[] = [];
      try {
        console.log('📱 Attempting to load from local database...');
        localRestaurants = await DatabaseService.getRestaurants(SERVER_PAGE_SIZE, (targetPage - 1) * SERVER_PAGE_SIZE);
        console.log(`📱 Found ${localRestaurants.length} restaurants in local database`);

        // Log some sample data for debugging
        if (localRestaurants.length > 0) {
          console.log('📋 Sample local restaurant:', {
            id: localRestaurants[0].id,
            name: localRestaurants[0].name,
            category: localRestaurants[0].category,
            latitude: localRestaurants[0].latitude,
            longitude: localRestaurants[0].longitude,
          });
        }
      } catch (localError) {
        console.error('❌ Local database error:', localError);
      }

      // If we have local data and it's not the first page, use it
      if (localRestaurants.length > 0 && targetPage > 1) {
        console.log('🔄 Using local data for pagination');
        // Convert RestaurantRow back to Restaurant format with null safety
        const restaurantData: Restaurant[] = localRestaurants
          .filter(r => r && r.id) // Filter out null/undefined entries first
          .map(r => ({
            id: r.id,
            name: r.name || 'Unknown Restaurant',
            location: {
              latitude: r.latitude || 0,
              longitude: r.longitude || 0,
            },
            image: r.image_url || undefined,
            category: r.category || 'casual',
            rating: r.rating || undefined,
            priceRange: r.price_range || undefined,
            description: r.description || undefined,
          }));

        setRestaurants(prev => {
          const existing = new Set(prev.map((r: Restaurant) => r.id));
          const merged = [...prev, ...restaurantData.filter(r => r && r.id && !existing.has(r.id))];
          console.log(`📊 Set ${merged.length} restaurants (merged from local)`);
          return merged;
        });
        setHasMore(localRestaurants.length === SERVER_PAGE_SIZE);
      } else {
        console.log('🌐 Attempting to load from server...');
        // For first page or no local data, fetch from server
        try {
          const { items: serverData, total } = await restaurantService.getRestaurantsPageWithCount(targetPage, SERVER_PAGE_SIZE);
          console.log(`🌐 Server returned ${serverData.length} restaurants, total: ${total}`);

          // Log sample server data
          if (serverData.length > 0) {
            console.log('📋 Sample server restaurant:', {
              id: serverData[0].id,
              name: serverData[0].name,
              category: serverData[0].category,
              location: serverData[0].location,
            });
          }

          // Convert to local format and save to database
          const localFormatData: RestaurantRow[] = serverData.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description || undefined,
            address: null, // Will be derived from geocoding
            latitude: r.location?.latitude || null,
            longitude: r.location?.longitude || null,
            category: r.category || 'casual',
            price_range: r.priceRange || null,
            rating: r.rating || null,
            image_url: r.image || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _sync_status: 'synced' as const,
            _last_modified: new Date().toISOString(),
          }));

          console.log('💾 Saving to local database...');
          // Save to local database
          await DatabaseService.saveRestaurants(localFormatData);
          console.log('✅ Saved to local database');

          if (targetPage === 1) {
            setRestaurants(serverData);
            console.log(`📊 Set ${serverData.length} restaurants (from server)`);
          } else if (serverData.length > 0) {
            setRestaurants(prev => {
              const existing = new Set(prev.map((r: Restaurant) => r.id));
              const merged = [...prev, ...serverData.filter(r => r && r.id && !existing.has(r.id))];
              console.log(`📊 Set ${merged.length} restaurants (merged from server)`);
              return merged;
            });
          }
          const more = typeof total === 'number'
            ? (targetPage * SERVER_PAGE_SIZE) < total
            : (serverData.length === SERVER_PAGE_SIZE);
          setHasMore(more);
          console.log(`✅ Loaded ${serverData.length} restaurants from server, hasMore: ${more}`);
        } catch (serverError) {
          console.error('❌ Server error:', serverError);

          // Fallback to local data if server fails
          if (localRestaurants.length > 0) {
            console.log('🔄 Falling back to local data');
            // Convert RestaurantRow back to Restaurant format with null safety
            const restaurantData: Restaurant[] = localRestaurants
              .filter(r => r && r.id) // Filter out null/undefined entries first
              .map(r => ({
                id: r.id,
                name: r.name || 'Unknown Restaurant',
                location: {
                  latitude: r.latitude || 0,
                  longitude: r.longitude || 0,
                },
                image: r.image_url || undefined,
                category: r.category || 'casual',
                rating: r.rating || undefined,
                priceRange: r.price_range || undefined,
                description: r.description || undefined,
              }));

            setRestaurants(restaurantData);
            setHasMore(localRestaurants.length === SERVER_PAGE_SIZE);
            console.log(`📱 Using ${localRestaurants.length} restaurants from local database`);
          } else {
            console.log('❌ No data available from any source');
            // No data available
            setRestaurants([]);
            setHasMore(false);
            console.log('❌ No restaurants available');
          }
        }
      }
    } catch (error) {
      console.error('❌ HomeScreen: Failed to load restaurants page:', error);
      console.error('❌ Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name,
      });
      Alert.alert('Connection Error', 'Unable to load restaurants. Please check your internet connection and try again.');
      // Set empty array to prevent crashes
      if (targetPage === 1) {
        setRestaurants([]);
      }
    } finally {
      setIsLoadingPage(false);
      isLoadingRef.current = false;
    }
  }, []);

  const onRefresh = useCallback(async () => {
    if (isLoadingPage) return;
    try {
      setRefreshing(true);
      setServerPage(1);
      setHasMore(true);
      clearAddressCache();
      geocodeActiveRef.current = 0;
      geocodeQueueRef.current = [];
      queuedRef.current.clear();
      await loadPage(1);
    } finally {
      setRefreshing(false);
    }
  }, [loadPage, isLoadingPage]);

  // Load initial data on mount
  useEffect(() => {
    console.log('🏠 HomeScreen: Loading initial data...');

    const loadInitialData = async () => {
      try {
        // Check if database is ready
        console.log('🔍 Checking database readiness...');
        const isDbReady = DatabaseService.isDatabaseReady();
        console.log('📊 Database ready:', isDbReady);

        if (!isDbReady) {
          console.log('⏳ Waiting for database initialization...');
          // Wait a bit for database to initialize
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setServerPage(1);
        await loadPage(1);
      } catch (error) {
        console.error('❌ Failed to load initial data:', error);
        setHasError(true);
        setRestaurants([]);
        setIsLoadingPage(false);
      }
    };

    loadInitialData();
  }, [loadPage]);

  // Refresh restaurants when screen comes into focus (e.g., after rating a restaurant)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🏠 HomeScreen focused - refreshing restaurants');
      // Refresh the first page to get updated ratings
      setServerPage(1);
      setRestaurants([]);
      loadPage(1);
    });

    return unsubscribe;
  }, [navigation, loadPage]);

  useEffect(() => {
    isLoadingRef.current = isLoadingPage;
  }, [isLoadingPage]);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    if (!hasMore || isLoadingPage || refreshing) return;
    if (autoLoadTimerRef.current) {
      clearTimeout(autoLoadTimerRef.current);
    }
    autoLoadTimerRef.current = setTimeout(() => {
      if (hasMoreRef.current && !isLoadingRef.current && !refreshingRef.current) {
        setServerPage((sp) => {
          const next = sp + 1;
          loadPage(next);
          return next;
        });
      }
    }, 400);
    return () => {
      if (autoLoadTimerRef.current) {
        clearTimeout(autoLoadTimerRef.current);
      }
    };
  }, [restaurants.length, hasMore, isLoadingPage, refreshing, serverPage, loadPage]);

  useEffect(() => {
    console.log('🏠 HomeScreen: Restaurants state updated:', restaurants?.length || 0);

    // Safety check - ensure restaurants is an array
    if (!Array.isArray(restaurants)) {
      console.error('❌ Restaurants state is not an array:', restaurants);
      return;
    }

    console.log('📍 HomeScreen: Restaurant locations:', restaurants.map(r => ({
      name: r?.name || 'Unknown',
      lat: r?.location?.latitude,
      lng: r?.location?.longitude,
      valid: !!(r?.location?.latitude && r?.location?.longitude)
    })));
  }, [restaurants]);

  // Categorize restaurants using centralized config
  const categorizedRestaurants = useMemo(() => {
    if (!restaurants || !Array.isArray(restaurants) || restaurants.length === 0) {
      console.log('📋 No restaurants to categorize');
      return [];
    }

    console.log(`🏷️ Categorizing ${restaurants.length} restaurants`);

    return restaurants
      .filter((restaurant): restaurant is Restaurant => {
        // Extra safety check - ensure restaurant exists and has required fields
        if (!restaurant) {
          console.warn('⚠️ Filtering out null restaurant');
          return false;
        }
        if (!restaurant.id) {
          console.warn('⚠️ Filtering out restaurant without id:', restaurant);
          return false;
        }
        if (!restaurant.name) {
          console.warn('⚠️ Filtering out restaurant without name:', restaurant);
          return false;
        }
        return true;
      })
      .map((restaurant) => {
        const categoryConfig = resolveCategoryConfig(restaurant.category, restaurant.name);

        const categorized: CategorizedRestaurant = {
          ...restaurant,
          category: categoryConfig.name
        };

        console.log('🏷️ Categorized restaurant:', restaurant.name, '->', categoryConfig.name, 'color:', categoryConfig.color, 'emoji:', categoryConfig.emoji);

        return categorized;
      });
  }, [restaurants]);

  const parseAddressFromName = (fullName: string): string => {
    const parts = fullName.split(', ');
    if (parts.length >= 2) {
      // Remove the restaurant name (first part) and return the address
      const addressParts = parts.slice(1);
      return addressParts.join(', ');
    }
    return fullName; // Fallback to full name if parsing fails
  };

  const filteredRestaurants = useMemo(() => {
    // Safety check - ensure we always return an array
    if (!categorizedRestaurants || !Array.isArray(categorizedRestaurants)) {
      console.log('📋 categorizedRestaurants is not an array, returning empty');
      return [];
    }

    console.log(`🔍 Filtering ${categorizedRestaurants.length} categorized restaurants`);

    return categorizedRestaurants.filter((restaurant) => {
      // Safety check
      if (!restaurant) {
        console.warn('⚠️ Filtering out null categorized restaurant');
        return false;
      }

      if (!restaurant.id) {
        console.warn('⚠️ Filtering out categorized restaurant without id:', restaurant);
        return false;
      }

      if (!restaurant.name) {
        console.warn('⚠️ Filtering out categorized restaurant without name:', restaurant);
        return false;
      }

      // Text search filter
      const matchesSearch = restaurant.name.toLowerCase().includes(debouncedSearchText.toLowerCase());

      // Category filter
      const matchesCategory = selectedCategory === 'all' || restaurant.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [categorizedRestaurants, debouncedSearchText, selectedCategory]);

  const visibleRestaurants = useMemo(() => {
    // Safety check - ensure we always return an array
    if (!filteredRestaurants || !Array.isArray(filteredRestaurants)) {
      return [];
    }
    return filteredRestaurants;
  }, [filteredRestaurants]);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearchText(searchText), 300);
    return () => clearTimeout(h);
  }, [searchText]);

  useEffect(() => {
    geocodeActiveRef.current = 0;
    geocodeQueueRef.current = [];
    queuedRef.current.clear();
  }, [debouncedSearchText, selectedCategory]);

  useEffect(() => {
    const processQueue = () => {
      while (geocodeActiveRef.current < GEOCODE_CONCURRENCY && geocodeQueueRef.current.length > 0) {
        const id = geocodeQueueRef.current.shift() as string;
        const restaurant = visibleRestaurants.find(r => r.id === id);
        if (!restaurant) {
          queuedRef.current.delete(id);
          continue;
        }
        geocodeActiveRef.current += 1;
        getRestaurantAddress(restaurant)
          .catch(() => {})
          .finally(() => {
            geocodeActiveRef.current -= 1;
            queuedRef.current.delete(id);
            processQueue();
          });
      }
    };

    const toQueue = visibleRestaurants
      .filter(r => !addressCache[r.id] && !geocodingInProgress.has(r.id) && !queuedRef.current.has(r.id))
      .map(r => r.id);

    if (toQueue.length > 0) {
      toQueue.forEach(id => {
        geocodeQueueRef.current.push(id);
        queuedRef.current.add(id);
      });
      processQueue();
    }
  }, [visibleRestaurants, addressCache, geocodingInProgress]);

  // RestaurantCard component that handles address display
  const RestaurantCard = useCallback(({ restaurant }: { restaurant: CategorizedRestaurant }) => {
    // Safety checks - comprehensive null checking
    if (!restaurant) {
      console.error('❌ RestaurantCard: restaurant prop is null/undefined');
      return null;
    }

    if (!restaurant.id) {
      console.error('❌ RestaurantCard: restaurant missing id:', restaurant);
      return null;
    }

    if (!restaurant.name) {
      console.error('❌ RestaurantCard: restaurant missing name:', restaurant);
      return null;
    }

    // Safe access to location
    const latitude = restaurant.location?.latitude;
    const longitude = restaurant.location?.longitude;

    const address = addressCache[restaurant.id] || '📍 Loading address...';
    const categoryConfig = resolveCategoryConfig(restaurant.category, restaurant.name);

    console.log('🍽️ Rendering restaurant card:', restaurant.name, 'address:', address);

    return (
      <TouchableOpacity
        onPress={() => {
          console.log('👆 Navigating to restaurant:', restaurant.id);
          navigation.navigate('RestaurantDetail', {
            restaurantId: restaurant.id,
            restaurant: restaurant
          });
        }}
        style={styles.card}
      >
        <View style={styles.cardContent}>
          <Image
            source={{
              uri: (restaurant.image && isValidHttpUrl(restaurant.image)) ? (restaurant.image as string) : getPlaceholderImage(restaurant.category || 'casual')
            }}
            style={styles.restaurantImage}
            contentFit="cover"
            transition={300}
            onError={() => {
              console.log('🖼️ Image load error for', restaurant.name || 'Unknown');
            }}
          />
          <View style={styles.cardTextContent}>
            <Text style={styles.cardTitle}>
              {restaurant.name ? restaurant.name.split(', ')[0] : 'Unknown Restaurant'}
            </Text>
            <Text style={styles.cardLocation}>
              {address}
            </Text>
            <Text style={styles.cardCategory}>
              {categoryConfig.emoji} {categoryConfig.label}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text style={{ color: '#FFD700' }}>
                {(() => {
                  const r = Math.round(restaurant.rating || 0);
                  const full = '★'.repeat(Math.max(0, Math.min(5, r)));
                  const empty = '☆'.repeat(5 - Math.max(0, Math.min(5, r)));
                  return full + empty;
                })()}
              </Text>
              <Text style={{ marginLeft: 6, color: DESIGN_COLORS.textSecondary }}>
                {typeof restaurant.rating === 'number' ? restaurant.rating.toFixed(1) : 'No ratings yet'}
              </Text>
              <Text style={{ marginLeft: 10, color: DESIGN_COLORS.textPrimary }}>
                {restaurant.priceRange || '₱'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [addressCache, navigation]);

  const renderListFooter = useCallback(() => {
    if (!hasMore && !isLoadingPage) {
      return <View style={{ height: 16 }} />;
    }

    if (isLoadingPage) {
      return (
        <View style={styles.footer}> 
          <ActivityIndicator style={styles.footerSpinner} color="#4A90E2" size="small" />
        </View>
      );
    }

    return null;
  }, [hasMore, isLoadingPage, theme]);

  // Error boundary - show error screen if something went wrong
  if (hasError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ fontSize: 24, marginBottom: 16 }}>\u26a0\ufe0f</Text>
        <Text style={{ fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 8 }}>
          Something went wrong
        </Text>
        <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 20 }}>
          The app encountered an error. Please try again.
        </Text>
        <TouchableOpacity
          onPress={() => {
            setHasError(false);
            setRestaurants([]);
            setIsLoadingPage(false);
            // Retry loading
            loadPage(1);
          }}
          style={{ backgroundColor: '#4A90E2', padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontSize: 16 }}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 12, padding: 12 }}
        >
          <Text style={{ color: '#666', fontSize: 14 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading screen if still loading first page
  if (isLoadingPage && restaurants.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading restaurants...</Text>
      </View>
    );
  }
  
  // Safety check - if no restaurants and not loading, show empty state
  if (!isLoadingPage && restaurants.length === 0) {
    return (
      <View style={styles.container}>
        <Header />
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, color: '#666', textAlign: 'center' }}>
            No restaurants found.
          </Text>
          <Text style={{ fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' }}>
            Pull down to refresh or check your connection.
          </Text>
          <TouchableOpacity
            onPress={async () => {
              console.log('🔄 Force refresh triggered');
              const isDbReady = DatabaseService.isDatabaseReady();
              console.log('📊 Database ready:', isDbReady);

              const stats = await DatabaseService.getDatabaseStats();
              console.log('📊 Database stats:', stats);

              // Force reload page 1
              await loadPage(1);
            }}
            style={{ marginTop: 16, padding: 12, backgroundColor: '#4A90E2', borderRadius: 8 }}
          >
            <Text style={{ color: 'white', fontSize: 16 }}>🔄 Force Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Final safety check before rendering
  try {
    return (
      <View style={styles.container}>
        <Header />
        {/* Offline mode removed for stability */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search restaurants"
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchBar}
          placeholderTextColor={DESIGN_COLORS.textPlaceholder}
        />
        <Text style={styles.searchIcon}>🔍</Text>
        
        {/* Category Filter Button */}
        <TouchableOpacity
          style={styles.categoryButton}
          onPress={() => setShowCategoryModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.categoryButtonEmoji}>
            {restaurantCategories.find(c => c.value === selectedCategory)?.emoji || '🍽️'}
          </Text>
          <Text style={styles.categoryButtonLabel}>
            {restaurantCategories.find(c => c.value === selectedCategory)?.label || 'All'}
          </Text>
          <Text style={styles.dropdownIcon}>▼</Text>
        </TouchableOpacity>
      </View>

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
        {visibleRestaurants && visibleRestaurants.length > 0 ? (
          <MapBoxWebView restaurants={visibleRestaurants} />
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>
              {restaurants.length === 0 ? '🔄 Loading restaurants...' : '🔍 No restaurants match your search'}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        style={styles.cardsContainer}
        data={visibleRestaurants || []}
        keyExtractor={(item) => item?.id || Math.random().toString()}
        renderItem={({ item }) => {
          // Safety check - skip if item is invalid
          if (!item) {
            console.warn('⚠️ FlatList renderItem: item is null/undefined');
            return null;
          }

          if (!item.id) {
            console.warn('⚠️ FlatList renderItem: item missing id:', item);
            return null;
          }

          if (!item.name) {
            console.warn('⚠️ FlatList renderItem: item missing name:', item);
            return null;
          }

          console.log('📋 Rendering item:', item.name);
          return <RestaurantCard restaurant={item as CategorizedRestaurant} />;
        }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={() => {
          if (isLoadingPage || refreshing) return;
          if (hasMore) {
            setServerPage((sp) => {
              const next = sp + 1;
              loadPage(next);
              return next;
            });
          }
        }}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        ListEmptyComponent={
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {restaurants.length === 0 ? 'No restaurants loaded yet' : 'No restaurants match your search'}
            </Text>
          </View>
        }
        ListFooterComponent={renderListFooter}
      />
    </View>
  );
  } catch (error) {
    console.error('❌ Fatal error rendering HomeScreen:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 24, marginBottom: 16 }}>⚠️</Text>
        <Text style={{ fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 8 }}>
          Unable to load screen
        </Text>
        <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 20 }}>
          A critical error occurred. Please restart the app.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ backgroundColor: '#4A90E2', padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontSize: 16 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80, // Account for header
    backgroundColor: DESIGN_COLORS.background,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    zIndex: 90,
  },
  backText: {
    fontSize: 35,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  searchContainer: {
    position: 'absolute',
    top: 27,
    left: 80,
    right: 20,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 90,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingRight: 40,
    backgroundColor: DESIGN_COLORS.cardBackground,
    color: DESIGN_COLORS.textPrimary,
    borderColor: DESIGN_COLORS.border,
  },
  searchIcon: {
    position: 'absolute',
    right: 16,
    fontSize: 18,
  },
  categoryButton: {
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: DESIGN_COLORS.buttonBackground,
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 100,
  },
  categoryButtonEmoji: {
    fontSize: 16,
  },
  categoryButtonLabel: {
    fontSize: 13,
    color: DESIGN_COLORS.textPrimary,
    fontWeight: '500',
  },
  dropdownIcon: {
    fontSize: 10,
    color: DESIGN_COLORS.textPrimary,
    marginLeft: 2,
  },
  mapContainer: {
    flex: 1,
    marginTop: 10,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    overflow: 'hidden',
    backgroundColor: DESIGN_COLORS.cardBackground,
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 0,
    backgroundColor: DESIGN_COLORS.background,
  },
  card: {
    backgroundColor: DESIGN_COLORS.cardBackground,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  restaurantImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#f0f0f0',
  },
  cardTextContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
    marginBottom: 8,
  },
  cardLocation: {
    fontSize: 14,
    color: DESIGN_COLORS.textSecondary,
    marginBottom: 4,
  },
  cardCategory: {
    fontSize: 14,
    color: DESIGN_COLORS.textPrimary,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 4,
    zIndex: 10,
  },
  favoriteIcon: {
    fontSize: 28,
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
    backgroundColor: DESIGN_COLORS.cardBackground,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    color: DESIGN_COLORS.textPrimary,
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DESIGN_COLORS.background,
  },
  footerSpinner: {
    marginBottom: 8,
  },
});

export default HomeScreen;
