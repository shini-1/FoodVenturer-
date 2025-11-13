import React from 'react';
import { WebView } from 'react-native-webview';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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
    } else if (name.includes('bakery') || name.includes('bread') || name.includes('pastry')) {
      category = 'bakery';
      color = '#f39c12';
      emoji = '🥖';
    } else if (name.includes('steak') || name.includes('grill') || name.includes('barbecue')) {
      category = 'grill';
      color = '#e74c3c';
      emoji = '🥩';
    } else if (name.includes('seafood') || name.includes('fish') || name.includes('lobster')) {
      category = 'seafood';
      color = '#3498db';
      emoji = '🦞';
    } else if (name.includes('mexican') || name.includes('taco') || name.includes('burrito')) {
      category = 'mexican';
      color = '#e67e22';
      emoji = '🌮';
    } else if (name.includes('thai') || name.includes('vietnam')) {
      category = 'thai';
      color = '#27ae60';
      emoji = '🍜';
    } else if (name.includes('buffet') || name.includes('all you can eat')) {
      category = 'buffet';
      color = '#f1c40f';
      emoji = '🍽️';
    } else if (name.includes('fine') || name.includes('elegant') || name.includes('upscale')) {
      category = 'fine_dining';
      color = '#8e44ad';
      emoji = '🍾';
    } else if (name.includes('fast') || name.includes('quick')) {
      category = 'fast_casual';
      color = '#16a085';
      emoji = '🏃';
    } else if (name.includes('family') || name.includes('kids')) {
      category = 'family';
      color = '#f39c12';
      emoji = '👨‍👩‍👧‍👦';
    } else if (name.includes('diner')) {
      category = 'diner';
      color = '#95a5a6';
      emoji = '🍳';
    }

    const categorized = {
      ...restaurant,
      category,
      color,
      emoji,
      markerNumber: 1
    };

    console.log('✅ MapBoxWebView: Categorized', restaurant.name, 'as', category, 'with color', color);

    return categorized;
  });

  console.log('🗺️ MapBoxWebView: Created', categorizedRestaurants.length, 'categorized restaurants for map');

  // Simple 2D terrain map HTML with offline caching and categorized markers
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Offline Terrain Map</title>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
      <script src="https://api.mapbox.com/mapbox-gl-js/v2.14.1/mapbox-gl.js"></script>
      <script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-offline/v1.0.0/mapbox-gl-offline.js"></script>
      <link href="https://api.mapbox.com/mapbox-gl-js/v2.14.1/mapbox-gl.css" rel="stylesheet">
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        #map {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
        }

        .restaurant-marker {
          border-radius: 50%;
          width: 32px;
          height: 32px;
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }

        .mapboxgl-popup-content {
          padding: 12px;
          border-radius: 8px;
        }

        .restaurant-popup {
          text-align: center;
          min-width: 200px;
        }

        .restaurant-popup h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: bold;
          color: #333;
        }

        .restaurant-popup .category {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 15px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 8px;
          color: white;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }

        .restaurant-popup .coords {
          font-size: 12px;
          color: #666;
          margin: 0;
        }

        .legend-toggle {
          position: absolute;
          top: 10px;
          left: 10px;
          background: white;
          border: 2px solid #007cbf;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: bold;
          color: #007cbf;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 1000;
        }

        .legend {
          position: absolute;
          top: 50px;
          left: 10px;
          background: white;
          padding: 12px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          font-size: 12px;
          z-index: 1000;
          display: none;
        }

        .legend-item {
          display: flex;
          align-items: center;
          margin-bottom: 4px;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 6px;
          border: 1px solid #ccc;
        }

        .offline-status {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255, 255, 255, 0.9);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: bold;
          z-index: 1000;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .offline-status.online {
          color: #27ae60;
        }

        .offline-status.offline {
          color: #e74c3c;
        }
      </style>
    </head>
    <body>
      <div id="offline-status" class="offline-status">Checking...</div>
      <div id="map"></div>

      <button id="legend-toggle" class="legend-toggle">📋 Legend</button>

      <div id="legend" class="legend">
        <div style="font-weight: bold; margin-bottom: 8px; color: #333;">Restaurant Types:</div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #e74c3c;"></div>
          <span>🍕 Italian</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #8b4513;"></div>
          <span>☕ Cafe</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #ff6b35;"></div>
          <span>🍔 Fast Food</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #e67e22;"></div>
          <span>🥢 Asian</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #9b59b6;"></div>
          <span>🍱 Japanese</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #4a90e2;"></div>
          <span>🍽️ Casual</span>
        </div>
      </div>

      <script>
        console.log('🗺️ Offline Terrain Map with caching starting...');
        console.log('🗺️ Browser online status:', navigator.onLine);
        console.log('🗺️ User agent:', navigator.userAgent);

        try {
          // Initialize MapBox
          mapboxgl.accessToken = '${mapboxToken}';
          console.log('🗺️ MapBox token set');

          // Check online status
          function updateOnlineStatus() {
            const isOnline = navigator.onLine;
            const statusEl = document.getElementById('offline-status');
            if (statusEl) {
              statusEl.textContent = isOnline ? '🟢 Online' : '🔴 Offline';
              statusEl.className = 'offline-status ' + (isOnline ? 'online' : 'offline');
            }
            return isOnline;
          }

          updateOnlineStatus();
          window.addEventListener('online', updateOnlineStatus);
          window.addEventListener('offline', updateOnlineStatus);

          // Create offline region name
          const offlineRegionName = 'foodventurer-map-region';

          // Create simple 2D terrain map
          const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/outdoors-v12',
            center: [122.3649, 11.7061],
            zoom: 13,
            // Enable offline capabilities
            offline: true
          });

          console.log('🗺️ Offline Terrain map created, waiting for load...');

          map.on('load', function() {
            console.log('🗺️ Offline Terrain map loaded successfully');
            console.log('🗺️ Map bounds:', map.getBounds());
            console.log('🗺️ Map center:', map.getCenter());

            // Check if offline region exists
            if (updateOnlineStatus()) {
              // Online: Try to download/create offline region
              createOfflineRegion();
            } else {
              // Offline: Check if cached region exists
              checkOfflineRegion();
            }

            // Add restaurant markers
            const restaurants = ${JSON.stringify(categorizedRestaurants)};
            console.log('🗺️ Adding categorized markers for', restaurants.length, 'restaurants');
            console.log('🗺️ First restaurant sample:', restaurants[0]);

            restaurants.forEach((restaurant, index) => {
              // Create marker element with category-specific styling
              const markerEl = document.createElement('div');
              markerEl.className = 'restaurant-marker';
              markerEl.style.backgroundColor = restaurant.color;
              markerEl.textContent = restaurant.emoji;

              // Create popup with category info
              const popup = new mapboxgl.Popup({ offset: 25 })
                .setHTML(\`
                  <div class="restaurant-popup">
                    <div class="category" style="background-color: \${restaurant.color};">\${restaurant.emoji} \${restaurant.category.replace('_', ' ').toUpperCase()}</div>
                    <h3>\${restaurant.name}</h3>
                    <p class="coords">📍 \${restaurant.location.latitude.toFixed(4)}, \${restaurant.location.longitude.toFixed(4)}</p>
                  </div>
                \`);

              // Create and add marker
              new mapboxgl.Marker(markerEl)
                .setLngLat([restaurant.location.longitude, restaurant.location.latitude])
                .setPopup(popup)
                .addTo(map);

              console.log('🗺️ Added', restaurant.category, 'marker for:', restaurant.name, 'at', restaurant.location.latitude, restaurant.location.longitude);
              if (index < 5) {
                console.log('🗺️ Marker', index + 1, 'details:', restaurant);
              }
            });

            // Fit map to show all markers with different behavior for single restaurant
            if (restaurants.length > 0) {
              if (restaurants.length === 1) {
                // For single restaurant (detail screen), center on it with appropriate zoom
                const restaurant = restaurants[0];
                map.setCenter([restaurant.location.longitude, restaurant.location.latitude]);
                map.setZoom(13); // Better zoom level for single restaurant detail view with more context
                console.log('🗺️ Centered map on single restaurant:', restaurant.name, 'at zoom 13');
              } else {
                // For multiple restaurants, fit bounds to show all
                const bounds = new mapboxgl.LngLatBounds();
                restaurants.forEach(r => {
                  bounds.extend([r.location.longitude, r.location.latitude]);
                });
                map.fitBounds(bounds, { padding: 50 });
                console.log('🗺️ Fit bounds for', restaurants.length, 'restaurants');
              }
            }

          // Notify React Native
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapReady',
            restaurantCount: restaurants.length
          }));

          console.log('🗺️ Offline Terrain map ready with categorized markers');

          // Add legend toggle functionality
          const legendToggle = document.getElementById('legend-toggle');
          const legend = document.getElementById('legend');

          if (legendToggle && legend) {
            legendToggle.addEventListener('click', function() {
              const isVisible = legend.style.display !== 'none';
              legend.style.display = isVisible ? 'none' : 'block';
              legendToggle.textContent = isVisible ? '📋 Legend' : '❌ Hide';
              console.log('🗺️ Legend toggled:', isVisible ? 'hidden' : 'shown');
            });
          }

          // Notify that map is fully loaded
          setTimeout(() => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapFullyLoaded',
              restaurantCount: restaurants.length,
              bounds: map.getBounds(),
              center: map.getCenter()
            }));
          }, 1000);

        } catch (mapError) {
          console.error('🗺️ Map load error:', mapError);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapError',
            error: mapError.message,
            stack: mapError.stack
          }));
        }

          // Function to create offline region
          function createOfflineRegion() {
            console.log('🗺️ Creating offline region...');

            // Define the offline region bounds (expand current view)
            const bounds = map.getBounds();
            const expandedBounds = [
              [bounds.getWest() - 0.01, bounds.getSouth() - 0.01], // Southwest
              [bounds.getEast() + 0.01, bounds.getNorth() + 0.01]  // Northeast
            ];

            const offlineRegion = new mapboxgl.OfflineRegion({
              name: offlineRegionName,
              bounds: expandedBounds,
              zoom: {
                min: 10,
                max: 16
              },
              style: map.getStyle()
            });

            // Download the offline region
            offlineRegion.download(function(progress) {
              console.log('🗺️ Offline download progress:', Math.round(progress * 100) + '%');

              // Update status
              const statusEl = document.getElementById('offline-status');
              if (statusEl) {
                statusEl.textContent = '🟡 Downloading: ' + Math.round(progress * 100) + '%';
              }

              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'downloadProgress',
                progress: progress
              }));
            }, function(error) {
              console.error('🗺️ Offline download error:', error);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'downloadError',
                error: error.message
              }));
            }, function() {
              console.log('🗺️ Offline region downloaded successfully');
              updateOnlineStatus();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'downloadComplete'
              }));
            });
          }

          // Function to check if offline region exists
          function checkOfflineRegion() {
            console.log('🗺️ Checking for existing offline region...');

            // List offline regions
            mapboxgl.offline.listOfflineRegions(function(regions) {
              const existingRegion = regions.find(r => r.name === offlineRegionName);
              if (existingRegion) {
                console.log('🗺️ Found existing offline region, using cached tiles');
                // Use the cached region
                map.setOfflineRegion(existingRegion);
              } else {
                console.log('🗺️ No offline region found, map may not work offline');
              }
            });
          }

        } catch (error) {
          console.error('🗺️ Map initialization error:', error);
          console.error('🗺️ Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapError',
            error: error.message,
            stack: error.stack
          }));
        }

        // Global error handler for WebView
        window.addEventListener('error', function(e) {
          console.error('🗺️ Global WebView error:', e.error);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'webviewError',
            error: e.error.message,
            filename: e.filename,
            lineno: e.lineno
          }));
        });

        window.addEventListener('unhandledrejection', function(e) {
          console.error('🗺️ Unhandled promise rejection:', e.reason);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'promiseRejection',
            reason: e.reason
          }));
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={{ flex: 1 }}>
      {!shouldShowMap && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>⚠️ You're offline. Map may not load properly.</Text>
        </View>
      )}
      <WebView
        source={{ html }}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mixedContentMode="compatibility"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowFileAccessFromFileURLs={true}
        originWhitelist={['*']}
        onLoadStart={() => console.log('🗺️ Offline WebView load started')}
        onLoadEnd={() => console.log('🗺️ Offline WebView load completed')}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('🗺️ Offline WebView message:', data);

            switch (data.type) {
              case 'mapReady':
                console.log('🗺️ Map ready with', data.restaurantCount, 'restaurants');
                break;
              case 'mapFullyLoaded':
                console.log('🗺️ Map fully loaded with', data.restaurantCount, 'restaurants, bounds:', data.bounds, 'center:', data.center);
                break;
              case 'downloadProgress':
                console.log('🗺️ Download progress:', Math.round(data.progress * 100) + '%');
                break;
              case 'downloadComplete':
                console.log('🗺️ Offline download completed');
                break;
              case 'downloadError':
                console.error('🗺️ Download error:', data.error);
                break;
              case 'mapError':
                console.error('🗺️ Map error:', data.error, 'Stack:', data.stack);
                break;
              case 'webviewError':
                console.error('🗺️ WebView JavaScript error:', data.error, 'File:', data.filename, 'Line:', data.lineno);
                break;
              case 'promiseRejection':
                console.error('🗺️ Unhandled promise rejection:', data.reason);
                break;
              default:
                console.log('🗺️ Unknown message type:', data.type);
            }
          } catch (error) {
            console.error('🗺️ Error parsing WebView message:', error);
            console.error('🗺️ Raw message:', event.nativeEvent.data);
          }
        }}
        onError={(error) => {
          console.error('🗺️ Offline WebView error:', error);
        }}
      />
    </View>
  );
}

export default MapBoxWebView;

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: '#ffeaa7',
    padding: 10,
    alignItems: 'center',
  },
  offlineText: {
    color: '#d63031',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  fallbackText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
  },
  restaurantList: {
    flex: 1,
    width: '100%',
  },
  restaurantItem: {
    backgroundColor: 'white',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  restaurantCoords: {
    fontSize: 12,
    color: '#666',
  },
});
