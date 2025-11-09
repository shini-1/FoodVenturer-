import { supabase } from './firebase'; // This is actually the Supabase client
import { Restaurant } from '../types';

const RESTAURANT_IMAGES_BUCKET = 'restaurant-images';

/**
 * Upload a restaurant image to Supabase Storage
 */
export async function uploadRestaurantImage(imageUri: string, restaurantId: string, imageType: 'logo' | 'cover' | 'gallery' = 'logo'): Promise<string> {
  try {
    // Create unique filename
    const timestamp = Date.now();
    const fileExtension = imageUri.split('.').pop() || 'jpg';
    const filename = `${restaurantId}_${imageType}_${timestamp}.${fileExtension}`;

    // Fetch the image and convert to array buffer
    const response = await fetch(imageUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(RESTAURANT_IMAGES_BUCKET)
      .upload(filename, uint8Array, {
        contentType: `image/${fileExtension}`,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(RESTAURANT_IMAGES_BUCKET)
      .getPublicUrl(filename);

    console.log('✅ Restaurant image uploaded successfully:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('❌ Error uploading restaurant image:', error);
    throw error;
  }
}

/**
 * Delete a restaurant image from Supabase Storage
 */
export async function deleteRestaurantImage(imageUrl: string): Promise<void> {
  try {
    // Extract filename from URL
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1].split('?')[0];

    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from(RESTAURANT_IMAGES_BUCKET)
      .remove([filename]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }

    console.log('✅ Restaurant image deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting restaurant image:', error);
    throw error;
  }
}

/**
 * Update restaurant's image URL in Supabase
 */
export async function updateRestaurantImage(restaurantId: string, imageUrl: string, imageType: 'logo' | 'cover' | 'gallery' = 'logo'): Promise<void> {
  try {
    // Import the update function
    const { updateRestaurant } = await import('../services/restaurants');

    // Update the restaurant document with new image URL
    await updateRestaurant(restaurantId, {
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
    console.log('🚀 Starting image upload process...');

    // Validate imageUri
    if (!imageUri || typeof imageUri !== 'string') {
      throw new Error('Invalid image URI provided');
    }

    // Upload image to Supabase Storage
    const imageUrl = await uploadRestaurantImage(imageUri, restaurantId, imageType);

    // Update restaurant record with new image URL
    await updateRestaurantImage(restaurantId, imageUrl, imageType);

    return imageUrl;
  } catch (error) {
    console.error('❌ Error in complete image upload process:', error);
    throw error;
  }
}
