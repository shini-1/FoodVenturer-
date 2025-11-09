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
  console.log('🗺️ MapBoxWebView: Rendering with', restaurants.length, 'restaurants, online:', isOnline);

  const mapboxToken = 'pk.eyJ1Ijoic2hpbmlpaSIsImEiOiJjbWhkZGIwZzYwMXJmMmtxMTZpY294c2V6In0.zuQl6u8BJxOgimXHxMiNqQ';

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

    return {
      ...restaurant,
      category,
      color,
      emoji,
      markerNumber: 1
    };
  });

  // Simple 2D terrain map HTML with categorized markers and legend
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>2D Terrain Map</title>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
      <script src="https://api.mapbox.com/mapbox-gl-js/v2.14.1/mapbox-gl.js"></script>
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
      </style>
    </head>
    <body>
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
        console.log('🗺️ 2D Terrain Map with categories starting...');

        try {
          // Initialize MapBox
          mapboxgl.accessToken = '${mapboxToken}';
          console.log('🗺️ MapBox token set');

          // Create simple 2D terrain map
          const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/outdoors-v12',
            center: [122.3649, 11.7061],
            zoom: 13
          });

          console.log('🗺️ 2D Terrain map created');

          map.on('load', function() {
            console.log('🗺️ 2D Terrain map loaded successfully');

            // Add restaurant markers
            const restaurants = ${JSON.stringify(categorizedRestaurants)};
            console.log('🗺️ Adding categorized markers for', restaurants.length, 'restaurants');

            restaurants.forEach((restaurant) => {
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

              console.log('🗺️ Added', restaurant.category, 'marker for:', restaurant.name);
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

            console.log('🗺️ 2D Terrain map ready with categorized markers');

            // Add legend toggle functionality
            const legendToggle = document.getElementById('legend-toggle');
            const legend = document.getElementById('legend');

            if (legendToggle && legend) {
              legendToggle.addEventListener('click', function() {
                const isVisible = legend.style.display !== 'none';
                legend.style.display = isVisible ? 'none' : 'block';
                legendToggle.textContent = isVisible ? '📋 Legend' : '❌ Hide';
              });
            }

            // Notify React Native
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapReady',
              restaurantCount: restaurants.length
            }));

          });

          map.on('error', function(e) {
            console.error('🗺️ Map error:', e);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapError',
              error: e.error.message
            }));
          });

        } catch (error) {
          console.error('🗺️ Map initialization error:', error);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapError',
            error: error.message
          }));
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={{ flex: 1 }}>
      {!isOnline && (
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
        onLoadStart={() => console.log('🗺️ 2D Terrain WebView load started')}
        onLoadEnd={() => console.log('🗺️ 2D Terrain WebView load completed')}
        onMessage={(event) => {
          console.log('🗺️ 2D Terrain WebView message:', event.nativeEvent.data);
        }}
        onError={(error) => {
          console.error('🗺️ 2D Terrain WebView error:', error);
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
