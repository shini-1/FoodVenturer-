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
import { crashLogger } from '../src/services/crashLogger';

import { Restaurant } from '../types';

// Error boundary component
class HomeScreenErrorBoundary extends React.Component<
  { children: React.ReactNode; navigation: any },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; navigation: any }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ HomeScreen Error Boundary caught an error:', error, errorInfo);
    crashLogger.logError(error, {
      component: 'HomeScreen',
      screen: 'HomeScreen',
      additionalContext: {
        errorBoundary: true,
        errorInfo
      }
    });
  }

  render() {
    if (this.state.hasError) {
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
            onPress={() => this.props.navigation.goBack()}
            style={{ backgroundColor: '#4A90E2', padding: 12, borderRadius: 8 }}
          >
            <Text style={{ color: 'white', fontSize: 16 }}>Go Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              try {
                const logs = await crashLogger.getLogs();
                console.log('📋 Recent crash logs:', logs.slice(0, 3));
                Alert.alert('Debug Info', `Recent errors: ${crashLogger.getErrorSummary()}`);
              } catch (err) {
                Alert.alert('Debug Info', 'Unable to retrieve error logs');
              }
            }}
            style={{ marginTop: 12, padding: 12 }}
          >
            <Text style={{ color: '#666', fontSize: 14 }}>Show Error Logs</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

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
  console.log('🏠 HomeScreen: Component starting...');
  
  const { theme } = useTheme();
  // const { isOnline } = useNetwork(); // Disabled - not using offline features for now
  
  // Initialize crash logger with fallback
  const [crashLoggerReady, setCrashLoggerReady] = useState(false);
  
  // Initialize crash logger safely
  useEffect(() => {
    const initLogger = async () => {
      try {
        await crashLogger.initialize();
        setCrashLoggerReady(true);
        crashLogger.logComponentEvent('HomeScreen', 'mount_start');
      } catch (error) {
        console.error('❌ Failed to initialize crash logger:', error);
        setCrashLoggerReady(false);
      }
    };
    initLogger();
  }, []);
    
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

    console.log('🏠 HomeScreen: State initialized successfully');
    if (crashLoggerReady) {
      crashLogger.logComponentEvent('HomeScreen', 'state_initialized');
    }

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
      
      if (crashLoggerReady) {
        crashLogger.logComponentEvent('HomeScreen', 'load_page_start', { page: targetPage });
      }

      // Simplified approach - just try to fetch from server
      console.log('🌐 Attempting to load from server...');
      
      try {
        const { items: serverData, total } = await restaurantService.getRestaurantsPageWithCount(targetPage, SERVER_PAGE_SIZE);
        console.log(`📊 Server returned ${serverData.length} restaurants, total: ${total}`);

        if (targetPage === 1) {
          setRestaurants(serverData || []);
        } else if (serverData && serverData.length > 0) {
          setRestaurants(prev => {
            const existing = new Set(prev.map((r: Restaurant) => r.id));
            const merged = [...prev, ...serverData.filter(r => r && r.id && !existing.has(r.id))];
            console.log(`📊 Set ${merged.length} restaurants (merged from server)`);
            return merged;
          });
        }
        
        const more = typeof total === 'number' ? (targetPage * SERVER_PAGE_SIZE) < total : (serverData?.length === SERVER_PAGE_SIZE);
        setHasMore(more);
        console.log(`✅ Loaded ${serverData?.length || 0} restaurants from server, hasMore: ${more}`);
        
        if (crashLoggerReady) {
          crashLogger.logComponentEvent('HomeScreen', 'load_page_success', { 
            page: targetPage, 
            restaurantsCount: serverData?.length || 0,
            total 
          });
        }
      } catch (serverError) {
        console.error('❌ Server error:', serverError);
        
        if (crashLoggerReady) {
          await crashLogger.logError(serverError as Error, {
            component: 'HomeScreen',
            screen: 'HomeScreen',
            additionalContext: {
              phase: 'load_page_server_error',
              targetPage,
              serverPage
            }
          });
        }
        
        // Set empty state to prevent crashes
        if (targetPage === 1) {
          setRestaurants([]);
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('❌ HomeScreen: Failed to load restaurants page:', error);
      console.error('❌ Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name,
      });
      
      // Log the error for production debugging
      if (crashLoggerReady) {
        await crashLogger.logError(error as Error, {
          component: 'HomeScreen',
          screen: 'HomeScreen',
          additionalContext: {
            phase: 'load_page_error',
            targetPage,
            serverPage,
            restaurantsLength: restaurants?.length
          }
        });
      }
      
      Alert.alert('Connection Error', 'Unable to load restaurants. Please check your internet connection and try again.');
      // Set empty array to prevent crashes
      if (targetPage === 1) {
        setRestaurants([]);
      }
    } finally {
      setIsLoadingPage(false);
      isLoadingRef.current = false;
      if (crashLoggerReady) {
        crashLogger.logComponentEvent('HomeScreen', 'load_page_end', { page: targetPage });
      }
    }
  }, [crashLoggerReady, restaurants?.length, serverPage]);

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
        console.log('🔍 Starting simplified data load...');
        
        if (crashLoggerReady) {
          crashLogger.logComponentEvent('HomeScreen', 'initial_data_load_start');
        }

        setServerPage(1);
        await loadPage(1);
        
        if (crashLoggerReady) {
          crashLogger.logComponentEvent('HomeScreen', 'initial_data_load_success');
        }
      } catch (error) {
        console.error('❌ Failed to load initial data:', error);
        console.error('❌ Initial load error details:', {
          message: (error as Error).message,
          stack: (error as Error).stack,
          name: (error as Error).name,
        });
        
        // Log the error for production debugging
        if (crashLoggerReady) {
          await crashLogger.logError(error as Error, {
            component: 'HomeScreen',
            screen: 'HomeScreen',
            additionalContext: {
              phase: 'initial_data_load'
            }
          });
        }
        
        // Set empty state to prevent crashes
        setRestaurants([]);
        setHasError(true);
        setIsLoadingPage(false);
        console.log('🛑 Set empty restaurant array to prevent crashes');
      }
    };

    // Add a small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      loadInitialData();
    }, 100);

    return () => clearTimeout(timer);
  }, [loadPage, crashLoggerReady]);

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
    console.log('🏠 HomeScreen: Restaurants state updated:', restaurants.length);
    console.log('📍 HomeScreen: Restaurant locations:', restaurants.map(r => ({
      name: r.name,
      lat: r.location?.latitude,
      lng: r.location?.longitude,
      valid: !!(r.location?.latitude && r.location?.longitude)
    })));
  }, [restaurants]);

  // Categorize restaurants using centralized config
  const categorizedRestaurants = useMemo(() => {
    if (!restaurants || restaurants.length === 0) return [];

    return restaurants
      .filter((restaurant) => {
        // Safety check - ensure restaurant has required fields
        if (!restaurant || typeof restaurant !== 'object') {
          console.warn('⚠️ Invalid restaurant object:', restaurant);
          return false;
        }
        if (!restaurant.id || typeof restaurant.id !== 'string') {
          console.warn('⚠️ Restaurant missing valid id:', restaurant);
          return false;
        }
        if (!restaurant.name || typeof restaurant.name !== 'string') {
          console.warn('⚠️ Restaurant missing valid name:', restaurant);
          return false;
        }
        return true;
      })
      .map((restaurant) => {
        try {
          const categoryConfig = resolveCategoryConfig(restaurant.category, restaurant.name);

          const categorized: CategorizedRestaurant = {
            id: restaurant.id,
            name: restaurant.name,
            location: restaurant.location || { latitude: 0, longitude: 0 },
            image: restaurant.image,
            category: categoryConfig.name, // Override with resolved category
            rating: restaurant.rating,
            priceRange: restaurant.priceRange,
            description: restaurant.description,
            phone: restaurant.phone,
            hours: restaurant.hours,
            website: restaurant.website,
          };

          return categorized;
        } catch (error) {
          console.error('❌ Error categorizing restaurant:', restaurant.name, error);
          // Return a safe fallback
          return {
            id: restaurant.id,
            name: restaurant.name || 'Unknown Restaurant',
            location: { latitude: 0, longitude: 0 },
            image: undefined,
            category: 'casual', // Fallback category
            rating: undefined,
            priceRange: undefined,
            description: undefined,
            phone: undefined,
            hours: undefined,
            website: undefined,
          } as CategorizedRestaurant;
        }
      })
      .filter((restaurant) => restaurant && restaurant.id && restaurant.name); // Final safety filter
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
    if (!categorizedRestaurants || !Array.isArray(categorizedRestaurants)) {
      return [];
    }

    return categorizedRestaurants.filter((restaurant) => {
      // Safety check - ensure restaurant is valid
      if (!restaurant || typeof restaurant !== 'object') {
        return false;
      }
      if (!restaurant.name || typeof restaurant.name !== 'string') {
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
        if (!id) continue;
        
        const restaurant = visibleRestaurants.find(r => r && r.id === id);
        if (!restaurant) {
          queuedRef.current.delete(id);
          continue;
        }
        
        // Additional safety check for restaurant location
        if (!restaurant.location || typeof restaurant.location.latitude !== 'number' || typeof restaurant.location.longitude !== 'number') {
          console.warn('⚠️ Restaurant missing valid location for geocoding:', restaurant.name);
          queuedRef.current.delete(id);
          continue;
        }
        
        geocodeActiveRef.current += 1;
        getRestaurantAddress(restaurant)
          .catch((error) => {
            console.warn('⚠️ Geocoding failed for restaurant:', restaurant.name, error);
          })
          .finally(() => {
            geocodeActiveRef.current -= 1;
            queuedRef.current.delete(id);
            processQueue();
          });
      }
    };

    const toQueue = visibleRestaurants
      .filter(r => r && r.id && !addressCache[r.id] && !geocodingInProgress.has(r.id) && !queuedRef.current.has(r.id))
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
    // Comprehensive safety checks
    if (!restaurant) {
      console.warn('⚠️ RestaurantCard received null restaurant');
      return null;
    }
    
    if (!restaurant.id || typeof restaurant.id !== 'string') {
      console.warn('⚠️ RestaurantCard received restaurant with invalid id:', restaurant);
      return null;
    }
    
    if (!restaurant.name || typeof restaurant.name !== 'string') {
      console.warn('⚠️ RestaurantCard received restaurant with invalid name:', restaurant);
      return null;
    }

    try {
      const address = addressCache[restaurant.id] || '📍 Loading address...';
      const categoryConfig = resolveCategoryConfig(restaurant.category, restaurant.name);

      return (
        <TouchableOpacity
          onPress={() => {
            if (restaurant.id) {
              navigation.navigate('RestaurantDetail', {
                restaurantId: restaurant.id,
                restaurant: restaurant
              });
            }
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
                    const rating = typeof restaurant.rating === 'number' ? restaurant.rating : 0;
                    const r = Math.round(rating);
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
    } catch (error) {
      console.error('❌ Error rendering RestaurantCard for restaurant:', restaurant.name, error);
      return (
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Error loading restaurant</Text>
          </View>
        </View>
      );
    }
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
    // Prevent rendering if we're in an invalid state
    if (!restaurants || !Array.isArray(restaurants)) {
      console.warn('⚠️ Invalid restaurants state, showing loading');
      return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={{ marginTop: 16, color: '#666' }}>Loading restaurants...</Text>
        </View>
      );
    }

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
        {visibleRestaurants && visibleRestaurants.length > 0 && visibleRestaurants.every(r => r && r.id && r.location) ? (
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
        keyExtractor={(item, index) => {
          // Safety check - ensure we have a valid key
          if (!item || !item.id) {
            return `fallback-key-${index}`;
          }
          return item.id;
        }}
        renderItem={({ item, index }) => {
          // Safety check - skip if item is invalid
          if (!item || !item.id || !item.name) {
            console.warn('⚠️ Invalid restaurant item in FlatList:', item, 'at index:', index);
            return null;
          }
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

export default function HomeScreenWrapper({ navigation }: { navigation: any }) {
  return (
    <HomeScreenErrorBoundary navigation={navigation}>
      <HomeScreen navigation={navigation} />
    </HomeScreenErrorBoundary>
  );
}
