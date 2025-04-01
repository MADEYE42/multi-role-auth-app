import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase/firebaseConfig'; // Assuming Firebase setup
import { doc, updateDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';

const TermsAndConditionsScreen = ({ navigation, route }) => {
  const { role } = route.params; // Role passed as 'user', 'mechanic', or 'hospital'
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userDocRef, {
          termsAccepted: true,
          termsAcceptedAt: new Date().toISOString(),
        });
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Terms and Conditions accepted!',
        });
        // Navigate to appropriate dashboard based on role
        switch (role) {
          case 'user':
            navigation.replace('UserDashboard'); // Replace with your user dashboard screen
            break;
          case 'mechanic':
            navigation.replace('MechanicDashboard');
            break;
          case 'hospital':
            navigation.replace('HospitalDashboard');
            break;
          default:
            navigation.replace('Login');
        }
      } else {
        throw new Error('No authenticated user found.');
      }
    } catch (error) {
      console.log('Accept Terms Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to accept terms. Please try again.',
      });
    } finally {
      setAccepting(false);
    }
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#E6F0FA']} style={styles.gradientContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Terms and Conditions</Text>
        <Text style={styles.subtitle}>
          Please read and accept the terms below to proceed as a {role}.
        </Text>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
        <View style={styles.termsCard}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.termsText}>
            Welcome to [Your App Name]. By using this application, you agree to comply with and be bound by the following terms and conditions. These terms apply to all users, including individuals requesting services ("Users"), mechanics providing vehicle emergency services ("Mechanics"), and hospitals offering medical emergency services ("Hospitals").
          </Text>

          <Text style={styles.sectionTitle}>2. General Terms</Text>
          <Text style={styles.termsText}>
            - You must be at least 18 years old to use this app.{'\n'}
            - You agree to provide accurate and up-to-date information.{'\n'}
            - [Your App Name] is not liable for delays or failures in service delivery caused by factors beyond our control.{'\n'}
            - You may not use this app for illegal purposes or in a way that harms others.
          </Text>

          {role === 'user' && (
            <>
              <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
              <Text style={styles.termsText}>
                - You agree to submit truthful emergency requests, including accurate location and medical/vehicle details.{'\n'}
                - You are responsible for ensuring your contact information is correct for communication with service providers.{'\n'}
                - You acknowledge that response times may vary based on availability of mechanics or hospitals.
              </Text>
            </>
          )}

          {role === 'mechanic' && (
            <>
              <Text style={styles.sectionTitle}>3. Mechanic Responsibilities</Text>
              <Text style={styles.termsText}>
                - You agree to maintain accurate records of available mechanics and tow trucks.{'\n'}
                - You will respond to accepted emergencies in a timely and professional manner.{'\n'}
                - You must possess valid certifications and licenses to provide vehicle repair services.{'\n'}
                - You agree not to misuse user data provided through the app.
              </Text>
            </>
          )}

          {role === 'hospital' && (
            <>
              <Text style={styles.sectionTitle}>3. Hospital Responsibilities</Text>
              <Text style={styles.termsText}>
                - You agree to maintain accurate records of available beds and ambulances.{'\n'}
                - You will respond to accepted emergencies promptly and provide appropriate medical care.{'\n'}
                - You must comply with all applicable healthcare regulations and standards.{'\n'}
                - You agree to safeguard patient data in accordance with privacy laws (e.g., HIPAA).
              </Text>
            </>
          )}

          <Text style={styles.sectionTitle}>4. Privacy</Text>
          <Text style={styles.termsText}>
            - Your personal information will be collected and processed as outlined in our Privacy Policy.{'\n'}
            - We may share your data with service providers (mechanics/hospitals) to fulfill your requests.{'\n'}
            - You consent to the use of location data to facilitate emergency services.
          </Text>

          <Text style={styles.sectionTitle}>5. Limitation of Liability</Text>
          <Text style={styles.termsText}>
            - [Your App Name] is a platform connecting users with service providers and is not responsible for the quality or outcome of services provided.{'\n'}
            - We are not liable for damages, injuries, or losses resulting from the use of this app.{'\n'}
            - Service providers (mechanics/hospitals) are independent entities, not employees of [Your App Name].
          </Text>

          <Text style={styles.sectionTitle}>6. Termination</Text>
          <Text style={styles.termsText}>
            - We reserve the right to terminate your access to the app for violating these terms.{'\n'}
            - You may stop using the app at any time by uninstalling it or signing out.
          </Text>

          <Text style={styles.sectionTitle}>7. Changes to Terms</Text>
          <Text style={styles.termsText}>
            - We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the new terms.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.acceptButton, accepting && styles.disabledButton]}
          onPress={handleAccept}
          disabled={accepting}
        >
          {accepting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.acceptButtonText}>I ACCEPT</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1D3557',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#457B9D',
    fontWeight: '500',
    marginTop: 5,
    textAlign: 'center',
  },
  termsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D3557',
    marginBottom: 10,
  },
  termsText: {
    fontSize: 16,
    color: '#1D3557',
    fontWeight: '400',
    lineHeight: 22,
    marginBottom: 15,
  },
  acceptButton: {
    backgroundColor: '#2A9D8F', // Teal for acceptance
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2A9D8F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#A3BFFA',
    shadowOpacity: 0,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

export default TermsAndConditionsScreen;