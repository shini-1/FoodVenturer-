import { supabase, BUCKETS } from '../config/supabase';
import * as FileSystem from 'expo-file-system';

// Bucket name for storage
const STORAGE_BUCKET = BUCKETS.RESTAURANT_IMAGES;

/**
 * Upload an image to Supabase Storage and update the restaurant record with the image URL
 * @param imageUri - Local URI of the image to upload
 * @param restaurantId - ID of the restaurant to associate the image with
 * @param imageType - Type of image (logo, banner, etc.)
 * @returns - URL of the uploaded image
 */
export const uploadAndUpdateRestaurantImage = async (imageUri: string, restaurantId: string, imageType: string): Promise<string> => {
  try {
    // Validate inputs
    if (!imageUri || !restaurantId || !imageType) {
      throw new Error('Missing required parameters: imageUri, restaurantId, or imageType');
    }

    console.log('📷 Uploading image and updating restaurant:', { imageUri, restaurantId, imageType });

    // Upload to bucket first
    const imageUrl = await uploadImageToRestaurantBucket(imageUri, `${restaurantId}_${imageType}`, 'image/jpeg');

    // Update the restaurant record with the image URL
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ image: imageUrl })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('Supabase update restaurant error:', updateError);
      throw new Error(`Failed to update restaurant with image URL: ${updateError.message}`);
    }

    console.log('✅ Image uploaded and restaurant updated successfully:', imageUrl);
    return imageUrl;

  } catch (error) {
    console.error('❌ Image upload and update failed:', error);
    throw error;
  }
};

/**
 * Upload an image to the restaurant images bucket and return its public URL
 * Uses Expo FileSystem for React Native compatibility
 */
export const uploadImageToRestaurantBucket = async (
  imageUri: string,
  filePrefix: string,
  contentType: string = 'image/jpeg'
): Promise<string> => {
  try {
    const fileName = `${filePrefix}-${Date.now()}.jpg`;
    const filePath = `${fileName}`;

    console.log('📷 Starting upload:', { imageUri, fileName });

    // Read file as base64 using Expo FileSystem (React Native compatible)
    let base64Data: string;
    try {
      base64Data = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });
      console.log('📷 Successfully read file as base64, size:', base64Data.length);
    } catch (readError) {
      console.error('❌ Failed to read image file:', readError);
      throw new Error('Failed to read image file. Please try selecting the image again.');
    }

    // Convert base64 to Uint8Array for Supabase upload
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log('📷 Uploading to Supabase storage...');
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, bytes, {
          contentType: contentType,
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Supabase upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('✅ Upload successful');
    } catch (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      throw new Error('Failed to upload image. Please check your internet connection.');
    }

    // Get public URL
    const publicUrlData = await supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.data.publicUrl;
    console.log('✅ Image uploaded successfully:', imageUrl);
    return imageUrl;

  } catch (error: any) {
    console.error('❌ Image upload failed:', error);
    throw new Error(error.message || 'Failed to upload image');
  }
};
