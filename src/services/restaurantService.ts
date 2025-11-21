import { supabase } from '../../services/firebase';
import { TABLES } from '../config/supabase';
import { Restaurant } from '../../types';

export interface CreateRestaurantData {
  name: string;
  description?: string;
  category?: string;
  priceRange?: string;
  location: string; // We'll parse this into coordinates
  imageUrl?: string;
  phone?: string;
  website?: string;
  hours?: string;
}

class RestaurantService {
  private readonly RESTAURANTS_TABLE = TABLES.RESTAURANTS;

  /**
   * Create a new restaurant
   */
  async createRestaurant(restaurantData: CreateRestaurantData): Promise<Restaurant> {
    try {
      console.log('🍽️ Creating restaurant:', restaurantData);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }
      // Check if user already has a restaurant
      const existingRestaurant = await this.getRestaurantByOwnerId(user.id);
      if (existingRestaurant) {
        throw new Error('You can only create one restaurant per account');
      }

      // Parse location string into coordinates (basic implementation)
      // In a real app, you'd use geocoding service
      const location = this.parseLocationString(restaurantData.location);

      const restaurant: Omit<Restaurant, 'id'> = {
        name: restaurantData.name,
        description: restaurantData.description || '',
        category: restaurantData.category || '',
        priceRange: restaurantData.priceRange || '$',
        location,
        image: restaurantData.imageUrl || '',
        phone: restaurantData.phone || '',
        website: restaurantData.website || '',
        hours: restaurantData.hours || '',
        rating: 0, // Default rating
      };

      const { data, error } = await supabase
        .from(this.RESTAURANTS_TABLE)
        .insert({
          name: restaurant.name,
          description: restaurant.description,
          category: restaurant.category,
          price_range: restaurant.priceRange,
          location: restaurant.location,
          image: restaurant.image,
          phone: restaurant.phone,
          website: restaurant.website,
          hours: restaurant.hours,
          rating: restaurant.rating,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Transform the data back to match our Restaurant interface
      const createdRestaurant: Restaurant = {
        id: data.id,
        name: data.name,
        location: data.location,
        image: data.image,
        category: data.category,
        rating: data.rating,
        priceRange: data.price_range,
        description: data.description,
        phone: data.phone,
        hours: data.hours,
        website: data.website,
      };

      console.log('✅ Restaurant created successfully:', createdRestaurant);
      return createdRestaurant;
    } catch (error: any) {
      console.error('❌ Error creating restaurant:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get restaurant by owner ID
   */
  async getRestaurantByOwnerId(ownerId: string): Promise<Restaurant | null> {
    try {
      console.log('🔍 Fetching restaurant by owner ID:', ownerId);

      const { data, error } = await supabase
        .from(this.RESTAURANTS_TABLE)
        .select('*')
        .eq('owner_id', ownerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      // Transform the data to match our Restaurant interface
      let location: { latitude: number; longitude: number };
      if (data.location && typeof data.location === 'object' && 'latitude' in data.location && 'longitude' in data.location) {
        // New format: location is a JSONB object
        location = {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
        };
      } else if (data.latitude && data.longitude) {
        // Old format: separate latitude/longitude fields
        location = {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
        };
      } else {
        // Fallback: default location
        console.warn('⚠️ Restaurant missing location data:', data.name);
        location = {
          latitude: 40.7128, // Default to NYC
          longitude: -74.0060,
        };
      }

      const restaurant: Restaurant = {
        id: data.id,
        name: data.name,
        location,
        image: data.image,
        category: data.category,
        rating: data.rating,
        priceRange: data.price_range,
        description: data.description,
        phone: data.phone,
        hours: data.hours,
        website: data.website,
      };

      console.log('✅ Retrieved restaurant by owner:', restaurant);
      return restaurant;
    } catch (error: any) {
      console.error('❌ Error fetching restaurant by owner:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get all restaurants
   */
  async getAllRestaurants(): Promise<Restaurant[]> {
    try {
      console.log('📋 Fetching all restaurants...');

      const { data, error } = await supabase
        .from(this.RESTAURANTS_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our Restaurant interface
      const restaurants: Restaurant[] = data.map(item => {
        // Handle both location formats: JSONB object or separate lat/lng fields
        let location: { latitude: number; longitude: number };
        if (item.location && typeof item.location === 'object' && 'latitude' in item.location && 'longitude' in item.location) {
          // New format: location is a JSONB object
          location = {
            latitude: item.location.latitude,
            longitude: item.location.longitude,
          };
        } else if (item.latitude && item.longitude) {
          // Old format: separate latitude/longitude fields
          location = {
            latitude: parseFloat(item.latitude),
            longitude: parseFloat(item.longitude),
          };
        } else {
          // Fallback: default location
          console.warn('⚠️ Restaurant missing location data:', item.name);
          location = {
            latitude: 40.7128, // Default to NYC
            longitude: -74.0060,
          };
        }

        return {
          id: item.id,
          name: item.name,
          location,
          image: item.image,
          category: item.category,
          rating: item.rating,
          priceRange: item.price_range,
          description: item.description,
          phone: item.phone,
          hours: item.hours,
          website: item.website,
        };
      });

      console.log('✅ Retrieved restaurants:', restaurants.length);
      return restaurants;
    } catch (error: any) {
      console.error('❌ Error fetching restaurants:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async getRestaurantsPage(page: number, pageSize: number): Promise<Restaurant[]> {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from(this.RESTAURANTS_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const restaurants: Restaurant[] = (data || []).map((item: any) => {
        let location: { latitude: number; longitude: number };
        if (item.location && typeof item.location === 'object' && 'latitude' in item.location && 'longitude' in item.location) {
          location = { latitude: item.location.latitude, longitude: item.location.longitude };
        } else if (item.latitude && item.longitude) {
          location = {
            latitude: parseFloat(item.latitude),
            longitude: parseFloat(item.longitude),
          };
        } else {
          location = { latitude: 40.7128, longitude: -74.0060 };
        }

        return {
          id: item.id,
          name: item.name,
          location,
          image: item.image,
          category: item.category,
          rating: item.rating,
          priceRange: item.price_range,
          description: item.description,
          phone: item.phone,
          hours: item.hours,
          website: item.website,
        } as Restaurant;
      });

      return restaurants;
    } catch (error: any) {
      console.error('❌ Error fetching restaurants page:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get restaurant by ID
   */
  async getRestaurantById(id: string): Promise<Restaurant | null> {
    try {
      console.log('🔍 Fetching restaurant by ID:', id);

      const { data, error } = await supabase
        .from(this.RESTAURANTS_TABLE)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      // Transform the data to match our Restaurant interface
      let location: { latitude: number; longitude: number };
      if (data.location && typeof data.location === 'object' && 'latitude' in data.location && 'longitude' in data.location) {
        // New format: location is a JSONB object
        location = {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
        };
      } else if (data.latitude && data.longitude) {
        // Old format: separate latitude/longitude fields
        location = {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
        };
      } else {
        // Fallback: default location
        console.warn('⚠️ Restaurant missing location data:', data.name);
        location = {
          latitude: 40.7128, // Default to NYC
          longitude: -74.0060,
        };
      }

      const restaurant: Restaurant = {
        id: data.id,
        name: data.name,
        location,
        image: data.image,
        category: data.category,
        rating: data.rating,
        priceRange: data.price_range,
        description: data.description,
        phone: data.phone,
        hours: data.hours,
        website: data.website,
      };

      console.log('✅ Retrieved restaurant:', restaurant);
      return restaurant;
    } catch (error: any) {
      console.error('❌ Error fetching restaurant:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Parse location string into coordinates
   * Basic implementation - in production, use geocoding service
   */
  private parseLocationString(locationString: string): { latitude: number; longitude: number } {
    // Default coordinates (e.g., center of a city)
    // In production, implement proper geocoding
    const defaultCoords = {
      latitude: 40.7128, // New York City coordinates as default
      longitude: -74.0060,
    };

    // Try to extract coordinates if they exist in the string
    const coordMatch = locationString.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coordMatch) {
      return {
        latitude: parseFloat(coordMatch[1]),
        longitude: parseFloat(coordMatch[2]),
      };
    }

    // For now, return default coordinates
    // TODO: Implement proper geocoding service integration
    console.warn('⚠️ Using default coordinates for location:', locationString);
    return defaultCoords;
  }

  private getErrorMessage(error: any): string {
    // Map Supabase errors to user-friendly messages
    if (error.message?.includes('duplicate key')) {
      return 'A restaurant with this name already exists';
    }
    if (error.message?.includes('violates check constraint')) {
      return 'Invalid data provided';
    }
    if (error.message?.includes('permission denied')) {
      return 'You do not have permission to perform this action';
    }

    return error.message || 'An error occurred while managing restaurants';
  }
}

export const restaurantService = new RestaurantService();
