import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';

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
              text2: 'User data not found',
            });
          }
        } catch (error) {
          console.log('Fetch Error:', error.code || error.name, error.message);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: error.message,
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
        text2: 'Logged out successfully!',
      });
      navigation.replace('Login');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message,
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
        text2: 'Failed to open certificate.',
      });
    });
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#E6F0FA']} // White to light blue for a medical feel
      style={styles.gradientContainer}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.profileContainer}>
            <Ionicons name="medkit" size={40} color="#E63946" style={styles.avatar} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                Hello, {userData?.name || 'User'}
              </Text>
              <Text style={styles.subtitle}>Your Medical Dashboard</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E63946" />
            <Text style={styles.loadingText}>Fetching your data...</Text>
          </View>
        ) : (
          <>
            {/* User Data Section */}
            {userData && (
              <View style={styles.cardsContainer}>
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <Ionicons name="mail" size={24} color="#E63946" style={styles.cardIcon} />
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
                    <Ionicons name="call" size={24} color="#E63946" style={styles.cardIcon} />
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
                    <Ionicons name="location" size={24} color="#E63946" style={styles.cardIcon} />
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
                      <Ionicons name="card" size={24} color="#E63946" style={styles.cardIcon} />
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
                      <Ionicons name="medkit" size={24} color="#E63946" style={styles.cardIcon} />
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
                      <Ionicons name="document" size={24} color="#E63946" style={styles.cardIcon} />
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
              <TouchableOpacity
                style={[styles.actionButton, styles.medicalButton]}
                onPress={handleMedicalEmergency}
                activeOpacity={0.85}
              >
                <Ionicons name="alert-circle" size={28} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Medical Emergency</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.vehicleButton]}
                onPress={handleVehicleEmergency}
                activeOpacity={0.85}
              >
                <Ionicons name="car" size={28} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Vehicle Emergency</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.medicalInfoButton]}
                onPress={handleAddMedicalInfo}
                activeOpacity={0.85}
              >
                <Ionicons name="medical" size={28} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Add Medical Info</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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
    paddingTop: 40,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
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
    marginTop: 2,
  },
  logoutButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#457B9D',
    fontWeight: '500',
  },
  cardsContainer: {
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#E63946', // Medical red accent
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 15,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    color: '#E63946',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 15,
    color: '#1D3557',
    marginTop: 6,
    lineHeight: 22,
    fontWeight: '500',
  },
  linkText: {
    color: '#457B9D',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  medicalButton: {
    backgroundColor: '#E63946', // Red for urgency
  },
  vehicleButton: {
    backgroundColor: '#457B9D', // Blue for secondary action
  },
  medicalInfoButton: {
    backgroundColor: '#2A9D8F', // Teal for info
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

export default UserDashboard;