import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import AuthForm from '../components/AuthForm';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location'; // For location fetching
import { Ionicons } from '@expo/vector-icons'; // For the back arrow icon

const RegisterScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');

  // Fetch user's location on component mount
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Toast.show({
            type: 'error',
            text1: 'Permission Denied',
            text2: 'Location permission is required to fetch your address.'
          });
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setLocation(location);

        // Reverse geocode to get address
        let addressResponse = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (addressResponse.length > 0) {
          const { street, city, region, country } = addressResponse[0];
          const formattedAddress = `${street || ''}, ${city || ''}, ${region || ''}, ${country || ''}`;
          setAddress(formattedAddress);
        }
      } catch (error) {
        console.log('Location Error:', error.message);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch location. Please enter your address manually.'
        });
      }
    })();
  }, []);

  // Basic input sanitization
  const sanitizeInput = (input) => {
    return input.replace(/[<>{}]/g, ''); // Remove potentially dangerous characters
  };

  // Password strength validation
  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    return passwordRegex.test(password);
  };

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async ({ email, password, role, name, phone, address: formAddress, aadhaar, license }) => {
    setLoading(true);
    try {
      // Input validation
      if (!validateEmail(email)) {
        throw new Error('Please enter a valid email address.');
      }

      if (!validatePassword(password)) {
        throw new Error(
          'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).'
        );
      }

      if (!name || name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters long.');
      }

      if (!phone || !/^\d{10}$/.test(phone)) {
        throw new Error('Phone number must be a valid 10-digit number.');
      }

      if (role === 'user' || role === 'mechanic') {
        if (!aadhaar || !/^\d{12}$/.test(aadhaar)) {
          throw new Error('Aadhaar number must be a valid 12-digit number.');
        }
      }

      if (role === 'hospital' && (!license || license.trim().length < 5)) {
        throw new Error('License number must be at least 5 characters long.');
      }

      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email);
      const sanitizedName = sanitizeInput(name);
      const sanitizedPhone = sanitizeInput(phone);
      const sanitizedAddress = sanitizeInput(formAddress || address);
      const sanitizedAadhaar = aadhaar ? sanitizeInput(aadhaar) : '';
      const sanitizedLicense = license ? sanitizeInput(license) : '';

      const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
      const user = userCredential.user;

      // Extract city from address (assuming last part is city)
      const city = sanitizedAddress.split(',').pop().trim();

      await setDoc(doc(db, "users", user.uid), {
        email: sanitizedEmail,
        role,
        name: sanitizedName,
        phone: sanitizedPhone,
        address: sanitizedAddress,
        city, // Add city field
        ...(role === 'user' || role === 'mechanic' ? { aadhaar: sanitizedAadhaar } : {}),
        ...(role === 'hospital' ? { license: sanitizedLicense, availableBeds: 0, availableAmbulances: 0 } : {})
      });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Registered successfully!'
      });

      switch (role) {
        case 'user':
          navigation.replace('UserDashboard');
          break;
        case 'hospital':
          navigation.replace('HospitalDashboard');
          break;
        case 'mechanic':
          navigation.replace('MechanicDashboard');
          break;
        default:
          throw new Error("Invalid role");
      }
    } catch (error) {
      console.log('Register Error:', error.code || error.name, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header with Back Arrow */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Create.</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <AuthForm
            onSubmit={handleRegister}
            isRegister={true}
            loading={loading}
            initialAddress={address} // Pass the fetched address to AuthForm
          />
        </View>

        {/* Sign In Link */}
        <TouchableOpacity style={styles.signInLinkContainer} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.signInLinkText}>
            Already have an account? <Text style={styles.signInLinkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C2526', // Dark background as in the image
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
    marginLeft: 10,
  },
  formContainer: {
    marginBottom: 20,
  },
  signInLinkContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  signInLinkText: {
    fontSize: 16,
    color: '#FFFFFF', // White text
  },
  signInLinkBold: {
    fontWeight: 'bold',
    color: '#FFFFFF', // White text with bold
    textDecorationLine: 'underline',
  },
});

export default RegisterScreen;