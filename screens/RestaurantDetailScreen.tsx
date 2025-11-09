import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Restaurant } from '../types';
import { reverseGeocode } from '../src/services/geocodingService';
import Header from '../components/Header';
import MapBoxWebView from '../components/MapBoxWebView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainer: {
    height: 250,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  infoSection: {
    marginBottom: 20,
  },
  restaurantName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  restaurantCategory: {
    fontSize: 16,
    marginBottom: 16,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  categoryText: {
    fontSize: 14,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  contactContainer: {
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 16,
    marginLeft: 12,
  },
  hoursText: {
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    padding: 20,
    marginVertical: 10,
    borderRadius: 15,
    width: '100%',
    borderWidth: 2,
    borderTopWidth: 4,
    elevation: 5,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 8,
  },
  locationInfo: {
    marginLeft: 12,
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  locationSubtext: {
    fontSize: 14,
  },
  directionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

interface RestaurantDetailScreenProps {
  navigation: any;
  route?: {
    params?: {
      restaurantId?: string;
      restaurant?: Restaurant;
    };
  };
}

function RestaurantDetailScreen({ navigation, route }: RestaurantDetailScreenProps) {
  const { theme } = useTheme();

  // Extract restaurant data from route params
  const { restaurantId, restaurant: initialRestaurant } = route?.params || {};

  // Component state
  const [restaurant, setRestaurant] = useState<Restaurant | null>(initialRestaurant || null);
  const [loading, setLoading] = useState(!initialRestaurant);
  const [address, setAddress] = useState<string>('');

  // Debug logging
  useEffect(() => {
    console.log('🔍 RestaurantDetailScreen - route params:', route?.params);
    console.log('🔍 RestaurantDetailScreen - restaurantId:', restaurantId);
    console.log('🔍 RestaurantDetailScreen - initialRestaurant:', initialRestaurant);
  }, [route?.params, restaurantId, initialRestaurant]);

  // Load restaurant data if not provided
  useEffect(() => {
    if (initialRestaurant) {
      setRestaurant(initialRestaurant);
      setLoading(false);
    } else if (restaurantId) {
      // TODO: Implement fetching individual restaurant by ID
      console.log('🔍 Would fetch restaurant by ID:', restaurantId);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [initialRestaurant, restaurantId]);

  // Fetch address from coordinates
  useEffect(() => {
    const fetchAddress = async () => {
      if (restaurant?.location) {
        console.log('🔍 Geocoding for restaurant:', restaurant.name, 'at', restaurant.location.latitude, restaurant.location.longitude);
        const addr = await reverseGeocode(restaurant.location.latitude, restaurant.location.longitude);
        console.log('🔍 Geocoding result:', addr);
        setAddress(addr);
      } else {
        console.log('🔍 No location for restaurant:', restaurant);
      }
    };
    if (restaurant) {
      fetchAddress();
    }
  }, [restaurant]);

  // Parse address from restaurant name (format: "Restaurant Name, Street, City, Province, Zip")
  const parseAddressFromName = (fullName: string): string => {
    const parts = fullName.split(', ');
    if (parts.length >= 4) {
      // Take Street, City, Province (parts 1, 2, 3)
      return parts.slice(1, 4).join(', ');
    } else if (parts.length >= 2) {
      // Fallback to removing just the restaurant name
      const addressParts = parts.slice(1);
      return addressParts.join(', ');
    }
    return fullName; // Fallback to full name if parsing fails
  };
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading restaurant details...
        </Text>
      </View>
    );
  }

  // Error state
  if (!restaurant) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Restaurant not found</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.retryButtonText, { color: theme.background }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header />
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: restaurant.image || 'https://via.placeholder.com/400x250?text=No+Image' }}
            style={styles.headerImage}
          />
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={{color: 'white', fontSize: 24}}>{'<'}</Text>
          </TouchableOpacity>
        </View>

        {/* Restaurant Info */}
        <View style={styles.content}>
          <View style={styles.infoSection}>
            <Text style={[styles.restaurantName, { color: theme.text }]}>
              {restaurant.name.split(', ')[0]}
            </Text>

            {/* Rating and Category */}
            <View style={styles.ratingSection}>
              {restaurant.rating && (
                <View style={styles.ratingContainer}>
                  <Text style={{color: '#FFD700', fontSize: 16}}>Star</Text>
                  <Text style={[styles.ratingText, { color: theme.text }]}>
                    {restaurant.rating.toFixed(1)}
                  </Text>
                </View>
              )}
              <Text style={[styles.categoryText, { color: theme.textSecondary }]}>
                {restaurant.category || 'Restaurant'} - {restaurant.priceRange || '$'}
              </Text>
            </View>
          </View>

          {/* Description */}
          {restaurant.description && (
            <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.primary, shadowColor: theme.primary }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
              <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
                {restaurant.description}
              </Text>
            </View>
          )}

          {/* Contact Information */}
          {(restaurant.phone || restaurant.website) && (
            <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.primary, shadowColor: theme.primary }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact</Text>
              <View style={styles.contactContainer}>
                {restaurant.phone && (
                  <TouchableOpacity
                    style={styles.contactItem}
                    onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}
                  >
                    <Text style={{color: theme.primary, fontSize: 20}}>Call</Text>
                    <Text style={[styles.contactText, { color: theme.text }]}>{restaurant.phone}</Text>
                  </TouchableOpacity>
                )}
                {restaurant.website && (
                  <TouchableOpacity
                    style={styles.contactItem}
                    onPress={() => Linking.openURL(restaurant.website!.startsWith('http') ? restaurant.website! : `https://${restaurant.website!}`)}
                  >
                    <Text style={{color: theme.primary, fontSize: 20}}>Web</Text>
                    <Text style={[styles.contactText, { color: theme.text }]}>{restaurant.website}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Hours */}
          {restaurant.hours && (
            <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.primary, shadowColor: theme.primary }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Hours</Text>
              <Text style={[styles.hoursText, { color: theme.textSecondary }]}>
                {restaurant.hours}
              </Text>
            </View>
          )}

          {/* Location Details */}
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.primary, shadowColor: theme.primary }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Location Details</Text>
            <View style={[styles.locationCard, { backgroundColor: theme.surface }]}>
              <View style={styles.locationInfo}>
                <Text style={[styles.locationText, { color: theme.text }]}>
                  Location: {address || parseAddressFromName(restaurant.name)}
                </Text>
                <Text style={[styles.locationSubtext, { color: theme.textSecondary }]}>
                  Coordinates: {restaurant.location.latitude.toFixed(6)}, {restaurant.location.longitude.toFixed(6)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.directionButton, { backgroundColor: theme.primary }]}
                onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${restaurant.location.latitude},${restaurant.location.longitude}`)}
              >
                <Text style={[styles.directionButtonText, { color: theme.background }]}>Directions</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.mapContainer, { backgroundColor: theme.surface }]}>
              <MapBoxWebView restaurants={[restaurant]} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default RestaurantDetailScreen;
