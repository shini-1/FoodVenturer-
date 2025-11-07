import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getStorageInstance } from './firebase';
import { RestaurantOwner } from '../types';

const RESTAURANT_IMAGES_FOLDER = 'restaurant-images';

/**
 * Upload a restaurant image to Firebase Storage
 */
export async function uploadRestaurantImage(imageUri: string, restaurantId: string, imageType: 'logo' | 'cover' | 'gallery' = 'logo'): Promise<string> {
  try {
    // Create unique filename
    const timestamp = Date.now();
    const fileExtension = imageUri.split('.').pop() || 'jpg';
    const filename = `${restaurantId}_${imageType}_${timestamp}.${fileExtension}`;

    // Create storage reference
    const storageRef = ref(getStorageInstance(), `${RESTAURANT_IMAGES_FOLDER}/${filename}`);

    // Convert image URI to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Upload to Firebase Storage
    const snapshot = await uploadBytes(storageRef, blob);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('✅ Restaurant image uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading restaurant image:', error);
    throw error;
  }
}

/**
 * Delete a restaurant image from Firebase Storage
 */
export async function deleteRestaurantImage(imageUrl: string): Promise<void> {
  try {
    // Extract filename from URL
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1].split('?')[0];

    // Create storage reference
    const storageRef = ref(getStorageInstance(), `${RESTAURANT_IMAGES_FOLDER}/${filename}`);

    // Delete the file
    await deleteObject(storageRef);
    console.log('✅ Restaurant image deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting restaurant image:', error);
    throw error;
  }
}

/**
 * Update restaurant's image URL in Firestore
 */
export async function updateRestaurantImage(restaurantId: string, imageUrl: string, imageType: 'logo' | 'cover' | 'gallery' = 'logo'): Promise<void> {
  try {
    // Import the update function
    const { updateRestaurantOwner } = await import('../services/restaurants');

    // Update the restaurant document with new image URL
    await updateRestaurantOwner(restaurantId, {
      image: imageUrl
    });

    console.log('✅ Restaurant image URL updated in database');
  } catch (error) {
    console.error('❌ Error updating restaurant image URL:', error);
    throw error;
  }
}

/**
 * Complete image upload process: upload to storage + update database
 */
export async function uploadAndUpdateRestaurantImage(imageUri: string, restaurantId: string, imageType: 'logo' | 'cover' | 'gallery' = 'logo'): Promise<string> {
  try {
    // Upload image to Firebase Storage
    const imageUrl = await uploadRestaurantImage(imageUri, restaurantId, imageType);

    // Update restaurant record with new image URL
    await updateRestaurantImage(restaurantId, imageUrl, imageType);

    return imageUrl;
  } catch (error) {
    console.error('❌ Error in complete image upload process:', error);
    throw error;
  }
}
