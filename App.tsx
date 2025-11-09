import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './theme/ThemeContext';
import { AuthProvider } from './components/AuthContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import RoleSelectionScreen from './screens/RoleSelectionScreen';
import HomeScreen from './screens/HomeScreen';
import BusinessPanelScreen from './screens/BusinessPanelScreen';
import AdminPanelScreen from './screens/AdminPanelScreen';
import CreateAdminScreen from './screens/CreateAdminScreen';
import RestaurantDetailScreen from './screens/RestaurantDetailScreen';

type Screen = 'RoleSelection' | 'Home' | 'BusinessPanel' | 'AdminPanel' | 'CreateAdmin' | 'RestaurantDetail';

interface NavigationParams {
  restaurantId?: string;
  restaurant?: any;
  [key: string]: any;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('RoleSelection');
  const [screenParams, setScreenParams] = useState<NavigationParams>({});

  const navigate = (screen: Screen, params?: NavigationParams) => {
    setCurrentScreen(screen);
    if (params) {
      setScreenParams(params);
    } else {
      setScreenParams({});
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'RoleSelection':
        return <RoleSelectionScreen navigation={{ navigate }} />;
      case 'Home':
        return <HomeScreen navigation={{ navigate }} />;
      case 'BusinessPanel':
        return <BusinessPanelScreen navigation={{ navigate }} />;
      case 'AdminPanel':
        return <AdminPanelScreen navigation={{ navigate }} />;
      case 'CreateAdmin':
        return <CreateAdminScreen navigation={{ navigate }} />;
      case 'RestaurantDetail':
        return <RestaurantDetailScreen navigation={{ navigate }} route={{ params: screenParams }} />;
      default:
        return <HomeScreen navigation={{ navigate }} />;
    }
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <NetworkProvider>
          {renderScreen()}
          <StatusBar style="auto" />
        </NetworkProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
