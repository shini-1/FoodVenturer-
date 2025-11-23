import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeContext';
import LoginScreenNew from './LoginScreenNew';
import RegisterScreenNew from './RegisterScreenNew';
import AdminLoginScreen from './AdminLoginScreen';

function RoleSelectionScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Long press handling for secret admin access (10 seconds)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const handleRoleSelect = (role: string) => {
    console.log('🔍 handleRoleSelect called with role:', role);
    console.log('🔍 Current state - showBusinessModal:', showBusinessModal, 'showAdminModal:', showAdminModal);

    switch (role) {
      case 'explorer':
        console.log('🔍 Navigating to Home');
        navigation.navigate('Home');
        break;
      case 'business':
        console.log('🔍 Setting showBusinessModal to true');
        setAuthMode('login');
        setShowBusinessModal(true);
        break;
      case 'admin':
        console.log('🔍 Setting showAdminModal to true');
        setShowAdminModal(true);
        break;
      default:
        break;
    }
  };

  const handleCloseModal = () => {
    setShowBusinessModal(false);
  };

  const handleLoginSuccess = () => {
    console.log('🔍 Login success callback triggered');
    handleCloseModal();
    // Navigate to business dashboard after modal closes
    setTimeout(() => {
      console.log('🔍 Navigating to BusinessDashboard from RoleSelectionScreen');
      navigation.navigate('BusinessDashboard');
    }, 300);
  };

  const handleCloseAdminModal = () => {
    setShowAdminModal(false);
  };

  const handleSwitchToRegister = () => {
    setAuthMode('register');
  };

  const handleSwitchToLogin = () => {
    setAuthMode('login');
  };

  // Handle press start for Business Owners button
  const handleBusinessPressIn = () => {
    console.log('🔒 Business button press started');
    const timer = setTimeout(() => {
      console.log('🔒 10 seconds elapsed - opening admin modal');
      setShowAdminModal(true);
      setIsLongPressing(false);
    }, 10000); // 10 seconds
    
    longPressTimer.current = timer;
    setIsLongPressing(true);
  };

  // Handle press end for Business Owners button
  const handleBusinessPressOut = () => {
    console.log('🔒 Business button press ended');
    
    // Clear the timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    // If not long pressing (timer didn't complete), open business modal
    if (isLongPressing) {
      console.log('🔒 Opening business modal (normal press)');
      setAuthMode('login');
      setShowBusinessModal(true);
    }
    
    setIsLongPressing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Modal overlays - positioned absolutely over the entire screen */}
      {(showBusinessModal || showAdminModal) && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme?.background || '#FFFFFF' }]}>
            {(() => {
              console.log('🔍 Modal rendering:', { showBusinessModal, showAdminModal, authMode });
              try {
                if (showBusinessModal) {
                  console.log('🔍 Rendering business modal with authMode:', authMode);
                  return authMode === 'login' ? (
                    <LoginScreenNew
                      navigation={navigation}
                      onClose={handleCloseModal}
                      onSwitchToSignup={handleSwitchToRegister}
                      onLoginSuccess={handleLoginSuccess}
                    />
                  ) : (
                    <RegisterScreenNew
                      navigation={navigation}
                      onClose={handleCloseModal}
                      onSwitchToLogin={handleSwitchToLogin}
                    />
                  );
                } else {
                  console.log('🔍 Rendering admin modal');
                  return (
                    <AdminLoginScreen
                      navigation={navigation}
                      onClose={handleCloseAdminModal}
                      onSwitchToSignup={() => {}}
                    />
                  );
                }
              } catch (error) {
                console.error('Modal render error:', error);
                return (
                  <View style={{ padding: 20, alignItems: 'center', backgroundColor: 'white' }}>
                    <Text style={{ color: 'red', fontSize: 16 }}>Error loading modal</Text>
                    <Text style={{ color: 'red', fontSize: 12, marginTop: 10 }}>
                      {error instanceof Error ? error.message : 'Unknown error'}
                    </Text>
                  </View>
                );
              }
            })()}
          </View>
        </View>
      )}

      {/* Normal role selection content */}
      {!showBusinessModal && !showAdminModal && (
        <>
          {/* Logo Container */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/foodventure-logo.jpg')}
              style={styles.logoImage}
              contentFit="cover"
              transition={300}
            />
          </View>

          {/* Welcome Text */}
          <Text style={styles.welcomeText}>Welcome to FoodVenture</Text>

          {/* Food Explorer Button */}
          <TouchableOpacity
            style={styles.roleButton}
            onPress={() => handleRoleSelect('explorer')}
            activeOpacity={0.8}
          >
            <Text style={styles.roleButtonText}>Food Explorer</Text>
          </TouchableOpacity>

          {/* Business Owners Button - with secret 10s long press for admin */}
          <TouchableOpacity
            style={styles.roleButton}
            onPressIn={handleBusinessPressIn}
            onPressOut={handleBusinessPressOut}
            activeOpacity={0.8}
          >
            <Text style={styles.roleButtonText}>Business Owners</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2C3E50', // Dark navy background
  },
  logoContainer: {
    width: '85%',
    height: 280,
    backgroundColor: '#E8E8E8',
    borderRadius: 25,
    marginBottom: 40,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 50,
    textAlign: 'center',
  },
  roleButton: {
    width: '85%',
    height: 65,
    backgroundColor: '#E8E8E8',
    borderRadius: 32.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  roleButtonText: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000, // Ensure it's above other content
  },
  modalContainer: {
    borderRadius: 20,
    margin: 0, // Remove margin to use full screen
    maxWidth: '100%', // Allow full width
    width: '100%',
    height: '100%', // Use full screen height
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden', // Prevent content from spilling outside rounded corners
  },
  keyboardFriendlyModal: {
    justifyContent: 'flex-start',
    paddingTop: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 50,
  },
  modalCloseButton: {
    padding: 10,
  },
  modalCloseText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  testLoginButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 10,
    minWidth: 200,
  },
  testLoginText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RoleSelectionScreen;
