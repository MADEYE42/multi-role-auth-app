import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons'; // For icons
import Toast from 'react-native-toast-message';

const UserDashboard = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'User data not found'
            });
          }
        } catch (error) {
          console.log('Fetch Error:', error.code || error.name, error.message);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: error.message
          });
        }
      } else {
        console.log('No authenticated user');
      }
      setLoading(false);
    };
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Logged out successfully!'
      });
      navigation.replace('Login');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    }
  };

  const handleMedicalEmergency = () => {
    navigation.navigate('MedicalEmergency');
  };

  const handleVehicleEmergency = () => {
    navigation.navigate('VehicleBreakdown');
  };

  const handleAddMedicalInfo = () => {
    navigation.navigate('AddMedicalInfo');
  };

  const openCertificate = (url) => {
    Linking.openURL(url).catch((err) => {
      console.log('Error opening URL:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to open certificate.'
      });
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Welcome, {userData?.name || 'User'}</Text>
          <Text style={styles.subtitle}>Your Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Loading your data...</Text>
        </View>
      ) : (
        <>
          {/* User Data Section */}
          {userData && (
            <View style={styles.cardsContainer}>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Ionicons name="mail-outline" size={24} color="#666" style={styles.cardIcon} />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Email</Text>
                    <Text style={styles.cardValue} numberOfLines={2} ellipsizeMode="tail">
                      {userData.email}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Ionicons name="call-outline" size={24} color="#666" style={styles.cardIcon} />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Phone</Text>
                    <Text style={styles.cardValue} numberOfLines={1} ellipsizeMode="tail">
                      {userData.phone}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Ionicons name="location-outline" size={24} color="#666" style={styles.cardIcon} />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Address</Text>
                    <Text style={styles.cardValue} numberOfLines={3} ellipsizeMode="tail">
                      {userData.address}
                    </Text>
                  </View>
                </View>
              </View>

              {userData.aadhaar && (
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <Ionicons name="card-outline" size={24} color="#666" style={styles.cardIcon} />
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>Aadhaar</Text>
                      <Text style={styles.cardValue} numberOfLines={1} ellipsizeMode="tail">
                        {userData.aadhaar}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {userData.medicalConditions && (
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <Ionicons name="medkit-outline" size={24} color="#666" style={styles.cardIcon} />
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>Medical Conditions</Text>
                      <Text style={styles.cardValue} numberOfLines={3} ellipsizeMode="tail">
                        {userData.medicalConditions}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {userData.medicalCertificate && (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => openCertificate(userData.medicalCertificate)}
                >
                  <View style={styles.cardRow}>
                    <Ionicons name="document-outline" size={24} color="#666" style={styles.cardIcon} />
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>Medical Certificate</Text>
                      <Text style={[styles.cardValue, styles.linkText]} numberOfLines={1} ellipsizeMode="tail">
                        View Certificate
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.actionButton, styles.medicalButton]} onPress={handleMedicalEmergency}>
              <Ionicons name="medkit-outline" size={24} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Medical Emergency</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.vehicleButton]} onPress={handleVehicleEmergency}>
              <Ionicons name="car-outline" size={24} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Vehicle Emergency</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.medicalInfoButton]} onPress={handleAddMedicalInfo}>
              <Ionicons name="document-text-outline" size={24} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Add Medical Information</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5E6CC', // Beige background
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000', // Black text
  },
  subtitle: {
    fontSize: 16,
    color: '#FFBB33', // Medium yellow
    marginTop: 5,
  },
  logoutButton: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  cardsContainer: {
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF', // White card background
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 15,
  },
  cardContent: {
    flex: 1, // Allow content to take remaining space and wrap
  },
  cardTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 16,
    color: '#000000',
    marginTop: 5,
    lineHeight: 20, // Improve readability
  },
  linkText: {
    color: '#00CC00', // Green for clickable link
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicalButton: {
    backgroundColor: '#FF4444', // Red for medical emergency
  },
  vehicleButton: {
    backgroundColor: '#FFBB33', // Yellow for vehicle emergency
  },
  medicalInfoButton: {
    backgroundColor: '#00CC00', // Green for medical info
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default UserDashboard;