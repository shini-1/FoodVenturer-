import { supabase, BUCKETS } from '../config/supabase';

// Bucket name for storage
const STORAGE_BUCKET = BUCKETS.RESTAURANT_IMAGES;

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

    console.log('📷 Uploading image to bucket:', imageUri);

    // Try to upload directly from URI using blob conversion
    try {
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, blob, {
          contentType: response.headers.get('content-type') || contentType,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }
    } catch (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      throw new Error(`Upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
    }

    const publicUrlData = await supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.data.publicUrl;
    console.log('✅ Image uploaded to bucket successfully:', imageUrl);
    return imageUrl;
  } catch (error: any) {
    console.error('❌ Error uploading image to storage:', error);
    throw new Error(error.message || 'Failed to upload image');
  }
};
