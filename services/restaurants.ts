import { app } from './firebase';
import { TABLES } from '../src/config/supabase';
import { Restaurant, RestaurantOwner, RestaurantSubmission } from '../types';
import { parseGoogleMapsUrl } from '../utils/googleMapsParser';

export async function getRestaurants(): Promise<Restaurant[]> {
  try {
    console.log('🔍 Fetching restaurants from Supabase...');

    // Use Supabase instead of Firestore
    const { data, error } = await app
      .from(TABLES.RESTAURANTS)
      .select('*');

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    const restaurants = (data || []).map(item => ({
      id: item.id,
      name: item.name,
      location: {
        latitude: parseFloat(item.latitude || item.location?.latitude),
        longitude: parseFloat(item.longitude || item.location?.longitude),
      },
      image: item.image,
      category: item.category,
      rating: item.rating ? parseFloat(item.rating) : undefined,
      priceRange: item.price_range,
      description: item.description,
      phone: item.phone,
      hours: item.hours,
      website: item.website,
    }));

    console.log(`✅ Retrieved ${restaurants.length} restaurants from Supabase`);
    return restaurants;
  } catch (error) {
    console.error('❌ Error fetching restaurants from Supabase:', error);
    // Return empty array if Supabase fails
    return [];
  }
}

export async function addRestaurant(data: Omit<Restaurant, 'id'>): Promise<void> {
  try {
    console.log('🔍 Adding restaurant to Supabase...');

    const { error } = await app
      .from(TABLES.RESTAURANTS)
      .insert({
        name: data.name,
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        category: (data as any).category,
        rating: (data as any).rating,
        price_range: (data as any).priceRange,
        image: data.image,
        description: data.description,
        phone: data.phone,
        hours: data.hours,
        website: data.website,
      });

    if (error) throw error;

    console.log('✅ Restaurant added successfully');
  } catch (error) {
    console.error('❌ Error adding restaurant:', error);
    throw error;
  }
}

export async function deleteRestaurant(id: string): Promise<void> {
  try {
    console.log('🔍 Deleting restaurant:', id);

    const { error } = await app
      .from(TABLES.RESTAURANTS)
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ Restaurant deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting restaurant:', error);
    throw error;
  }
}

export async function updateRestaurant(id: string, updates: Partial<Restaurant>): Promise<void> {
  try {
    console.log('🔍 Updating restaurant:', id, updates);

    // Prepare the update data for Supabase
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.location) {
      updateData.latitude = updates.location.latitude;
      updateData.longitude = updates.location.longitude;
    }
    if (updates.image !== undefined) updateData.image = updates.image;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.rating !== undefined) updateData.rating = updates.rating;
    if (updates.priceRange !== undefined) updateData.price_range = updates.priceRange;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.hours !== undefined) updateData.hours = updates.hours;
    if (updates.website !== undefined) updateData.website = updates.website;

    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid fields to update');
    }

    // Update the restaurant in Supabase
    const { error } = await app
      .from(TABLES.RESTAURANTS)
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('❌ Supabase update error:', error);
      throw error;
    }

    console.log('✅ Restaurant updated successfully in database');
  } catch (error) {
    console.error('❌ Error updating restaurant:', error);
    throw error;
  }
}

export async function getPendingRestaurants(): Promise<RestaurantSubmission[]> {
  try {
    console.log('🔍 Fetching pending restaurants from Supabase...');

    // Use Supabase instead of Firestore
    const { data, error } = await app
      .from(TABLES.RESTAURANT_SUBMISSIONS) // Use separate submissions table
      .select('*')
      .eq('status', 'pending');

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('🔍 Retrieved submissions:', data?.length || 0);

    // Convert Supabase data to RestaurantSubmission format
    const submissions = (data || []).map(item => ({
      id: item.id,
      ownerId: item.owner_id || item.ownerId,
      businessName: item.business_name || item.businessName || item.name,
      ownerName: item.owner_name || item.ownerName,
      email: item.email,
      phone: item.phone,
      location: item.location,
      image: item.image,
      description: item.description,
      cuisineType: item.cuisine_type || item.cuisineType,
      status: item.status,
      submittedAt: new Date(item.submitted_at || item.submittedAt).getTime(),
      rejectionReason: item.rejection_reason || item.rejectionReason,
    })) as RestaurantSubmission[];

    console.log('🔍 Submissions mapped:', submissions.length);

    // Sort by submittedAt descending
    return submissions.sort((a, b) => b.submittedAt - a.submittedAt);
  } catch (error) {
    console.error('❌ Error fetching pending restaurants:', error);
    // Return empty array instead of throwing to prevent app crash
    return [];
  }
}

export async function approveRestaurant(submissionId: string): Promise<void> {
  try {
    // Update submission status to approved
    const { error } = await app
      .from(TABLES.RESTAURANT_SUBMISSIONS)
      .update({ status: 'approved' })
      .eq('id', submissionId);

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('✅ Restaurant submission approved');
  } catch (error) {
    console.error('Error approving restaurant:', error);
    throw error;
  }
}

export async function rejectRestaurant(submissionId: string, reason: string): Promise<void> {
  try {
    const { error } = await app
      .from(TABLES.RESTAURANT_SUBMISSIONS)
      .update({
        status: 'rejected',
        rejection_reason: reason
      })
      .eq('id', submissionId);

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('✅ Restaurant submission rejected');
  } catch (error) {
    console.error('Error rejecting restaurant:', error);
    throw error;
  }
}

export async function getApprovedRestaurants(): Promise<any[]> {
  // Placeholder - not implemented for Supabase
  console.log('getApprovedRestaurants not implemented');
  return [];
}

export async function deleteRestaurantOwner(id: string): Promise<void> {
  // Use the same function as deleteRestaurant
  return deleteRestaurant(id);
}

export async function updateRestaurantOwner(id: string, updates: any): Promise<void> {
  // Use the same function as updateRestaurant
  return updateRestaurant(id, updates);
}

export async function getRestaurantStats(): Promise<any> {
  // Placeholder - not implemented
  console.log('getRestaurantStats not implemented');
  return { total: 0, unique: 0, duplicates: 0, nameDuplicates: [], coordDuplicates: [] };
}

export async function cleanupDuplicateRestaurants(): Promise<any> {
  // Placeholder - not implemented
  console.log('cleanupDuplicateRestaurants not implemented');
  return { deleted: 0, kept: 0 };
}

export async function clearAllRestaurants(): Promise<number> {
  // Placeholder - not implemented
  console.log('clearAllRestaurants not implemented');
  return 0;
}

export async function addRestaurantsFromGoogleMaps(urls: string[]): Promise<void> {
  // Placeholder - not implemented
  console.log('addRestaurantsFromGoogleMaps not implemented');
}
