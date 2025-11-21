import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant } from '../../types';
import { Category } from '../../types';
import { getAllCategories } from './categoryService';
import { restaurantService } from './restaurantService';

const CACHE_KEYS = {
  RESTAURANTS: 'cached_restaurants',
  CATEGORIES: 'cached_categories',
  CACHE_TIMESTAMP: 'cache_timestamp',
  LAST_UPDATE: 'last_update_timestamp'
};

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class OfflineService {
  // Cache restaurant data
  static async cacheRestaurants(restaurants: Restaurant[]): Promise<void> {
    try {
      const cacheData = {
        data: restaurants,
        timestamp: Date.now(),
        version: '1.0'
      };
      await AsyncStorage.setItem(CACHE_KEYS.RESTAURANTS, JSON.stringify(cacheData));
      await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
      console.log('📱 Cached', restaurants.length, 'restaurants offline');
    } catch (error) {
      console.error('❌ Failed to cache restaurants:', error);
    }

  // Get a single page with offline fallback and cache merge
  static async getRestaurantsPageWithOffline(page: number, pageSize: number): Promise<{
    restaurants: Restaurant[],
    isOffline: boolean
  }> {
    try {
      const pageData = await restaurantService.getRestaurantsPage(page, pageSize);
      // Merge page into cache (dedupe by id)
      const cached = (await this.getCachedRestaurants()) || [];
      const existing = new Set(cached.map((r: Restaurant) => r.id));
      const merged = [...cached, ...pageData.filter(r => !existing.has(r.id))];
      await this.cacheRestaurants(merged);
      return { restaurants: pageData, isOffline: false };
    } catch (error) {
      console.log('📱 Page fetch failed, using offline cache if available');
      const cached = await this.getCachedRestaurants();
      if (cached && cached.length > 0) {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return { restaurants: cached.slice(start, end), isOffline: true };
      }
      throw error;
    }
  }

  // Get cached restaurants
  static async getCachedRestaurants(): Promise<Restaurant[] | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.RESTAURANTS);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now - cacheData.timestamp > CACHE_DURATION) {
        console.log('📱 Restaurant cache expired');
        await this.clearRestaurantCache();
        return null;
      }

      console.log('📱 Loaded', cacheData.data.length, 'restaurants from cache');
      return cacheData.data;
    } catch (error) {
      console.error('❌ Failed to load cached restaurants:', error);
      return null;
    }
  }

  // Cache category data
  static async cacheCategories(categories: Category[]): Promise<void> {
    try {
      const cacheData = {
        data: categories,
        timestamp: Date.now(),
        version: '1.0'
      };
      await AsyncStorage.setItem(CACHE_KEYS.CATEGORIES, JSON.stringify(cacheData));
      console.log('📱 Cached', categories.length, 'categories offline');
    } catch (error) {
      console.error('❌ Failed to cache categories:', error);
    }
  }

  // Get cached categories
  static async getCachedCategories(): Promise<Category[] | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.CATEGORIES);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now - cacheData.timestamp > CACHE_DURATION) {
        console.log('📱 Category cache expired');
        await this.clearCategoryCache();
        return null;
      }

      console.log('📱 Loaded', cacheData.data.length, 'categories from cache');
      return cacheData.data;
    } catch (error) {
      console.error('❌ Failed to load cached categories:', error);
      return null;
    }
  }

  // Clear all caches
  static async clearAllCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        CACHE_KEYS.RESTAURANTS,
        CACHE_KEYS.CATEGORIES,
        CACHE_KEYS.CACHE_TIMESTAMP,
        CACHE_KEYS.LAST_UPDATE
      ]);
      console.log('📱 Cleared all offline cache');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  // Clear restaurant cache
  static async clearRestaurantCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.RESTAURANTS);
      console.log('📱 Cleared restaurant cache');
    } catch (error) {
      console.error('❌ Failed to clear restaurant cache:', error);
    }
  }

  // Clear category cache
  static async clearCategoryCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.CATEGORIES);
      console.log('📱 Cleared category cache');
    } catch (error) {
      console.error('❌ Failed to clear category cache:', error);
    }
  }

  // Get cache info
  static async getCacheInfo(): Promise<{
    hasRestaurants: boolean;
    hasCategories: boolean;
    lastUpdate: number | null;
    cacheSize: string;
  }> {
    try {
      const restaurants = await AsyncStorage.getItem(CACHE_KEYS.RESTAURANTS);
      const categories = await AsyncStorage.getItem(CACHE_KEYS.CATEGORIES);
      const lastUpdate = await AsyncStorage.getItem(CACHE_KEYS.LAST_UPDATE);

      let cacheSize = '0 KB';
      if (restaurants || categories) {
        const totalSize = (restaurants?.length || 0) + (categories?.length || 0);
        cacheSize = (totalSize / 1024).toFixed(2) + ' KB';
      }

      return {
        hasRestaurants: !!restaurants,
        hasCategories: !!categories,
        lastUpdate: lastUpdate ? parseInt(lastUpdate) : null,
        cacheSize
      };
    } catch (error) {
      console.error('❌ Failed to get cache info:', error);
      return {
        hasRestaurants: false,
        hasCategories: false,
        lastUpdate: null,
        cacheSize: '0 KB'
      };
    }
  }

  // Sync data - fetch from server and cache
  static async syncData(): Promise<{ restaurants: Restaurant[], categories: Category[] }> {
    try {
      console.log('📱 Starting data sync...');

      // Fetch fresh data
      const [restaurants, categories] = await Promise.all([
        restaurantService.getAllRestaurants(),
        getAllCategories()
      ]);

      // Cache the data
      await Promise.all([
        this.cacheRestaurants(restaurants),
        this.cacheCategories(categories)
      ]);

      console.log('📱 Data sync completed successfully');
      return { restaurants, categories };
    } catch (error) {
      console.error('❌ Data sync failed:', error);
      throw error;
    }
  }

  // Get data with offline fallback
  static async getDataWithOfflineFallback(): Promise<{
    restaurants: Restaurant[],
    categories: Category[],
    isOffline: boolean
  }> {
    try {
      // Try to sync fresh data first
      const freshData = await this.syncData();
      return {
        ...freshData,
        isOffline: false
      };
    } catch (syncError) {
      console.log('📱 Sync failed, trying offline cache:', syncError);

      // Fall back to cached data
      const cachedRestaurants = await this.getCachedRestaurants();
      const cachedCategories = await this.getCachedCategories();

      if (cachedRestaurants && cachedCategories) {
        console.log('📱 Using offline cached data');
        return {
          restaurants: cachedRestaurants,
          categories: cachedCategories,
          isOffline: true
        };
      }

      // No cached data available
      console.log('📱 No cached data available');
      throw new Error('No data available - check your internet connection');
    }
  }
}
