import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { businessOwnerAuthService } from '../src/services/businessOwnerAuthService';
import { useAuth } from '../components/AuthContext';

interface LoginScreenNewProps {
  navigation: any;
  onClose?: () => void;
  onSwitchToSignup?: () => void;
}

function LoginScreenNew({ navigation, onClose, onSwitchToSignup }: LoginScreenNewProps) {
  console.log('🔍 LoginScreenNew rendered');
  console.log('🔍 LoginScreenNew props:', { navigation: !!navigation, onClose: !!onClose, onSwitchToSignup: !!onSwitchToSignup });

  let themeContext;
  try {
    themeContext = useTheme();
    console.log('🔍 Theme loaded:', !!themeContext);
    console.log('🔍 Theme object:', themeContext?.theme);
  } catch (themeError) {
    console.error('❌ Theme error:', themeError);
    return null; // Return null if theme fails
  }

  const theme = themeContext?.theme || {
    background: '#FFFFFF',
    text: '#333333',
    textSecondary: '#666666',
    primary: '#007AFF',
    surface: '#F5F5F5',
    border: '#E0E0E0'
  }; // Fallback theme in case theme fails
  const { setUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = useCallback(async () => {
    console.log('🔍 handleLogin called with email:', email, 'password:', password);

    // Prevent automatic calls during render
    if (typeof email !== 'string' || typeof password !== 'string') {
      console.log('❌ Invalid call - email or password not strings');
      return;
    }

    if (!email.trim() || !password.trim()) {
      console.log('❌ Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const profile = await businessOwnerAuthService.signIn(email.trim(), password);

      setUser({
        uid: profile.uid,
        email: profile.email,
        role: profile.role,
        firstName: profile.firstName,
        lastName: profile.lastName,
      });

      console.log('✅ Login successful');
      onClose?.();

      // Navigate to appropriate dashboard based on role
      if (profile.role === 'business_owner' || profile.role === 'business') {
        navigation.navigate('BusinessDashboard');
      } else if (profile.role === 'admin') {
        navigation.navigate('AdminPanel');
      } else {
        navigation.navigate('Home');
      }
    } catch (error: any) {
      console.error('❌ Login Failed:', error.message);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, setUser, onClose, navigation]);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      console.log('❌ Please enter your email address first');
      return;
    }

    try {
      await businessOwnerAuthService.resetPassword(email.trim());
      console.log('✅ Password reset email sent');
    } catch (error: any) {
      console.error('❌ Error:', error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={[styles.closeButtonText, { color: theme.primary }]}>✕</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Business Owner Login</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Access your business dashboard
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border
              }]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, {
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  // Don't trigger login on return key
                }}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={{ color: theme.textSecondary }}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
          >
            <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, {
              backgroundColor: theme.primary,
              opacity: isLoading ? 0.6 : 1
            }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <Text style={[styles.loginButtonText, { color: theme.background }]}>
                Login
              </Text>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: theme.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={onSwitchToSignup}>
              <Text style={[styles.signupLink, { color: theme.primary }]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    minHeight: '100%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 16,
  },
  signupLink: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreenNew;
