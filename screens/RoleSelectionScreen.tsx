import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import LoginScreenNew from './LoginScreenNew';
import AdminLoginScreen from './AdminLoginScreen';

function RoleSelectionScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleRoleSelect = (role: string) => {
    console.log('🔍 handleRoleSelect called with role:', role);
    switch (role) {
      case 'explorer':
        console.log('🔍 Navigating to Home');
        navigation.navigate('Home');
        break;
      case 'business':
        console.log('🔍 Opening business modal');
        setAuthMode('login');
        setShowBusinessModal(true);
        break;
      case 'admin':
        console.log('🔍 Opening admin modal');
        setShowAdminModal(true);
        break;
      default:
        break;
    }
  };

  const handleCloseModal = () => {
    setShowBusinessModal(false);
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
      {showBusinessModal ? (
        // Show business modal content
        <View style={styles.modalContainer}>
          <LoginScreenNew
            navigation={navigation}
            onClose={handleCloseModal}
            onSwitchToSignup={handleSwitchToRegister}
          />
        </View>
      ) : showAdminModal ? (
        // Show admin modal content
        <View style={styles.modalContainer}>
          <AdminLoginScreen
            navigation={navigation}
            onClose={handleCloseAdminModal}
            onSwitchToSignup={() => {}}
          />
        </View>
      ) : (
        // Show normal role selection content
        <>
          <Header />
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
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
