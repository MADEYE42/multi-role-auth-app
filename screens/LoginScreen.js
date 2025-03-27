import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import AuthForm from '../components/AuthForm';
import Toast from 'react-native-toast-message';

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
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>
      <AuthForm onSubmit={handleLogin} isRegister={false} />
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  link: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  }
});

export default LoginScreen;