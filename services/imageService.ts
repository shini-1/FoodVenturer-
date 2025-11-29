import { supabase, BUCKETS } from '../src/config/supabase';
import * as FileSystem from 'expo-file-system';

// Bucket name for storage
const STORAGE_BUCKET = BUCKETS.RESTAURANT_IMAGES;

/**
 * Convert ImagePicker URI to a format suitable for upload
 */
const prepareImageForUpload = async (imageUri: string): Promise<{ base64: string; mimeType: string }> => {
  try {
    console.log('🔄 Preparing image for upload:', imageUri);

    // Handle different URI formats
    let processedUri = imageUri;

    // For Expo ImagePicker URIs, ensure they're in the correct format
    if (imageUri.startsWith('file://')) {
      processedUri = imageUri;
    } else if (!imageUri.startsWith('http') && !imageUri.startsWith('content://')) {
      processedUri = `file://${imageUri}`;
    }

    // For React Native, we need to read the file and convert to base64
    if (processedUri.startsWith('file://') || processedUri.startsWith('content://')) {
      try {
        // Read the file as base64
        const base64 = await FileSystem.readAsStringAsync(processedUri, {
          encoding: 'base64',
        });

        // Determine MIME type from file extension or default to JPEG
        let mimeType = 'image/jpeg';
        if (processedUri.toLowerCase().includes('.png')) {
          mimeType = 'image/png';
        } else if (processedUri.toLowerCase().includes('.jpg') || processedUri.toLowerCase().includes('.jpeg')) {
          mimeType = 'image/jpeg';
        } else if (processedUri.toLowerCase().includes('.webp')) {
          mimeType = 'image/webp';
        }

        console.log('✅ Successfully prepared image base64:', { size: base64.length, mimeType });
        return { base64, mimeType };
      } catch (fileReadError) {
        console.error('❌ Failed to read image file:', fileReadError);

        // Try fallback method using fetch directly on the URI
        try {
          console.log('🔄 Trying fallback fetch method...');
          const response = await fetch(processedUri);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Instead of using blob(), convert response to base64
          const arrayBuffer = await response.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

          console.log('✅ Fallback method successful:', { size: base64.length });
          return { base64, mimeType: response.headers.get('content-type') || 'image/jpeg' };
        } catch (fallbackError) {
          console.error('❌ Fallback method also failed:', fallbackError);
          throw new Error(`Failed to process image: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
        }
      }
    } else {
      // For HTTP URLs, use regular fetch and convert to base64
      const response = await fetch(processedUri);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Convert response to base64 instead of blob
      const arrayBuffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      return { base64, mimeType: response.headers.get('content-type') || 'image/jpeg' };
    }
  } catch (error) {
    console.error('❌ Failed to prepare image for upload:', error);
    throw new Error(`Failed to prepare image for upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

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

    // Generate a unique file name
    const fileName = `${imageType}-${restaurantId}-${Date.now()}.jpg`;
    const filePath = `${fileName}`;

    console.log(' Starting image upload:', { imageUri, restaurantId, imageType });

    // Prepare the image for upload
    const imageData = await prepareImageForUpload(imageUri);

    // The base64 data is now available directly
    console.log(' Image prepared successfully:', {
      size: imageData.base64.length,
      mimeType: imageData.mimeType
    });

    // Upload to Supabase Storage using base64 data
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, imageData.base64, {
        contentType: imageData.mimeType,
        upsert: true
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    console.log(' Image uploaded to storage successfully');

    // Get the public URL for the uploaded file
    const publicUrlData = await supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.data.publicUrl;

    // Update the restaurant record with the image URL
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ image: imageUrl })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('Supabase update restaurant error:', updateError);
      throw new Error(`Failed to update restaurant with image URL: ${updateError.message}`);
    }

    console.log(' Image uploaded and restaurant updated successfully:', imageUrl);
    return imageUrl;

  } catch (error) {
    console.error(' Image upload failed:', error);

    // Re-throw the error so the calling code can handle it properly
    // This will prevent silent failures and provide better error messages
    throw error;
  }
};

/**
 * Upload an image to the restaurant images bucket and return its public URL
 * Does NOT update any database rows; useful for forms prior to record creation
 */
export const uploadImageToRestaurantBucket = async (
  imageUri: string,
  filePrefix: string,
  contentType: string = 'image/jpeg'
): Promise<string> => {
  try {
    const fileName = `${filePrefix}-${Date.now()}.jpg`;
    const filePath = `${fileName}`;

    // Prepare the image for upload
    const imageData = await prepareImageForUpload(imageUri);

    // The base64 data is now available directly
    console.log('✅ Image prepared for bucket upload:', {
      size: imageData.base64.length,
      mimeType: imageData.mimeType
    });

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, imageData.base64, {
        contentType: imageData.mimeType,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const publicUrlData = await supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.data.publicUrl;
    console.log('✅ Image uploaded to bucket successfully:', imageUrl);
    return imageUrl;
  } catch (error: any) {
    console.error('Error uploading image to storage:', error);
    throw new Error(error.message || 'Failed to upload image');
  }
};
