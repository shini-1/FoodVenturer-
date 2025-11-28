import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import RatingSyncIndicator from './RatingSyncIndicator';
import { ratingCalculationService, RestaurantRatingData } from '../src/services/ratingCalculationService';
import { Restaurant } from '../types';

interface EnhancedRestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
  showSyncStatus?: boolean;
  showRanking?: boolean;
  ratingData?: RestaurantRatingData;
  navigation?: any;
}

const EnhancedRestaurantCard: React.FC<EnhancedRestaurantCardProps> = ({
  restaurant,
  onPress,
  showSyncStatus = true,
  showRanking = true,
  ratingData,
  navigation
}) => {
  const { theme } = useTheme();
  const [localRatingData, setLocalRatingData] = useState<RestaurantRatingData | null>(ratingData || null);
  const [animatedScale] = useState(new Animated.Value(1));

  useEffect(() => {
    // Get rating data if not provided
    if (!ratingData) {
      const data = ratingCalculationService.getRatingData(restaurant.id);
      if (data) {
        setLocalRatingData(data);
      }
    }
  }, [restaurant.id, ratingData]);

  // Animate on mount
  useEffect(() => {
    Animated.spring(animatedScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, []);

  const currentRatingData = ratingData || localRatingData;
  const metrics = currentRatingData?.metrics;
  const isTopRated = currentRatingData?.isTopRated || false;
  const rank = currentRatingData?.rank;

  const renderStars = (rating: number, size: number = 12): React.ReactElement => {
    const safeRating = (typeof rating === 'number' && !isNaN(rating)) ? rating : 0;
    const fullStars = Math.floor(safeRating);
    const hasHalfStar = safeRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <View style={styles.starContainer}>
        {[...Array(fullStars)].map((_, index) => (
          <Text key={`full-${index}`} style={[styles.star, { fontSize: size, color: '#FFD700' }]}>
            ★
          </Text>
        ))}
        {hasHalfStar && (
          <Text style={[styles.star, { fontSize: size, color: '#FFD700' }]}>
            ★
          </Text>
        )}
        {[...Array(emptyStars)].map((_, index) => (
          <Text key={`empty-${index}`} style={[styles.star, { fontSize: size, color: '#DDD' }]}>
            ★
          </Text>
        ))}
      </View>
    );
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'rising': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#51CF66';
    if (confidence >= 0.5) return '#FFD93D';
    return '#FF6B6B';
  };

  const handlePress = () => {
    // Scale animation on press
    Animated.sequence([
      Animated.timing(animatedScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: animatedScale }] }]}>
      <TouchableOpacity
        onPress={handlePress}
        style={[styles.card, { backgroundColor: theme.surface }]}
      >
        {/* Top Rated Badge */}
        {isTopRated && (
          <View style={[styles.topRatedBadge, { backgroundColor: '#FFD700' }]}>
            <Text style={styles.topRatedText}>TOP RATED</Text>
            <Text style={styles.rankText}>#{rank || ''}</Text>
          </View>
        )}

        {/* Restaurant Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: restaurant.image || `https://picsum.photos/seed/${restaurant.id}/300/200.jpg`
            }}
            style={styles.restaurantImage}
          />
          
          {/* Sync Status Overlay */}
          {showSyncStatus && (
            <View style={styles.syncOverlay}>
              <RatingSyncIndicator compact={true} />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {restaurant.name}
            </Text>
            {showRanking && rank && (
              <View style={[styles.rankBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.rankBadgeText}>#{rank}</Text>
              </View>
            )}
          </View>

          {/* Category */}
          <Text style={[styles.category, { color: theme.textSecondary }]}>
            {restaurant.category || 'Restaurant'}
          </Text>

          {/* Rating Section */}
          {metrics && metrics.totalRatings > 0 ? (
            <View style={styles.ratingSection}>
              <View style={styles.ratingRow}>
                {renderStars(metrics.averageRating)}
                <Text style={[styles.ratingValue, { color: theme.text }]}>
                  {typeof metrics.averageRating === 'number' && !isNaN(metrics.averageRating) ? metrics.averageRating.toFixed(1) : '0.0'}
                </Text>
                <Text style={[styles.ratingCount, { color: theme.textSecondary }]}>
                  ({metrics.totalRatings})
                </Text>
              </View>

              {/* Confidence Indicator */}
              <View style={styles.confidenceRow}>
                <View style={[
                  styles.confidenceDot,
                  { backgroundColor: getConfidenceColor(metrics.confidence) }
                ]} />
                <Text style={[styles.confidenceText, { color: theme.textSecondary }]}>
                  {typeof metrics.confidence === 'number' && !isNaN(metrics.confidence) ? Math.round(metrics.confidence * 100) : 0}% confidence
                </Text>
                
                {/* Trend Indicator */}
                <Text style={styles.trendIcon}>
                  {getTrendIcon(metrics.trend)}
                </Text>
              </View>

              {/* Rating Distribution */}
              {showRanking && (
                <View style={styles.distributionRow}>
                  {Object.entries(metrics.ratingDistribution).map(([rating, count]) => (
                    <View key={rating} style={styles.distributionBar}>
                      <Text style={[styles.distributionRating, { color: theme.textSecondary }]}>
                        {rating}★
                      </Text>
                      <View style={[styles.distributionTrack, { backgroundColor: theme.border }]}>
                        <View
                          style={[
                            styles.distributionFill,
                            {
                              width: `${(count / metrics.totalRatings) * 100}%`,
                              backgroundColor: theme.primary
                            }
                          ]}
                        />
                      </View>
                      <Text style={[styles.distributionCount, { color: theme.textSecondary }]}>
                        {count}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noRatingSection}>
              <Text style={[styles.detailsText, { color: theme.textSecondary }]}>
                No ratings yet
              </Text>
              <Text style={[styles.beFirstText, { color: theme.primary }]}>
                Be the first to rate!
              </Text>
            </View>
          )}

          {/* Price Range */}
          {restaurant.priceRange && (
            <Text style={[styles.priceRange, { color: theme.textSecondary }]}>
              {restaurant.priceRange}
            </Text>
          )}

          {/* Distance/Location (if available) */}
          {restaurant.location && restaurant.location.latitude != null && restaurant.location.longitude != null && (
            <Text style={[styles.location, { color: theme.textSecondary }]}>
              📍 {typeof restaurant.location.latitude === 'number' && !isNaN(restaurant.location.latitude) ? restaurant.location.latitude.toFixed(4) : '0.0000'}, {typeof restaurant.location.longitude === 'number' && !isNaN(restaurant.location.longitude) ? restaurant.location.longitude.toFixed(4) : '0.0000'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  topRatedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  topRatedText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rankText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  imageContainer: {
    position: 'relative',
    height: 150,
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
  },
  syncOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 40,
    alignItems: 'center',
  },
  rankBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  category: {
    fontSize: 14,
    marginBottom: 12,
  },
  ratingSection: {
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  starContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  star: {
    marginRight: 1,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  ratingCount: {
    fontSize: 14,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 12,
    flex: 1,
  },
  trendIcon: {
    fontSize: 14,
    marginLeft: 8,
  },
  distributionRow: {
    marginTop: 8,
  },
  distributionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  distributionRating: {
    fontSize: 10,
    width: 20,
  },
  distributionTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  distributionFill: {
    height: '100%',
    borderRadius: 2,
  },
  distributionCount: {
    fontSize: 10,
    width: 20,
    textAlign: 'right',
  },
  noRatingSection: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 12,
  },
  noRatingText: {
    fontSize: 14,
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 14,
    marginBottom: 4,
  },
  beFirstText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceRange: {
    fontSize: 14,
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default EnhancedRestaurantCard;
