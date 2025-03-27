import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import AuthForm from '../components/AuthForm';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons'; // For the back arrow icon

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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header with Back Arrow */}
        <View style={styles.header}>
          <Text style={styles.title}>Sign In.</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <AuthForm onSubmit={handleLogin} isRegister={false} loading={loading} />
        </View>

        {/* Forgot Password Link */}
        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Create Account Link */}
        <TouchableOpacity style={styles.createAccountButton} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.createAccountText}>
            Don’t have an account? <Text style={styles.createAccountTextBold}>Create account</Text>
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
  forgotPassword: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    textAlign: 'right',
    marginBottom: 20,
  },
  createAccountButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  createAccountText: {
    fontSize: 16,
    color: '#FFFFFF', // White text
  },
  createAccountTextBold: {
    fontWeight: 'bold',
    color: '#FFFFFF', // White text with bold
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;