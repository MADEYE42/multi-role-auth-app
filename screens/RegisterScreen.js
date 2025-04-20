import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import AuthForm from '../components/AuthForm';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

// Log auth state immediately after import
console.log('RegisterScreen: Initial auth state:', {
  apiKey: auth?.apiKey,
  authDomain: auth?.authDomain,
  appName: auth?.app?.name || 'undefined',
});

const RegisterScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    const fetchLocation = async () => {
      console.log('Fetching location...');
      try {
        setLocationLoading(true);
        setLocationError(null);

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission is required to fetch your address');
          console.log('Location permission denied');
          return;
        }

        const location = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Location request timed out')), 10000)
          )
        ]);

        console.log('Location retrieved:', location.coords);
        const addressResponse = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (addressResponse.length > 0) {
          const addr = addressResponse[0];
          const formattedAddress = [
            addr.street, 
            addr.city, 
            addr.region, 
            addr.postalCode, 
            addr.country
          ].filter(Boolean).join(', ');
          
          setAddress(formattedAddress);
          console.log('Address set:', formattedAddress);
        } else {
          setLocationError('Could not determine address from location');
          console.log('No address found from geocoding');
        }
      } catch (error) {
        console.error('Location error:', error.message);
        setLocationError(error.message || 'Failed to fetch location');
      } finally {
        setLocationLoading(false);
      }
    };

    fetchLocation();
  }, []);

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    return passwordRegex.test(password);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async (formData, retryCount = 0) => {
    if (!auth) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Firebase Authentication is not initialized.',
      });
      console.error('Registration failed: Auth object is undefined');
      return;
    }

    setLoading(true);
    console.log('Starting registration with form data:', formData);
    console.log('Auth object before registration:', {
      apiKey: auth.apiKey,
      authDomain: auth.authDomain,
      appName: auth.app?.name || 'undefined',
    });

    try {
      const { email, password, role, name, phone, address: formAddress, aadhaar, license } = formData;

      if (!validateEmail(email)) throw new Error('Please enter a valid email address');
      if (!validatePassword(password)) throw new Error(
        'Password must be 8+ chars with uppercase, lowercase, number, and special character'
      );
      if (!name || name.trim().length < 2) throw new Error('Name must be at least 2 characters');
      if (!phone || !/^\d{10}$/.test(phone)) throw new Error('Phone must be a 10-digit number');
      
      if (role === 'user' || role === 'mechanic') {
        if (!aadhaar || !/^\d{12}$/.test(aadhaar)) throw new Error('Aadhaar must be 12 digits');
      }
      
      if (role === 'hospital' && (!license || license.trim().length < 5)) {
        throw new Error('License must be at least 5 characters');
      }

      console.log('Creating Firebase user for:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Firebase user created, UID:', user.uid);

      const userData = {
        email,
        role,
        name: name.trim(),
        phone,
        address: formAddress || address,
        city: (formAddress || address).split(',').slice(-2, -1)[0]?.trim() || 'Unknown',
        createdAt: new Date().toISOString(),
        ...(role === 'user' || role === 'mechanic' ? { aadhaar } : {}),
        ...(role === 'hospital' ? { 
          license,
          availableBeds: 0,
          availableAmbulances: 0,
          verified: false 
        } : {})
      };

      console.log('Saving user data to Firestore for UID:', user.uid, userData);
      await setDoc(doc(db, "users", user.uid), userData);
      console.log('User data saved successfully');

      Toast.show({
        type: 'success',
        text1: 'Account Created',
        text2: 'Registration successful!',
        position: 'bottom'
      });

      console.log('Navigating to dashboard:', `${role.charAt(0).toUpperCase() + role.slice(1)}Dashboard`);
      navigation.replace(`${role.charAt(0).toUpperCase() + role.slice(1)}Dashboard`);
    } catch (error) {
      console.error('Registration error:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
      let errorMessage = 'An error occurred during registration';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
        case 'auth/configuration-not-found':
          errorMessage = 'Firebase Authentication configuration not found. Please check Firebase project setup.';
          if (retryCount < 1) {
            console.log('Retrying registration, attempt:', retryCount + 1);
            return handleRegister(formData, retryCount + 1);
          }
          break;
        default:
          errorMessage = error.message;
      }
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: errorMessage,
        position: 'bottom'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Ionicons name="medkit" size={32} color="#E63946" style={styles.logo} />
            <Text style={styles.title}>Create Account</Text>
          </View>
          {locationLoading && (
            <View style={styles.locationStatus}>
              <ActivityIndicator size="small" color="#457B9D" />
              <Text style={styles.locationStatusText}>Fetching location...</Text>
            </View>
          )}
          {locationError && (
            <View style={styles.locationStatus}>
              <Ionicons name="warning-outline" size={16} color="#E63946" />
              <Text style={[styles.locationStatusText, { color: '#E63946' }]}>
                {locationError}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <AuthForm
            onSubmit={handleRegister}
            isRegister={true}
            loading={loading}
            initialAddress={address}
            locationError={locationError}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D3557',
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationStatusText: {
    fontSize: 14,
    color: '#457B9D',
    marginLeft: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#457B9D',
    marginRight: 4,
  },
  footerLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E63946',
  },
});

export default RegisterScreen;