import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

const HospitalDashboard = ({ navigation }) => {
  const [pendingEmergencies, setPendingEmergencies] = useState([]);
  const [acceptedEmergencies, setAcceptedEmergencies] = useState([]);
  const [hospitalData, setHospitalData] = useState(null); // Store hospital data (beds, ambulances)
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) {
      console.log('No authenticated user');
      navigation.replace('Login');
      return;
    }

    // Fetch hospital data (beds, ambulances)
    const fetchHospitalData = async () => {
      try {
        const hospitalDocRef = doc(db, 'users', auth.currentUser.uid);
        const hospitalDoc = await getDoc(hospitalDocRef);
        if (hospitalDoc.exists()) {
          setHospitalData(hospitalDoc.data());
          console.log('Hospital Data:', hospitalDoc.data()); // Debug log
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Hospital data not found.'
          });
        }
      } catch (error) {
        console.log('Hospital Fetch Error:', error.code, error.message);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch hospital data.'
        });
      }
    };

    fetchHospitalData();

    // Fetch pending emergencies
    const pendingQuery = query(
      collection(db, 'MedicalEmergency'),
      where('status', '==', 'pending'),
      where('hospitalId', '==', null)
    );

    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      const emergencies = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));
      console.log('Pending Emergencies:', emergencies); // Debug log
      setPendingEmergencies(emergencies);
      setLoading(false);
    }, (error) => {
      console.log('Snapshot Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
      setLoading(false);
    });

    // Fetch accepted emergencies for this hospital
    const acceptedQuery = query(
      collection(db, 'MedicalEmergency'),
      where('hospitalId', '==', auth.currentUser.uid),
      where('status', '==', 'accepted')
    );

    const unsubscribeAccepted = onSnapshot(acceptedQuery, (snapshot) => {
      const emergencies = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));
      console.log('Accepted Emergencies:', emergencies); // Debug log
      setAcceptedEmergencies(emergencies);
    }, (error) => {
      console.log('Snapshot Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    });

    // Listen for changes to hospital data in real-time
    const hospitalDocRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribeHospital = onSnapshot(hospitalDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setHospitalData(docSnapshot.data());
        console.log('Updated Hospital Data:', docSnapshot.data()); // Debug log
      }
    }, (error) => {
      console.log('Hospital Snapshot Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update hospital data.'
      });
    });

    return () => {
      unsubscribePending();
      unsubscribeAccepted();
      unsubscribeHospital();
    };
  }, []);

  // Update the number of beds or ambulances in Firestore
  const updateHospitalResources = async (newBeds, newAmbulances) => {
    try {
      const hospitalDocRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(hospitalDocRef, {
        availableBeds: newBeds,
        availableAmbulances: newAmbulances,
        updatedAt: new Date().toISOString(),
      });
      console.log('Updated Resources - Beds:', newBeds, 'Ambulances:', newAmbulances); // Debug log
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Resources updated successfully!'
      });
    } catch (error) {
      console.log('Resource Update Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update resources.'
      });
    }
  };

  // Add beds
  const handleAddBeds = () => {
    const newBeds = (hospitalData.availableBeds || 0) + 1;
    updateHospitalResources(newBeds, hospitalData.availableAmbulances || 0);
  };

  // Subtract beds
  const handleSubtractBeds = () => {
    const currentBeds = hospitalData.availableBeds || 0;
    if (currentBeds <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No beds available to subtract.'
      });
      return;
    }
    const newBeds = currentBeds - 1;
    updateHospitalResources(newBeds, hospitalData.availableAmbulances || 0);
  };

  // Add ambulances
  const handleAddAmbulances = () => {
    const newAmbulances = (hospitalData.availableAmbulances || 0) + 1;
    updateHospitalResources(hospitalData.availableBeds || 0, newAmbulances);
  };

  // Subtract ambulances
  const handleSubtractAmbulances = () => {
    const currentAmbulances = hospitalData.availableAmbulances || 0;
    if (currentAmbulances <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No ambulances available to subtract.'
      });
      return;
    }
    const newAmbulances = currentAmbulances - 1;
    updateHospitalResources(hospitalData.availableBeds || 0, newAmbulances);
  };

  const handleAcceptEmergency = async (emergencyId) => {
    setAccepting(emergencyId);
    try {
      // Check if there are enough beds and ambulances
      const currentBeds = hospitalData.availableBeds || 0;
      const currentAmbulances = hospitalData.availableAmbulances || 0;

      if (currentBeds <= 0 || currentAmbulances <= 0) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Not enough resources (beds or ambulances) to accept this emergency.'
        });
        setAccepting(null);
        return;
      }

      // Update the emergency status
      const emergencyRef = doc(db, 'MedicalEmergency', emergencyId);
      await updateDoc(emergencyRef, {
        hospitalId: auth.currentUser.uid,
        status: 'accepted'
      });

      // Decrease beds and ambulances by 1
      const newBeds = currentBeds - 1;
      const newAmbulances = currentAmbulances - 1;
      await updateHospitalResources(newBeds, newAmbulances);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Emergency accepted successfully!'
      });
    } catch (error) {
      console.log('Accept Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    } finally {
      setAccepting(null);
    }
  };

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
      console.log('Logout Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    }
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
        <Text style={styles.title}>Hospital Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Manage Medical Emergencies</Text>

      {/* Hospital Resources Section */}
      {hospitalData ? (
        <View style={styles.resourcesContainer}>
          <Text style={styles.sectionTitle}>Hospital Resources</Text>
          <View style={styles.resourceRow}>
            <Ionicons name="bed-outline" size={20} color="#666" style={styles.icon} />
            <Text style={styles.resourceText}>Available Beds: {hospitalData.availableBeds || 0}</Text>
            <View style={styles.resourceButtons}>
              <TouchableOpacity style={styles.resourceButton} onPress={handleAddBeds}>
                <Ionicons name="add-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.resourceButton} onPress={handleSubtractBeds}>
                <Ionicons name="remove-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.resourceRow}>
            <Ionicons name="car-outline" size={20} color="#666" style={styles.icon} />
            <Text style={styles.resourceText}>Available Ambulances: {hospitalData.availableAmbulances || 0}</Text>
            <View style={styles.resourceButtons}>
              <TouchableOpacity style={styles.resourceButton} onPress={handleAddAmbulances}>
                <Ionicons name="add-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.resourceButton} onPress={handleSubtractAmbulances}>
                <Ionicons name="remove-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Loading hospital resources...</Text>
        </View>
      )}

      {/* Loading State for Emergencies */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Loading emergencies...</Text>
        </View>
      ) : (
        <>
          {/* Pending Emergencies Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Pending Emergencies</Text>
            {pendingEmergencies.length === 0 ? (
              <Text style={styles.noDataText}>No pending emergencies available.</Text>
            ) : (
              pendingEmergencies.map((emergency) => (
                <View key={emergency.id} style={styles.emergencyCard}>
                  <View style={styles.emergencyRow}>
                    <Ionicons name="medkit-outline" size={20} color="#666" style={styles.icon} />
                    <Text style={styles.emergencyText}>Type: {emergency.type}</Text>
                  </View>
                  <View style={styles.emergencyRow}>
                    <Ionicons name="location-outline" size={20} color="#666" style={styles.icon} />
                    <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                      Location: {emergency.location}
                    </Text>
                  </View>
                  <View style={styles.emergencyRow}>
                    <Ionicons name="person-outline" size={20} color="#666" style={styles.icon} />
                    <Text style={styles.emergencyText}>User: {emergency.userName}</Text>
                  </View>
                  {emergency.medicalConditions ? (
                    <View style={styles.emergencyRow}>
                      <Ionicons name="medkit-outline" size={20} color="#666" style={styles.icon} />
                      <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                        Medical Conditions: {emergency.medicalConditions}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.emergencyRow}>
                      <Ionicons name="medkit-outline" size={20} color="#666" style={styles.icon} />
                      <Text style={styles.emergencyText}>Medical Conditions: Not provided</Text>
                    </View>
                  )}
                  {emergency.medicalCertificate ? (
                    <TouchableOpacity onPress={() => openCertificate(emergency.medicalCertificate)}>
                      <View style={styles.emergencyRow}>
                        <Ionicons name="document-outline" size={20} color="#666" style={styles.icon} />
                        <Text style={[styles.emergencyText, styles.linkText]}>View Medical Certificate</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.emergencyRow}>
                      <Ionicons name="document-outline" size={20} color="#666" style={styles.icon} />
                      <Text style={styles.emergencyText}>Medical Certificate: Not provided</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, accepting === emergency.id && styles.disabledButton]}
                    onPress={() => handleAcceptEmergency(emergency.id)}
                    disabled={accepting === emergency.id}
                  >
                    {accepting === emergency.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.actionButtonText}>Accept Emergency</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Accepted Emergencies Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Accepted Emergencies</Text>
            {acceptedEmergencies.length === 0 ? (
              <Text style={styles.noDataText}>No accepted emergencies.</Text>
            ) : (
              acceptedEmergencies.map((emergency) => (
                <View key={emergency.id} style={styles.emergencyCard}>
                  <View style={styles.emergencyRow}>
                    <Ionicons name="medkit-outline" size={20} color="#666" style={styles.icon} />
                    <Text style={styles.emergencyText}>Type: {emergency.type}</Text>
                  </View>
                  <View style={styles.emergencyRow}>
                    <Ionicons name="location-outline" size={20} color="#666" style={styles.icon} />
                    <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                      Location: {emergency.location}
                    </Text>
                  </View>
                  <View style={styles.emergencyRow}>
                    <Ionicons name="person-outline" size={20} color="#666" style={styles.icon} />
                    <Text style={styles.emergencyText}>User: {emergency.userName || 'Unknown'}</Text>
                  </View>
                  <View style={styles.emergencyRow}>
                    <Ionicons name="call-outline" size={20} color="#666" style={styles.icon} />
                    <Text style={styles.emergencyText}>Contact: {emergency.userPhone || 'Not available'}</Text>
                  </View>
                  {emergency.medicalConditions ? (
                    <View style={styles.emergencyRow}>
                      <Ionicons name="medkit-outline" size={20} color="#666" style={styles.icon} />
                      <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                        Medical Conditions: {emergency.medicalConditions}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.emergencyRow}>
                      <Ionicons name="medkit-outline" size={20} color="#666" style={styles.icon} />
                      <Text style={styles.emergencyText}>Medical Conditions: Not provided</Text>
                    </View>
                  )}
                  {emergency.medicalCertificate ? (
                    <TouchableOpacity onPress={() => openCertificate(emergency.medicalCertificate)}>
                      <View style={styles.emergencyRow}>
                        <Ionicons name="document-outline" size={20} color="#666" style={styles.icon} />
                        <Text style={[styles.emergencyText, styles.linkText]}>View Medical Certificate</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.emergencyRow}>
                      <Ionicons name="document-outline" size={20} color="#666" style={styles.icon} />
                      <Text style={styles.emergencyText}>Medical Certificate: Not provided</Text>
                    </View>
                  )}
                </View>
              ))
            )}
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
    marginBottom: 20,
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
  resourcesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resourceText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  resourceButtons: {
    flexDirection: 'row',
  },
  resourceButton: {
    backgroundColor: '#FFBB33', // Yellow button
    padding: 5,
    borderRadius: 5,
    marginLeft: 5,
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
  sectionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 15,
  },
  emergencyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    marginRight: 10,
  },
  emergencyText: {
    fontSize: 16,
    color: '#000000',
  },
  linkText: {
    color: '#00CC00', // Green for clickable link
    textDecorationLine: 'underline',
  },
  actionButton: {
    backgroundColor: '#FF4444', // Red button
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#FF9999', // Lighter red when disabled
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default HospitalDashboard;