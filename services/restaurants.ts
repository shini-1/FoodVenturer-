import { Restaurant, RestaurantOwner, RestaurantSubmission } from '../types';
import { supabase, TABLES } from '../src/config/supabase';

// Table names (centralized)
const RESTAURANTS_TABLE = TABLES.RESTAURANTS;
const PENDING_RESTAURANTS_TABLE = TABLES.PENDING_RESTAURANTS;
const RESTAURANT_OWNERS_TABLE = TABLES.RESTAURANT_OWNERS;
const SUBMISSIONS_TABLE = TABLES.RESTAURANT_SUBMISSIONS;

/**
 * Get all approved restaurants
 */
export const getRestaurants = async (): Promise<Restaurant[]> => {
  try {
    const { data, error } = await supabase
      .from(RESTAURANTS_TABLE)
      .select('*');

    if (error) throw new Error(error.message);
    return data || [];
  } catch (error: any) {
    console.error('Error fetching restaurants:', error);
    throw new Error(error.message || 'Failed to fetch restaurants');
  }
};

/**
 * Get approved restaurants (alias for getRestaurants)
 */
export const getApprovedRestaurants = async (): Promise<Restaurant[]> => {
  return getRestaurants();
};

/**
 * Get pending restaurant submissions
 */
export const getPendingRestaurants = async (): Promise<RestaurantSubmission[]> => {
  try {
    const { data, error } = await supabase
      .from(PENDING_RESTAURANTS_TABLE)
      .select('*');

    if (error) throw new Error(error.message);
    return data || [];
  } catch (error: any) {
    console.error('Error fetching pending restaurants:', error);
    throw new Error(error.message || 'Failed to fetch pending restaurants');
  }
};

/**
 * Delete a restaurant by ID
 */
export const deleteRestaurant = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from(RESTAURANTS_TABLE)
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  } catch (error: any) {
    console.error('Error deleting restaurant:', error);
    throw new Error(error.message || 'Failed to delete restaurant');
  }
};

/**
 * Update a restaurant
 */
export const updateRestaurant = async (id: string, updates: Partial<Restaurant>): Promise<void> => {
  try {
    const { error } = await supabase
      .from(RESTAURANTS_TABLE)
      .update(updates)
      .eq('id', id);

    if (error) throw new Error(error.message);
  } catch (error: any) {
    console.error('Error updating restaurant:', error);
    throw new Error(error.message || 'Failed to update restaurant');
  }
};

/**
 * Add a new restaurant
 */
export const addRestaurant = async (restaurantData: Omit<Restaurant, 'id'>): Promise<void> => {
  try {
    const { error } = await supabase
      .from(RESTAURANTS_TABLE)
      .insert([restaurantData]);

    if (error) throw new Error(error.message);
  } catch (error: any) {
    console.error('Error adding restaurant:', error);
    throw new Error(error.message || 'Failed to add restaurant');
  }
};

/**
 * Approve a restaurant submission
 */
export const approveRestaurant = async (submissionId: string): Promise<void> => {
  try {
    // First, get the submission data
    const { data: submission, error } = await supabase
      .from(SUBMISSIONS_TABLE)
      .select('*')
      .eq('id', submissionId)
      .single();

    if (error) throw new Error(error.message);
    if (!submission) throw new Error('Submission not found');

    // Add to approved restaurants
    const { error: insertError } = await supabase
      .from(RESTAURANT_OWNERS_TABLE)
      .insert([{
        userId: submission.ownerId,
        businessName: submission.businessName,
        ownerName: submission.ownerName,
        email: submission.email,
        phone: submission.phone,
        location: submission.location,
        image: submission.image || undefined,
        description: submission.description || undefined,
        cuisineType: submission.cuisineType,
        status: 'approved',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
      }]);

    if (insertError) throw new Error(insertError.message);

    // Update submission status
    const { error: updateError } = await supabase
      .from(SUBMISSIONS_TABLE)
      .update({ status: 'approved' })
      .eq('id', submissionId);

    if (updateError) throw new Error(updateError.message);
  } catch (error: any) {
    console.error('Error approving restaurant:', error);
    throw new Error(error.message || 'Failed to approve restaurant');
  }
};

/**
 * Reject a restaurant submission with a reason
 */
export const rejectRestaurant = async (submissionId: string, reason: string): Promise<void> => {
  try {
    // Update the submission with rejection reason
    const { error: updateError } = await supabase
      .from(SUBMISSIONS_TABLE)
      .update({ status: 'rejected', rejectionReason: reason, rejectedAt: new Date().toISOString() })
      .eq('id', submissionId);

    if (updateError) throw new Error(updateError.message);
  } catch (error: any) {
    console.error('Error rejecting restaurant:', error);
    throw new Error(error.message || 'Failed to reject restaurant');
  }
};

/**
 * Delete a restaurant owner (business owner account)
 */
export const deleteRestaurantOwner = async (businessId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from(RESTAURANT_OWNERS_TABLE)
      .delete()
      .eq('id', businessId);

    if (error) throw new Error(error.message);
  } catch (error: any) {
    console.error('Error deleting restaurant owner:', error);
    throw new Error(error.message || 'Failed to delete restaurant owner');
  }
};

/**
 * Update a restaurant owner (business owner account)
 */
export const updateRestaurantOwner = async (businessId: string, updates: any): Promise<void> => {
  try {
    const { error } = await supabase
      .from(RESTAURANT_OWNERS_TABLE)
      .update(updates)
      .eq('id', businessId);

    if (error) throw new Error(error.message);
  } catch (error: any) {
    console.error('Error updating restaurant owner:', error);
    throw new Error(error.message || 'Failed to update restaurant owner');
  }
};

/**
 * Get restaurant statistics
 */
export const getRestaurantStats = async (): Promise<any> => {
  try {
    // Get total count of approved restaurants
    const { count: totalCount, error: totalError } = await supabase
      .from(RESTAURANTS_TABLE)
      .select('*', { count: 'exact' });

    if (totalError) throw new Error(totalError.message);

    // Get count of pending restaurants
    const { count: pendingCount, error: pendingError } = await supabase
      .from(PENDING_RESTAURANTS_TABLE)
      .select('*', { count: 'exact' });

    if (pendingError) throw new Error(pendingError.message);

    // For simplicity, return basic stats (you can expand this with more detailed analysis)
    return {
      total: totalCount || 0,
      pending: pendingCount || 0,
      unique: totalCount || 0, // Assuming no duplicates for now
      duplicates: 0,
      nameDuplicates: [],
      coordDuplicates: []
    };
  } catch (error: any) {
    console.error('Error getting restaurant stats:', error);
    throw new Error(error.message || 'Failed to get restaurant stats');
  }
};

/**
 * Clear all restaurants from the database
 */
export const clearAllRestaurants = async (): Promise<number> => {
  try {
    // Get count of restaurants to return how many were deleted
    const { count, error: countError } = await supabase
      .from(RESTAURANTS_TABLE)
      .select('*', { count: 'exact' });

    if (countError) throw new Error(countError.message);

    // Delete all restaurants
    const { error } = await supabase
      .from(RESTAURANTS_TABLE)
      .delete()
      .neq('id', ''); // This is a workaround to delete all rows

    if (error) throw new Error(error.message);

    return count || 0;
  } catch (error: any) {
    console.error('Error clearing all restaurants:', error);
    throw new Error(error.message || 'Failed to clear restaurants');
  }
};

/**
 * Cleanup duplicate restaurants based on name and location
 */
export const cleanupDuplicateRestaurants = async (): Promise<{ deleted: number, kept: number }> => {
  try {
    // Get all restaurants
    const { data: allRestaurants, error } = await supabase
      .from(RESTAURANTS_TABLE)
      .select('*');

    if (error) throw new Error(error.message);
    if (!allRestaurants || allRestaurants.length === 0) return { deleted: 0, kept: 0 };

    // Group by name (case-insensitive) and location proximity
    const uniqueRestaurants: Restaurant[] = [];
    const duplicatesToDelete: string[] = [];

    allRestaurants.forEach(restaurant => {
      const existing = uniqueRestaurants.find(r => 
        r.name.toLowerCase().trim() === restaurant.name.toLowerCase().trim() &&
        Math.abs(r.location.latitude - restaurant.location.latitude) < 0.0005 &&
        Math.abs(r.location.longitude - restaurant.location.longitude) < 0.0005
      );

      if (existing) {
        // Keep the one with more complete data or newer update
        if (restaurant.updatedAt && (!existing.updatedAt || new Date(restaurant.updatedAt) > new Date(existing.updatedAt))) {
          duplicatesToDelete.push(existing.id);
          uniqueRestaurants[uniqueRestaurants.indexOf(existing)] = restaurant;
        } else {
          duplicatesToDelete.push(restaurant.id);
        }
      } else {
        uniqueRestaurants.push(restaurant);
      }
    });

    // Delete duplicates
    if (duplicatesToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from(RESTAURANTS_TABLE)
        .delete()
        .in('id', duplicatesToDelete);

      if (deleteError) throw new Error(deleteError.message);
    }

    return {
      deleted: duplicatesToDelete.length,
      kept: uniqueRestaurants.length
    };
  } catch (error: any) {
    console.error('Error cleaning up duplicates:', error);
    throw new Error(error.message || 'Failed to cleanup duplicates');
  }
};

/**
 * Add restaurants from Google Maps URLs (parse and add to database)
 */
export const addRestaurantsFromGoogleMaps = async (googleMapsUrls: string[]): Promise<void> => {
  // This function would need a utility to parse Google Maps URLs into restaurant data
  // For now, we'll assume it's not implemented with Supabase directly
  throw new Error('addRestaurantsFromGoogleMaps is not implemented with Supabase yet');
};

/**
 * Fetch all approved restaurants (owners)
 */
export const fetchApprovedRestaurants = async (): Promise<RestaurantOwner[]> => {
  try {
    // First get all approved restaurants, then sort in memory to avoid composite index requirement
    const { data, error } = await supabase
      .from(RESTAURANT_OWNERS_TABLE)
      .select('*')
      .eq('status', 'approved');

    if (error) throw new Error(error.message);
    const restaurants = data || [];

    // Sort by createdAt descending in memory
    return restaurants.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error: any) {
    console.error('Error fetching approved restaurants:', error);
    throw new Error(error.message || 'Failed to fetch approved restaurants');
  }
};

/**
 * Fetch all pending restaurant submissions
 */
export const fetchPendingRestaurants = async (): Promise<RestaurantSubmission[]> => {
  try {
    console.log('🔍 Fetching pending restaurants...');
    const { data, error } = await supabase
      .from(SUBMISSIONS_TABLE)
      .select('*')
      .eq('status', 'pending');

    if (error) throw new Error(error.message);
    const submissions = data || [];

    console.log('🔍 Submissions mapped:', submissions.length);

    // Sort by submittedAt descending in memory
    return submissions.sort((a, b) => b.submittedAt - a.submittedAt);
  } catch (error: any) {
    console.error('❌ Error fetching pending restaurants:', error);
    // Return empty array instead of throwing to prevent app crash
    return [];
  }
};

/**
 * Create a new restaurant submission
 */
export const createRestaurantSubmission = async (submission: Omit<RestaurantSubmission, 'id' | 'submittedAt' | 'status'>): Promise<string> => {
  try {
    const submissionData = {
      ...submission,
      submittedAt: new Date().toISOString(),
      status: 'pending' as const,
    };

    const { data, error } = await supabase
      .from(SUBMISSIONS_TABLE)
      .insert([submissionData]);

    if (error) throw new Error(error.message);
    return data[0].id;
  } catch (error: any) {
    console.error('Error creating restaurant submission:', error);
    throw new Error(error.message || 'Failed to create restaurant submission');
  }
};
