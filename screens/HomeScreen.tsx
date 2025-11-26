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
import OfflineBanner from '../components/OfflineBanner';
import { OfflineService } from '../src/services/offlineService';
import { reverseGeocode } from '../src/services/geocodingService';
import { resolveCategoryConfig, getAllCategoryOptions } from '../src/config/categoryConfig';
import { toggleDeviceFavorite, getDeviceFavorites } from '../src/services/deviceFavoritesService';
import { OfflineQueueService } from '../src/services/offlineQueueService';
import { useNetwork } from '../src/contexts/NetworkContext';

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
  const { isOnline } = useNetwork();
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
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load device favorites on mount
  useEffect(() => {
    loadDeviceFavorites();
  }, []);

  const loadDeviceFavorites = async () => {
    try {
      const favoriteIds = await getDeviceFavorites();
      setFavorites(new Set(favoriteIds));
      console.log('❤️ Loaded', favoriteIds.length, 'device favorites');
    } catch (error) {
      console.error('❌ Failed to load favorites:', error);
      // Don't crash - just use empty favorites
      setFavorites(new Set());
    }
  };

  // Toggle favorite status with device-based persistence
  const toggleFavorite = useCallback(async (restaurantId: string) => {
    // Optimistic UI update
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(restaurantId)) {
        newFavorites.delete(restaurantId);
      } else {
        newFavorites.add(restaurantId);
      }
      return newFavorites;
    });

    try {
      if (isOnline) {
        // Online: Save to database immediately
        const isFavorited = await toggleDeviceFavorite(restaurantId);
        console.log(isFavorited ? '❤️ Added to favorites' : '💔 Removed from favorites');
      } else {
        // Offline: Queue for later sync
        await OfflineQueueService.enqueueAction('favorite', {
          restaurantId,
          action: favorites.has(restaurantId) ? 'remove' : 'add'
        });
        console.log('📥 Favorite action queued for sync');
      }
    } catch (error) {
      console.error('❌ Failed to toggle favorite:', error);
      // Revert optimistic update on error
      setFavorites(prev => {
        const newFavorites = new Set(prev);
        if (newFavorites.has(restaurantId)) {
          newFavorites.delete(restaurantId);
        } else {
          newFavorites.add(restaurantId);
        }
        return newFavorites;
      });
      // Show user-friendly message
      Alert.alert('Favorites', 'Could not save favorite. Please try again later.');
    }
  }, [isOnline, favorites]);

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
    if (isLoadingRef.current) return;
    try {
      isLoadingRef.current = true;
      setIsLoadingPage(true);
      console.log(`🏠 HomeScreen: Fetching restaurants page ${targetPage} (size ${SERVER_PAGE_SIZE})`);
      const { restaurants: pageData, total } = await OfflineService.getRestaurantsPageWithOffline(targetPage, SERVER_PAGE_SIZE);
      if (targetPage === 1) {
        setRestaurants(pageData);
      } else if (pageData.length > 0) {
        setRestaurants(prev => {
          const existing = new Set(prev.map((r: Restaurant) => r.id));
          const merged = [...prev, ...pageData.filter(r => !existing.has(r.id))];
          return merged;
        });
      }
      const more = typeof total === 'number'
        ? (targetPage * SERVER_PAGE_SIZE) < total
        : (pageData.length === SERVER_PAGE_SIZE);
      setHasMore(more);
    } catch (error) {
      console.error('❌ HomeScreen: Failed to load restaurants page:', error);
      Alert.alert('Connection Error', 'Unable to load more restaurants. Check your internet and try again.');
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

  useEffect(() => {
    setServerPage(1);
    loadPage(1);
  }, []);

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
  const categorizedRestaurants = useMemo(() => restaurants.map((restaurant) => {
    const categoryConfig = resolveCategoryConfig(restaurant.category, restaurant.name);

    const categorized = {
      ...restaurant,
      category: categoryConfig.name
    };

    console.log('🏷️ Categorized restaurant:', restaurant.name, '->', categoryConfig.name, 'color:', categoryConfig.color, 'emoji:', categoryConfig.emoji);

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
    const matchesSearch = restaurant.name.toLowerCase().includes(debouncedSearchText.toLowerCase());

    // Category filter
    const matchesCategory = selectedCategory === 'all' || restaurant.category === selectedCategory;

    return matchesSearch && matchesCategory;
  }), [categorizedRestaurants, debouncedSearchText, selectedCategory]);

  const visibleRestaurants = useMemo(() => filteredRestaurants, [filteredRestaurants]);

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
    const address = addressCache[restaurant.id] || '📍 Loading address...';
    const isFavorite = favorites.has(restaurant.id);
    const categoryConfig = resolveCategoryConfig(restaurant.category, restaurant.name);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('RestaurantDetail', {
          restaurantId: restaurant.id,
          restaurant: restaurant
        })}
        style={styles.card}
      >
        <View style={styles.cardContent}>
          <Image
            source={{
              uri: isValidHttpUrl(restaurant.image) ? (restaurant.image as string) : getPlaceholderImage(restaurant.category || 'casual')
            }}
            style={styles.restaurantImage}
            contentFit="cover"
            transition={300}
            onError={() => {
              console.log('Image load error for', restaurant.name);
            }}
          />
          <View style={styles.cardTextContent}>
            <Text style={styles.cardTitle}>{restaurant.name.split(', ')[0]}</Text>
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
          {/* Favorite button in top-right */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorite(restaurant.id);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [addressCache, navigation, favorites, toggleFavorite]);

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

  return (
    <View style={styles.container}>
      <Header />
      <OfflineBanner onSyncPress={() => {
        // Refresh data after sync
        try {
          setServerPage(1);
          setRestaurants([]);
          loadPage(1);
        } catch (error) {
          console.error('❌ Failed to refresh after sync:', error);
        }
      }} />
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
        {visibleRestaurants.length > 0 ? (
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
        data={visibleRestaurants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RestaurantCard restaurant={item as CategorizedRestaurant} />
        )}
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

export default HomeScreen;
