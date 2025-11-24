import { supabase, TABLES } from '../config/supabase';

export interface RestaurantRating {
  id: string;
  restaurantId: string;
  userId: string;
  stars: number; // 1..5
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

function clampStars(stars: number): number {
  if (Number.isNaN(stars)) return 1;
  if (stars < 1) return 1;
  if (stars > 5) return 5;
  return Math.round(stars);
}

export async function submitRating(
  restaurantId: string,
  userId: string,
  stars: number,
  comment?: string
): Promise<void> {
  const clamped = clampStars(stars);

  const { error: insertError } = await supabase
    .from(TABLES.RESTAURANT_RATINGS)
    .insert({
      restaurant_id: restaurantId,
      user_id: userId,
      stars: clamped,
      comment: comment ?? null,
      updated_at: new Date().toISOString(),
    });

  if (insertError) {
    const code = (insertError as any)?.code;
    if (code === '23505') {
      // Unique violation on (restaurant_id, user_id)
      throw new Error('ALREADY_RATED');
    }
    throw new Error(insertError.message);
  }

  // Recompute average for the restaurant
  const { data, error, count } = await supabase
    .from(TABLES.RESTAURANT_RATINGS)
    .select('stars', { count: 'exact' })
    .eq('restaurant_id', restaurantId);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as any[];
  const c = count ?? rows.length;
  const avg = c === 0 ? 0 : rows.reduce((s, r: any) => s + (r.stars || 0), 0) / c;

  const { error: updateError } = await supabase
    .from(TABLES.RESTAURANTS)
    .update({ rating: avg })
    .eq('id', restaurantId);

  if (updateError) throw new Error(updateError.message);
}

export async function getUserRating(
  restaurantId: string,
  userId: string
): Promise<{ stars: number; comment?: string } | null> {
  const { data, error } = await supabase
    .from(TABLES.RESTAURANT_RATINGS)
    .select('stars, comment')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return { stars: data.stars, comment: data.comment ?? undefined };
}

export async function getAverageRating(
  restaurantId: string
): Promise<{ average: number; count: number }> {
  const { data, error, count } = await supabase
    .from(TABLES.RESTAURANT_RATINGS)
    .select('stars', { count: 'exact' })
    .eq('restaurant_id', restaurantId);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as any[];
  const c = count ?? rows.length;
  const avg = c === 0 ? 0 : rows.reduce((s, r: any) => s + (r.stars || 0), 0) / c;
  return { average: avg, count: c };
}
