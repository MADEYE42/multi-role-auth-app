import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import AuthForm from '../components/AuthForm';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async ({ email, password }) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      
      if (!userDoc.exists()) {
        throw new Error("User data not found in database");
      }
      
      const userData = userDoc.data();
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Logged in successfully!'
      });

      switch (userData.role) {
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
      console.log('Login Error:', error.code || error.name, error.message);
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
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Centered Content */}
        <View style={styles.contentContainer}>
          {/* App Logo/Title */}
          <View style={styles.logoContainer}>
            <Ionicons name="medkit" size={48} color="#E63946" />
            <Text style={styles.appTitle}>RescueLink</Text>
          </View>
          
          {/* Form Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>Access your emergency network</Text>
            
            <View style={styles.formContainer}>
              <AuthForm onSubmit={handleLogin} isRegister={false} loading={loading} />
            </View>
          </View>

          {/* Action Links */}
          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>
            
            <View style={styles.signupPrompt}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[styles.linkText, styles.signupLink]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Light background for medical clarity
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 24,
    maxWidth: 480, // Limits width on larger screens
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D3557', // Dark blue
    marginTop: 12,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D3557',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#457B9D',
    marginBottom: 24,
  },
  formContainer: {
    marginBottom: 16,
  },
  linksContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#E63946', // Emergency red
    fontSize: 14,
    fontWeight: '500',
  },
  signupPrompt: {
    flexDirection: 'row',
    marginTop: 16,
  },
  signupText: {
    color: '#457B9D',
    fontSize: 14,
  },
  signupLink: {
    fontWeight: '600',
  },
});

export default LoginScreen;