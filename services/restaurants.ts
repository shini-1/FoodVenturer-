import { getFirestoreInstance } from './firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { Restaurant, RestaurantOwner, RestaurantSubmission } from '../types';
import { parseGoogleMapsUrl } from '../utils/googleMapsParser';

export async function getRestaurants(): Promise<Restaurant[]> {
  try {
    const firestore = getFirestoreInstance();
    console.log('🔍 Fetching restaurants from Firestore...');
    const querySnapshot = await getDocs(collection(firestore, 'restaurants'));
    const restaurants = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<Restaurant, 'id'>
    }));
    console.log(`✅ Retrieved ${restaurants.length} restaurants from Firestore`);
    return restaurants;
  } catch (error) {
    console.error('❌ Error fetching restaurants from Firestore:', error);
    // Return empty array if Firestore fails
    return [];
  }
}

export async function addRestaurant(data: Omit<Restaurant, 'id'>): Promise<void> {
  try {
    const firestore = getFirestoreInstance();
    console.log('🔍 Adding restaurant to Firestore...');
    await addDoc(collection(firestore, 'restaurants'), data);
    console.log('✅ Restaurant added successfully');
  } catch (error) {
    console.error('❌ Error adding restaurant:', error);
    throw error;
  }
}

export async function deleteRestaurant(id: string): Promise<void> {
  try {
    const firestore = getFirestoreInstance();
    console.log(`🔍 Deleting restaurant ${id} from Firestore...`);
    await deleteDoc(doc(firestore, 'restaurants', id));
    console.log('✅ Restaurant deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting restaurant:', error);
    throw error;
  }
}

/**
 * Add a restaurant by parsing data from a Google Maps URL
 */
export async function addRestaurantFromGoogleMaps(url: string): Promise<void> {
  const parsed = parseGoogleMapsUrl(url);
  if (!parsed) {
    throw new Error('Invalid Google Maps URL or unable to parse data');
  }

  await addRestaurant({
    name: parsed.name,
    location: {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
    },
  });
}

/**
 * Clean up duplicate restaurants from Firestore
 * Keeps only one entry per unique name+location combination
 */
export async function cleanupDuplicateRestaurants(): Promise<{ deleted: number; kept: number }> {
  console.log('🧹 Starting restaurant cleanup...');

  try {
    const allRestaurants = await getRestaurants();
    console.log(`🧹 Found ${allRestaurants.length} total restaurants`);

    // Group by unique identifier (name + coordinates)
    const uniqueMap = new Map<string, Restaurant>();

    allRestaurants.forEach(restaurant => {
      const key = `${restaurant.name.toLowerCase().trim()}_${restaurant.location.latitude.toFixed(6)}_${restaurant.location.longitude.toFixed(6)}`;

      // Keep the first occurrence, mark others for deletion
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, restaurant);
      }
    });

    const uniqueRestaurants = Array.from(uniqueMap.values());
    const duplicatesToDelete = allRestaurants.filter(r => {
      const key = `${r.name.toLowerCase().trim()}_${r.location.latitude.toFixed(6)}_${r.location.longitude.toFixed(6)}`;
      return uniqueMap.get(key)?.id !== r.id;
    });

    console.log(`🧹 Found ${uniqueRestaurants.length} unique restaurants`);
    console.log(`🧹 Found ${duplicatesToDelete.length} duplicates to delete`);

    // Delete duplicates
    if (duplicatesToDelete.length > 0) {
      const firestore = getFirestoreInstance();
      const deletePromises = duplicatesToDelete.map(async (restaurant) => {
        try {
          console.log(`🗑️ Deleting duplicate: ${restaurant.name} (${restaurant.id})`);
          await deleteDoc(doc(firestore, 'restaurants', restaurant.id));
        } catch (error) {
          console.error(`❌ Failed to delete ${restaurant.name}:`, error);
        }
      });

      await Promise.all(deletePromises);
    }

    console.log(`✅ Cleanup complete: deleted ${duplicatesToDelete.length}, kept ${uniqueRestaurants.length}`);
    return { deleted: duplicatesToDelete.length, kept: uniqueRestaurants.length };

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

/**
 * Completely clear all restaurants from Firestore
 */
export async function clearAllRestaurants(): Promise<number> {
  console.log('🗑️ Starting complete restaurant database clear...');

  try {
    const allRestaurants = await getRestaurants();
    console.log(`🗑️ Found ${allRestaurants.length} restaurants to delete`);

    if (allRestaurants.length === 0) {
      console.log('🗑️ Database already empty');
      return 0;
    }

    const firestore = getFirestoreInstance();
    const deletePromises = allRestaurants.map(async (restaurant) => {
      try {
        console.log(`🗑️ Deleting: ${restaurant.name} (${restaurant.id})`);
        await deleteDoc(doc(firestore, 'restaurants', restaurant.id));
      } catch (error) {
        console.error(`❌ Failed to delete ${restaurant.name}:`, error);
      }
    });

    await Promise.all(deletePromises);
    console.log(`✅ Successfully cleared ${allRestaurants.length} restaurants from database`);
    return allRestaurants.length;

  } catch (error) {
    console.error('❌ Database clear failed:', error);
    throw error;
  }
}

/**
 * Get detailed statistics about restaurant data
 */
export async function getRestaurantStats(): Promise<{
  total: number;
  unique: number;
  duplicates: number;
  nameDuplicates: Array<{ name: string; count: number }>;
  coordDuplicates: Array<{ coords: string; count: number }>;
}> {
  const allRestaurants = await getRestaurants();

  // Count unique combinations
  const uniqueMap = new Map<string, Restaurant>();
  const nameCounts: { [key: string]: number } = {};
  const coordCounts: { [key: string]: number } = {};

  allRestaurants.forEach(r => {
    const key = `${r.name.toLowerCase().trim()}_${r.location.latitude.toFixed(6)}_${r.location.longitude.toFixed(6)}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, r);
    }

    nameCounts[r.name.toLowerCase().trim()] = (nameCounts[r.name.toLowerCase().trim()] || 0) + 1;
    const coordKey = `${r.location.latitude.toFixed(4)},${r.location.longitude.toFixed(4)}`;
    coordCounts[coordKey] = (coordCounts[coordKey] || 0) + 1;
  });

  const nameDuplicates = Object.entries(nameCounts)
    .filter(([, count]) => count > 1)
    .map(([name, count]) => ({ name, count }));

  const coordDuplicates = Object.entries(coordCounts)
    .filter(([, count]) => count > 1)
    .map(([coords, count]) => ({ coords, count }));

  return {
    total: allRestaurants.length,
    unique: uniqueMap.size,
    duplicates: allRestaurants.length - uniqueMap.size,
    nameDuplicates,
    coordDuplicates
  };
}

/**
 * Batch add restaurants from multiple Google Maps URLs with duplicate prevention
 */
export async function addRestaurantsFromGoogleMaps(urls: string[]): Promise<void> {
  console.log(`📥 Starting import of ${urls.length} restaurant URLs...`);

  // Parse all URLs first
  const parsedRestaurants = urls.map((url: string) => parseGoogleMapsUrl(url))
    .filter((result): result is NonNullable<ReturnType<typeof parseGoogleMapsUrl>> => result !== null);

  console.log(`✅ Parsed ${parsedRestaurants.length} valid restaurants from ${urls.length} URLs`);

  if (parsedRestaurants.length === 0) {
    throw new Error('No valid restaurants found in the provided URLs');
  }

  // Get existing restaurants to check for duplicates
  const existingRestaurants = await getRestaurants();
  console.log(`📊 Found ${existingRestaurants.length} existing restaurants in database`);

  // Filter out duplicates based on name and location
  const newRestaurants = parsedRestaurants.filter((parsed) => {
    const isDuplicate = existingRestaurants.some(existing =>
      existing.name.toLowerCase() === parsed.name.toLowerCase() &&
      Math.abs(existing.location.latitude - parsed.latitude) < 0.001 &&
      Math.abs(existing.location.longitude - parsed.longitude) < 0.001
    );

    if (isDuplicate) {
      console.log(`⏭️ Skipping duplicate: ${parsed.name}`);
    }

    return !isDuplicate;
  });

  console.log(`🆕 Found ${newRestaurants.length} new restaurants to add`);

  if (newRestaurants.length === 0) {
    console.log('ℹ️ No new restaurants to add - all are duplicates');
    return;
  }

  // Add only the new restaurants
  const promises = newRestaurants.map((restaurant) => {
    console.log(`➕ Adding restaurant: ${restaurant.name}`);
    return addRestaurant({
      name: restaurant.name,
      location: {
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
      },
    });
  });

  await Promise.all(promises);
  console.log(`✅ Successfully added ${newRestaurants.length} new restaurants`);
}

const RESTAURANT_OWNERS_COLLECTION = 'restaurants';
const SUBMISSIONS_COLLECTION = 'restaurantSubmissions';

/**
 * Fetch all approved restaurants (owners)
 */
export async function getApprovedRestaurants(): Promise<RestaurantOwner[]> {
  try {
    // First get all approved restaurants, then sort in memory to avoid composite index requirement
    const q = query(
      collection(getFirestoreInstance(), RESTAURANT_OWNERS_COLLECTION),
      where('status', '==', 'approved')
    );
    const querySnapshot = await getDocs(q);
    const restaurants = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis() || Date.now(),
      approvedAt: doc.data().approvedAt?.toMillis(),
    })) as RestaurantOwner[];

    // Sort by createdAt descending in memory
    return restaurants.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error fetching approved restaurants:', error);
    throw error;
  }
}

/**
 * Fetch all pending restaurant submissions
 */
export async function getPendingRestaurants(): Promise<RestaurantSubmission[]> {
  try {
    console.log('🔍 Fetching pending restaurants...');
    const firestore = getFirestoreInstance();
    console.log('🔍 Firestore instance:', firestore);
    console.log('🔍 Collection name:', SUBMISSIONS_COLLECTION);

    // First get all pending submissions, then sort in memory to avoid composite index requirement
    const q = query(
      collection(firestore, SUBMISSIONS_COLLECTION),
      where('status', '==', 'pending')
    );
    console.log('🔍 Query created:', q);

    const querySnapshot = await getDocs(q);
    console.log('🔍 Query executed, docs count:', querySnapshot.docs.length);

    const submissions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toMillis() || Date.now(),
    })) as RestaurantSubmission[];

    console.log('🔍 Submissions mapped:', submissions.length);

    // Sort by submittedAt descending in memory
    return submissions.sort((a, b) => b.submittedAt - a.submittedAt);
  } catch (error) {
    console.error('❌ Error fetching pending restaurants:', error);
    // Return empty array instead of throwing to prevent app crash
    return [];
  }
}

/**
 * Approve a restaurant submission
 */
export async function approveRestaurant(submissionId: string): Promise<void> {
  try {
    // Get the submission data
    const submissionRef = doc(getFirestoreInstance(), SUBMISSIONS_COLLECTION, submissionId);
    const submissionDoc = await getDocs(query(collection(getFirestoreInstance(), SUBMISSIONS_COLLECTION), where('__name__', '==', submissionId)));
    const submissionData = submissionDoc.docs[0]?.data() as RestaurantSubmission;

    if (!submissionData) {
      throw new Error('Submission not found');
    }

    // Create approved restaurant record
    const restaurantData: Omit<RestaurantOwner, 'id'> = {
      userId: submissionData.ownerId,
      businessName: submissionData.businessName,
      ownerName: submissionData.ownerName,
      email: submissionData.email,
      phone: submissionData.phone,
      location: submissionData.location,
      image: submissionData.image,
      description: submissionData.description,
      cuisineType: submissionData.cuisineType,
      status: 'approved',
      createdAt: Date.now(),
      approvedAt: Date.now(),
    };

    // Add to restaurants collection
    await addDoc(collection(getFirestoreInstance(), RESTAURANT_OWNERS_COLLECTION), restaurantData);

    // Update submission status
    await updateDoc(submissionRef, {
      status: 'approved',
    });

  } catch (error) {
    console.error('Error approving restaurant:', error);
    throw error;
  }
}

/**
 * Reject a restaurant submission
 */
export async function rejectRestaurant(submissionId: string, reason: string): Promise<void> {
  try {
    const submissionRef = doc(getFirestoreInstance(), SUBMISSIONS_COLLECTION, submissionId);
    await updateDoc(submissionRef, {
      status: 'rejected',
      rejectionReason: reason,
    });
  } catch (error) {
    console.error('Error rejecting restaurant:', error);
    throw error;
  }
}

/**
 * Delete a restaurant (owner)
 */
export async function deleteRestaurantOwner(businessId: string): Promise<void> {
  try {
    await deleteDoc(doc(getFirestoreInstance(), RESTAURANT_OWNERS_COLLECTION, businessId));
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    throw error;
  }
}

/**
 * Update a restaurant (owner)
 */
export async function updateRestaurantOwner(businessId: string, updates: Partial<RestaurantOwner>): Promise<void> {
  try {
    const businessRef = doc(getFirestoreInstance(), RESTAURANT_OWNERS_COLLECTION, businessId);
    await updateDoc(businessRef, updates);
  } catch (error) {
    console.error('Error updating restaurant:', error);
    throw error;
  }
}

/**
 * Create a new restaurant submission
 */
export async function createRestaurantSubmission(submission: Omit<RestaurantSubmission, 'id' | 'submittedAt' | 'status'>): Promise<string> {
  try {
    const submissionData = {
      ...submission,
      submittedAt: Date.now(),
      status: 'pending' as const,
    };

    const docRef = await addDoc(collection(getFirestoreInstance(), SUBMISSIONS_COLLECTION), submissionData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating restaurant submission:', error);
    throw error;
  }
}
