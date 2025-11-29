import { supabase, BUCKETS } from '../config/supabase';

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
 * Uses fetch API with proper error handling for React Native
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

    // Use fetch to get the image data and convert to blob
    let imageBlob: Blob;
    try {
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      // Get the blob from the response
      imageBlob = await response.blob();
      console.log('📷 Successfully fetched image, size:', imageBlob.size);

    } catch (fetchError: any) {
      console.error('❌ Failed to fetch image:', fetchError);

      // If fetch fails, provide specific error messages
      if (fetchError.message?.includes('Network request failed')) {
        throw new Error('Network error while accessing the image. Please check your internet connection.');
      } else if (fetchError.message?.includes('404') || fetchError.message?.includes('Not Found')) {
        throw new Error('The selected image could not be accessed. Please try selecting a different image.');
      } else {
        throw new Error(`Failed to access image: ${fetchError.message || 'Unknown error'}. Please try selecting the image again.`);
      }
    }

    // Upload the blob to Supabase
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
      throw new Error(`Failed to upload image: ${uploadError.message || 'Unknown upload error'}. Please check your internet connection.`);
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
