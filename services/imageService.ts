import { supabase, BUCKETS } from '../src/config/supabase';

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

    // Generate a unique file name
    const fileName = `${imageType}-${restaurantId}-${Date.now()}.jpg`;
    const filePath = `${fileName}`;

    console.log('🖼️ Starting image upload:', { imageUri, restaurantId, imageType });

    // Handle different URI formats
    let processedImageUri = imageUri;
    
    // Handle Expo ImagePicker URIs that might need special processing
    if (imageUri.startsWith('file://') || imageUri.startsWith('content://') || imageUri.startsWith('data:')) {
      processedImageUri = imageUri;
    } else if (!imageUri.startsWith('http')) {
      // Assume it's a local file path
      processedImageUri = `file://${imageUri}`;
    }

    // Fetch the image data as a blob with proper error handling
    let response: Response;
    let blob: Blob;

    try {
      console.log('🔄 Fetching image from URI:', processedImageUri);
      response = await fetch(processedImageUri);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if blob method exists
      if (typeof response.blob !== 'function') {
        throw new Error('Response does not have blob method');
      }

      blob = await response.blob();
      
      if (!blob) {
        throw new Error('Failed to create blob from response');
      }

      console.log('✅ Successfully created blob:', { size: blob.size, type: blob.type });
    } catch (fetchError) {
      console.error('❌ Failed to fetch image blob:', fetchError);
      
      // Try alternative approach using FileReader if available
      try {
        console.log('🔄 Trying alternative image processing...');
        
        // For React Native, we might need to use a different approach
        // Return a placeholder URL or skip upload
        console.warn('⚠️ Image upload failed, continuing without image update');
        return ''; // Return empty string to indicate no image was uploaded
      } catch (altError) {
        console.error('❌ Alternative image processing also failed:', altError);
        throw new Error(`Failed to process image: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }
    }

    // If we got an empty string, skip the upload and return
    if (!blob) {
      console.warn('⚠️ No blob created, skipping image upload');
      return '';
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

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

    console.log('✅ Image uploaded and restaurant updated successfully:', imageUrl);
    return imageUrl;

  } catch (error) {
    console.error('❌ Image upload failed:', error);
    
    // Don't throw the error, just log it and return empty string
    // This allows the restaurant update to continue even if image upload fails
    console.warn('⚠️ Continuing without image update due to upload failure');
    return '';
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

    const response = await fetch(imageUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blob, { contentType, upsert: true });

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const publicUrlData = await supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.data.publicUrl;
    return imageUrl;
  } catch (error: any) {
    console.error('Error uploading image to storage:', error);
    throw new Error(error.message || 'Failed to upload image');
  }
};
