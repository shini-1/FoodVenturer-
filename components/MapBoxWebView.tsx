import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNetwork } from '../src/contexts/NetworkContext';

interface Restaurant {
  id: string;
  name: string;
  location: { latitude: number; longitude: number };
}

interface MapBoxWebViewProps {
  restaurants: Restaurant[];
}

function MapBoxWebView({ restaurants }: MapBoxWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  const { isOnline } = useNetwork();
  console.log('🗺️ MapBoxWebView: Component rendered with', restaurants?.length || 0, 'restaurants, online:', isOnline);
  console.log('🗺️ MapBoxWebView: Network detection details:', { isOnline });

  if (!restaurants || restaurants.length === 0) {
    console.warn('🗺️ MapBoxWebView: No restaurants data provided!');
    return (
      <View style={styles.offlineBanner}>
        <Text style={styles.offlineText}>📍 No restaurants to display on map</Text>
      </View>
    );
  }

  // Force online mode for debugging - remove this after confirming the fix
  const forceOnline = true; // Set to false to test offline behavior
  const shouldShowMap = isOnline || forceOnline;

  const mapboxToken = 'pk.eyJ1Ijoic2hpbmlpaSIsImEiOiJjbWhkZGIwZzYwMXJmMmtxMTZpY294c2V6In0.zuQl6u8BJxOgimXHxMiNqQ';

  // Categorize restaurants by type
  const categorizedRestaurants = restaurants.map((restaurant) => {
    console.log('🏷️ MapBoxWebView: Processing restaurant:', restaurant.name, {
      hasLocation: !!restaurant.location,
      lat: restaurant.location?.latitude,
      lng: restaurant.location?.longitude
    });

    const name = restaurant.name.toLowerCase();
    let category = 'casual';
    let color = '#4a90e2'; // Default blue
    let emoji = '🍽️';

    if (name.includes('pizza') || name.includes('pizzeria')) {
      category = 'italian';
      color = '#e74c3c';
      emoji = '🍕';
    } else if (name.includes('cafe') || name.includes('coffee') || name.includes('starbucks')) {
      category = 'cafe';
      color = '#8b4513';
      emoji = '☕';
    } else if (name.includes('burger') || name.includes('mcdonald') || name.includes('wendy')) {
      category = 'fast_food';
      color = '#ff6b35';
      emoji = '🍔';
    } else if (name.includes('chinese') || name.includes('china') || name.includes('wok')) {
      category = 'asian';
      color = '#e67e22';
      emoji = '🥢';
    } else if (name.includes('sushi') || name.includes('japanese') || name.includes('tokyo')) {
      category = 'japanese';
      color = '#9b59b6';
      emoji = '🍱';
    }

    return {
      ...restaurant,
      category,
      color,
      emoji
    };
  });

  console.log('🗺️ Native Map View: Created', categorizedRestaurants.length, 'categorized restaurants');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🍽️ Restaurant Map</Text>
        <Text style={styles.subtitle}>
          {isOnline ? '🟢 Online - Interactive map available in production build' : '🔴 Offline - Showing restaurant list'}
        </Text>
        <Text style={styles.note}>
          WebView JavaScript is restricted in Expo Go. Full map functionality available in development/production builds.
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {categorizedRestaurants.map((restaurant, index) => (
          <TouchableOpacity
            key={restaurant.id}
            style={[styles.restaurantCard, { borderLeftColor: restaurant.color }]}
            onPress={() => {
              console.log('🗺️ Restaurant selected:', restaurant.name, restaurant.location);
            }}
          >
            <View style={styles.restaurantHeader}>
              <Text style={styles.restaurantEmoji}>{restaurant.emoji}</Text>
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName} numberOfLines={1}>
                  {restaurant.name}
                </Text>
                <Text style={styles.restaurantCategory}>
                  {restaurant.category.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.locationInfo}>
              <Text style={styles.coordinates}>
                📍 {restaurant.location.latitude.toFixed(4)}, {restaurant.location.longitude.toFixed(4)}
              </Text>
              <Text style={styles.distance}>
                🗺️ View on map (opens in browser)
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {categorizedRestaurants.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No restaurants found</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          📊 Total: {categorizedRestaurants.length} restaurants
        </Text>
        <Text style={styles.footerNote}>
          Build a development APK for full interactive map features
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  note: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  restaurantCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  restaurantEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  restaurantCategory: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  locationInfo: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  coordinates: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  distance: {
    fontSize: 12,
    color: '#2196f3',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  offlineBanner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 20,
  },
  offlineText: {
    fontSize: 16,
    color: '#c62828',
    textAlign: 'center',
  },
});

export default MapBoxWebView;
