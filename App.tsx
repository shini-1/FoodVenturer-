import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './theme/ThemeContext';
import { AuthProvider } from './components/AuthContext';
import { initializeFirebase, getAuthInstance } from './services/firebase';
import RoleSelectionScreen from './screens/RoleSelectionScreen';
import HomeScreen from './screens/HomeScreen';
import BusinessPanelScreen from './screens/BusinessPanelScreen';
import AdminPanelScreen from './screens/AdminPanelScreen';

type Screen = 'RoleSelection' | 'Home' | 'BusinessPanel' | 'AdminPanel';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('RoleSelection');

  useEffect(() => {
    initializeFirebase();
    // Also initialize auth explicitly
    try {
      getAuthInstance();
      console.log('✅ Firebase Auth initialized on app startup');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Auth on startup:', error);
    }
  }, []);

  const navigate = (screen: Screen) => {
    setCurrentScreen(screen);
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
      default:
        return <HomeScreen navigation={{ navigate }} />;
    }
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        {renderScreen()}
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}
