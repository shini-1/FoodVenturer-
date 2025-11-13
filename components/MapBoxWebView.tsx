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

  // Simple HTML test - remove all MapBox complexity
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Simple Map Test</title>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: Arial, sans-serif;
          background: #f0f8ff;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #2e7d32;
          text-align: center;
          margin-bottom: 20px;
        }
        .status {
          padding: 10px;
          border-radius: 5px;
          margin: 10px 0;
          font-weight: bold;
        }
        .online { background: #e8f5e8; color: #2e7d32; border: 1px solid #4caf50; }
        .offline { background: #ffebee; color: #c62828; border: 1px solid #f44336; }
        .restaurant {
          background: #f5f5f5;
          padding: 15px;
          margin: 10px 0;
          border-radius: 8px;
          border-left: 4px solid #2196f3;
        }
        .restaurant-name {
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
        }
        .restaurant-coords {
          color: #666;
          font-size: 14px;
        }
        .emoji {
          font-size: 20px;
          margin-right: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🍽️ FoodVenturer Map Test</h1>

        <div id="status" class="status">Checking connectivity...</div>

        <p><strong>WebView Test Results:</strong></p>
        <ul>
          <li>✅ HTML loaded successfully</li>
          <li>✅ CSS styles applied</li>
          <li id="js-test">⏳ Testing JavaScript...</li>
          <li id="data-test">⏳ Testing data...</li>
        </ul>

        <p><strong>Connectivity:</strong></p>
        <div id="connectivity-info">Loading...</div>

        <p><strong>Restaurant Data (${restaurants.length} restaurants):</strong></p>
        <div id="restaurants-list">
          <div style="text-align: center; padding: 20px; color: #666;">
            Loading restaurant data...
          </div>
        </div>
      </div>

      <script>
        console.log('🧪 Simple WebView test starting...');

        // Test JavaScript execution
        document.getElementById('js-test').innerHTML = '✅ JavaScript working';

        // Test data access
        try {
          const restaurants = ${JSON.stringify(categorizedRestaurants)};
          document.getElementById('data-test').innerHTML = '✅ Data loaded (' + restaurants.length + ' items)';

          // Display restaurants
          const listDiv = document.getElementById('restaurants-list');
          if (restaurants.length > 0) {
            listDiv.innerHTML = restaurants.slice(0, 10).map(r =>
              '<div class="restaurant">' +
                '<div class="restaurant-name">' +
                  '<span class="emoji">' + r.emoji + '</span>' + r.name +
                '</div>' +
                '<div class="restaurant-coords">📍 ' + r.location.latitude.toFixed(4) + ', ' + r.location.longitude.toFixed(4) + '</div>' +
              '</div>'
            ).join('') +
            (restaurants.length > 10 ? '<p style="text-align: center; color: #666; margin: 10px;">... and ' + (restaurants.length - 10) + ' more restaurants</p>' : '');
          } else {
            listDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No restaurants found</div>';
          }

          console.log('🧪 Restaurants displayed:', restaurants.length);
        } catch (error) {
          document.getElementById('data-test').innerHTML = '❌ Data error: ' + error.message;
          console.error('🧪 Data error:', error);
        }

        // Test connectivity
        function updateConnectivity() {
          const isOnline = navigator.onLine;
          const statusDiv = document.getElementById('status');
          const infoDiv = document.getElementById('connectivity-info');

          if (isOnline) {
            statusDiv.className = 'status online';
            statusDiv.textContent = '🟢 Online - Map should work';
          } else {
            statusDiv.className = 'status offline';
            statusDiv.textContent = '🔴 Offline - Map unavailable';
          }

          infoDiv.innerHTML = '<strong>Navigator.onLine:</strong> ' + isOnline + '<br>' +
                             '<strong>User Agent:</strong> ' + navigator.userAgent.substring(0, 50) + '...';

          console.log('🧪 Connectivity check:', { isOnline, userAgent: navigator.userAgent });

          // Send message to React Native
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'webviewTest',
            isOnline: isOnline,
            restaurantCount: ${JSON.stringify(categorizedRestaurants)}.length,
            timestamp: Date.now()
          }));
        }

        // Initial check
        updateConnectivity();

        // Listen for connectivity changes
        window.addEventListener('online', updateConnectivity);
        window.addEventListener('offline', updateConnectivity);

        console.log('🧪 WebView test completed successfully');
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
              case 'webviewTest':
                console.log('🧪 WebView test result:', {
                  isOnline: data.isOnline,
                  restaurantCount: data.restaurantCount,
                  timestamp: new Date(data.timestamp).toLocaleTimeString()
                });
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
              case 'fallbackMapShown':
                console.log('🗺️ Fallback map shown with', data.restaurantCount, 'restaurants');
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
