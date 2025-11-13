import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNetwork } from '../src/contexts/NetworkContext';
import Constants from 'expo-constants';

interface Restaurant {
  id: string;
  name: string;
  location: { latitude: number; longitude: number };
}

interface MapBoxWebViewProps {
  restaurants: Restaurant[];
}

// WebView component with MapBox for production builds
function MapBoxWebViewComponent({ restaurants, isOnline }: { restaurants: Restaurant[], isOnline: boolean }) {
  const webViewRef = useRef<WebView>(null);

  const mapboxToken = 'pk.eyJ1Ijoic2hpbmlpaSIsImEiOiJjbWhkZGIwZzYwMXJmMmtxMTZpY294c2V6In0.zuQl6u8BJxOgimXHxMiNqQ';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>FoodVenturer Map</title>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
      <script src='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'></script>
      <link href='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css' rel='stylesheet' />
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; }
        .marker { background-color: #ff0000; border-radius: 50%; width: 20px; height: 20px; border: 2px solid #fff; }
        .marker.italian { background-color: #e74c3c; }
        .marker.fast_food { background-color: #ff8c00; }
        .marker.cafe { background-color: #8b4513; }
        .marker.asian { background-color: #32cd32; }
        .popup-content { font-size: 14px; line-height: 1.4; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        mapboxgl.accessToken = '${mapboxToken}';
        
        const map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [-122.4194, 37.7749], // Default to San Francisco
          zoom: 12
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl());

        // Restaurant data
        const restaurants = ${JSON.stringify(restaurants)};

        // Add markers for each restaurant
        restaurants.forEach(restaurant => {
          const { location, name } = restaurant;
          
          // Determine category and color
          const nameLower = name.toLowerCase();
          let category = 'casual';
          if (nameLower.includes('pizza') || nameLower.includes('pizzeria')) category = 'italian';
          else if (nameLower.includes('burger') || nameLower.includes('mcdonald') || nameLower.includes('kfc')) category = 'fast_food';
          else if (nameLower.includes('cafe') || nameLower.includes('coffee') || nameLower.includes('starbucks')) category = 'cafe';
          else if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('thai')) category = 'asian';

          // Create marker element
          const markerElement = document.createElement('div');
          markerElement.className = 'marker ' + category;

          // Create popup
          const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML('<div class="popup-content"><strong>' + name + '</strong><br>📍 ' + location.latitude.toFixed(4) + ', ' + location.longitude.toFixed(4) + '</div>');

          // Add marker to map
          new mapboxgl.Marker(markerElement)
            .setLngLat([location.longitude, location.latitude])
            .setPopup(popup)
            .addTo(map);
        });

        // Fit map to show all markers
        if (restaurants.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          restaurants.forEach(restaurant => {
            bounds.extend([restaurant.location.longitude, restaurant.location.latitude]);
          });
          map.fitBounds(bounds, { padding: 50 });
        }

        console.log('🗺️ MapBox map initialized with', restaurants.length, 'restaurants');
      </script>
    </body>
    </html>
  `;

  return (
    <WebView
      ref={webViewRef}
      source={{ html }}
      style={{ flex: 1 }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      originWhitelist={['*']}
      onLoadStart={() => console.log('🗺️ MapBox WebView load started')}
      onLoadEnd={() => console.log('🗺️ MapBox WebView load completed')}
      onError={(error) => console.error('🗺️ MapBox WebView error:', error)}
    />
  );
}

// Native fallback component for Expo Go
function NativeMapFallback({ restaurants, isOnline }: { restaurants: Restaurant[], isOnline: boolean }) {
  // Categorize restaurants by type
  const categorizedRestaurants = restaurants.map((restaurant) => {
    const name = restaurant.name.toLowerCase();
    let category = 'casual';
    let color = '#4a90e2'; // Default blue
    let emoji = '🍽️';

    if (name.includes('pizza') || name.includes('pizzeria')) {
      category = 'italian';
      color = '#e74c3c';
      emoji = '🍕';
    } else if (name.includes('burger') || name.includes('mcdonald') || name.includes('kfc')) {
      category = 'fast_food';
      color = '#ff8c00';
      emoji = '🍔';
    } else if (name.includes('cafe') || name.includes('coffee') || name.includes('starbucks')) {
      category = 'cafe';
      color = '#8b4513';
      emoji = '☕';
    } else if (name.includes('sushi') || name.includes('ramen') || name.includes('thai')) {
      category = 'asian';
      color = '#32cd32';
      emoji = '🍱';
    }

    return { ...restaurant, category, color, emoji };
  });

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
        <Text style={styles.footerText}>📊 Total: {categorizedRestaurants.length} restaurants</Text>
        <Text style={styles.footerNote}>
          Build a development APK for full interactive map features
        </Text>
      </View>
    </View>
  );
}

// Main component that conditionally renders based on environment
function MapBoxWebView({ restaurants }: MapBoxWebViewProps) {
  const { isOnline } = useNetwork();
  
  // Detect if we're in Expo Go or a production build
  const isExpoGo = Constants.appOwnership === 'expo';
  const isProduction = !isExpoGo && Constants.releaseChannel !== 'default';
  
  console.log('🗺️ MapBoxWebView: Component rendered with', restaurants?.length || 0, 'restaurants, online:', isOnline);
  console.log('🗺️ MapBoxWebView: Environment - isExpoGo:', isExpoGo, 'isProduction:', isProduction, 'releaseChannel:', Constants.releaseChannel);

  if (!restaurants || restaurants.length === 0) {
    console.warn('🗺️ MapBoxWebView: No restaurants data provided!');
    return (
      <View style={styles.offlineBanner}>
        <Text style={styles.offlineText}>📍 No restaurants to display on map</Text>
      </View>
    );
  }

  // In production builds, show the actual WebView with MapBox
  if (isProduction) {
    return <MapBoxWebViewComponent restaurants={restaurants} isOnline={isOnline} />;
  }

  // In Expo Go or development, show native fallback
  return <NativeMapFallback restaurants={restaurants} isOnline={isOnline} />;
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
