import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import AuthForm from '../components/AuthForm';
import Toast from 'react-native-toast-message';

const RegisterScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);

  const handleRegister = async ({ email, password, role, name, phone, address, aadhaar, license }) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Extract city from address (assuming last part is city)
      const city = address.split(',').pop().trim();

      await setDoc(doc(db, "users", user.uid), {
        email,
        role,
        name,
        phone,
        address,
        city, // Add city field
        ...(role === 'user' || role === 'mechanic' ? { aadhaar } : {}),
        ...(role === 'hospital' ? { license, availableBeds: 0, availableAmbulances: 0 } : {})
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
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Sign up to get started</Text>
      <AuthForm onSubmit={handleRegister} isRegister={true} />
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Login</Text>
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

export default RegisterScreen;