import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import LoginScreenNew from './LoginScreenNew';
import RegisterScreenNew from './RegisterScreenNew';
import AdminLoginScreen from './AdminLoginScreen';

function RoleSelectionScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

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
          <Header showDarkModeToggle={true} />
          <Text style={[styles.title, { color: theme.text }]}>Welcome to FoodVenturer</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Select your role to continue</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.primary, shadowColor: theme.primary }]}
            onPress={() => handleRoleSelect('explorer')}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>🍽️ Food Explorer</Text>
            <Text style={[styles.buttonSubtext, { color: theme.textSecondary }]}>Browse restaurants and find food</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.primary, shadowColor: theme.primary }]}
            onPress={() => handleRoleSelect('business')}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>🏪 Business Owner</Text>
            <Text style={[styles.buttonSubtext, { color: theme.textSecondary }]}>Manage your establishment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.primary, shadowColor: theme.primary }]}
            onPress={() => handleRoleSelect('admin')}
            onLongPress={() => navigation.navigate('CreateAdmin')} // Hidden admin creation for dev
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>⚙️ Admin</Text>
            <Text style={[styles.buttonSubtext, { color: theme.textSecondary }]}>Manage the platform</Text>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    padding: 20,
    marginVertical: 10,
    borderRadius: 15,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderTopWidth: 4,
    elevation: 5,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    fontSize: 14,
    marginTop: 5,
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
