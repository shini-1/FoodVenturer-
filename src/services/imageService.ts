import { supabase, BUCKETS } from '../config/supabase';
import type { ImageUploadResult } from '../../types';
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

    // Verify image URL before updating database
    if (!imageUrl || !imageUrl.trim()) {
      throw new Error('Image URL is empty after upload');
    }

    // Update the restaurant record with the image URL
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ image: imageUrl.trim() })
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
 * Converts image URI to blob and uploads to Supabase
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

    // Step 1: Read the image file and convert to blob using expo-file-system
    let imageBlob: Blob;
    try {
      console.log('📷 Reading image from URI using expo-file-system...');
      
      // Read the file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });
      
      console.log('📷 Image read as base64, length:', base64.length);
      
      // Convert base64 to Blob
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      imageBlob = new Blob([byteArray], { type: contentType });
      
      console.log('📷 Image converted to blob, size:', imageBlob.size, 'bytes');
    } catch (fileError: any) {
      console.error('❌ Failed to read/convert image:', fileError);
      throw new Error(`Failed to process image: ${fileError.message}`);
    }

    // Step 2: Upload blob to Supabase
    try {
      console.log('📷 Uploading to Supabase storage...');
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, imageBlob, {
          contentType: contentType,
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Supabase upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('✅ Upload successful');
    } catch (uploadError: any) {
      console.error('❌ Upload failed:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message || 'Unknown upload error'}`);
    }

    // Step 3: Get public URL
    const publicUrlData = await supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.data.publicUrl;
    console.log('✅ Image uploaded successfully');
    console.log('📷 Image URL:', imageUrl);
    console.log('📷 File path:', filePath);
    console.log('📷 Storage bucket:', STORAGE_BUCKET);
    
    // Verify URL is valid
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.length === 0) {
      throw new Error('Invalid image URL generated');
    }
    
    return imageUrl;

  } catch (error: any) {
    console.error('❌ Image upload failed:', error);
    throw new Error(error.message || 'Failed to upload image');
  }
};
