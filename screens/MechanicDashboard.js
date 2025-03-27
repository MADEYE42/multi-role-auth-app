import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, runTransaction, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

const MechanicDashboard = ({ navigation }) => {
  const [mechanicData, setMechanicData] = useState(null); // Store mechanic data (resources)
  const [pendingEmergencies, setPendingEmergencies] = useState([]);
  const [acceptedEmergencies, setAcceptedEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) {
      console.log('No authenticated user');
      navigation.replace('Login');
      return;
    }

    // Fetch mechanic data (resources)
    const fetchMechanicData = async () => {
      try {
        const mechanicDocRef = doc(db, 'users', auth.currentUser.uid);
        const mechanicDoc = await getDoc(mechanicDocRef);
        if (mechanicDoc.exists()) {
          setMechanicData(mechanicDoc.data());
          console.log('Mechanic Data:', mechanicDoc.data()); // Debug log
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Mechanic data not found.'
          });
        }
      } catch (error) {
        console.log('Mechanic Fetch Error:', error.code, error.message);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch mechanic data.'
        });
      }
    };

    fetchMechanicData();

    // Fetch pending vehicle emergencies
    const pendingQuery = query(
      collection(db, 'VehicleEmergency'),
      where('status', '==', 'pending'),
      where('mechanicId', '==', null)
    );

    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      const emergencies = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));
      console.log('Pending Vehicle Emergencies:', emergencies); // Debug log
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

    // Fetch accepted emergencies for this mechanic
    const acceptedQuery = query(
      collection(db, 'VehicleEmergency'),
      where('mechanicId', '==', auth.currentUser.uid),
      where('status', '==', 'accepted')
    );

    const unsubscribeAccepted = onSnapshot(acceptedQuery, (snapshot) => {
      const emergencies = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }));
      console.log('Accepted Vehicle Emergencies:', emergencies); // Debug log
      setAcceptedEmergencies(emergencies);
    }, (error) => {
      console.log('Snapshot Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    });

    // Listen for changes to mechanic data in real-time
    const mechanicDocRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribeMechanic = onSnapshot(mechanicDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setMechanicData(docSnapshot.data());
        console.log('Updated Mechanic Data:', docSnapshot.data()); // Debug log
      }
    }, (error) => {
      console.log('Mechanic Snapshot Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update mechanic data.'
      });
    });

    return () => {
      unsubscribePending();
      unsubscribeAccepted();
      unsubscribeMechanic();
    };
  }, []);

  const handleAcceptEmergency = async (emergencyId) => {
    setProcessing(emergencyId);
    try {
      const mechanicId = auth.currentUser.uid;
      const emergencyRef = doc(db, 'VehicleEmergency', emergencyId);
      const mechanicRef = doc(db, 'users', mechanicId);

      await runTransaction(db, async (transaction) => {
        const mechanicDoc = await transaction.get(mechanicRef);
        const emergencyDoc = await transaction.get(emergencyRef);

        if (!mechanicDoc.exists() || !emergencyDoc.exists()) {
          throw new Error('Document does not exist');
        }

        const currentMechanics = mechanicDoc.data().availableMechanics || 0;
        const currentTowTrucks = mechanicDoc.data().availableTowTrucks || 0;

        if (currentMechanics <= 0 || currentTowTrucks <= 0) {
          throw new Error('Not enough resources (mechanics or tow trucks) to accept this emergency.');
        }

        const newMechanics = currentMechanics - 1;
        const newTowTrucks = currentTowTrucks - 1;

        transaction.update(mechanicRef, {
          availableMechanics: newMechanics,
          availableTowTrucks: newTowTrucks,
          updatedAt: new Date().toISOString(),
        });
        transaction.update(emergencyRef, {
          mechanicId: mechanicId,
          status: 'accepted'
        });
      });

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
      setProcessing(null);
    }
  };

  const handleDeclineEmergency = async (emergencyId) => {
    setProcessing(emergencyId);
    try {
      const emergencyRef = doc(db, 'VehicleEmergency', emergencyId);
      await updateDoc(emergencyRef, {
        status: 'declined'
      });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Emergency declined.'
      });
    } catch (error) {
      console.log('Decline Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleAddMechanic = async () => {
    try {
      const mechanicDocRef = doc(db, 'users', auth.currentUser.uid);
      const newMechanics = (mechanicData.availableMechanics || 0) + 1;
      await updateDoc(mechanicDocRef, {
        availableMechanics: newMechanics,
        updatedAt: new Date().toISOString(),
      });
      console.log('Added Mechanic - New Count:', newMechanics); // Debug log
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Mechanic added successfully!'
      });
    } catch (error) {
      console.log('Add Mechanic Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add mechanic.'
      });
    }
  };

  const handleSubtractMechanic = async () => {
    const currentMechanics = mechanicData.availableMechanics || 0;
    if (currentMechanics <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No mechanics available to subtract.'
      });
      return;
    }
    try {
      const mechanicDocRef = doc(db, 'users', auth.currentUser.uid);
      const newMechanics = currentMechanics - 1;
      await updateDoc(mechanicDocRef, {
        availableMechanics: newMechanics,
        updatedAt: new Date().toISOString(),
      });
      console.log('Subtracted Mechanic - New Count:', newMechanics); // Debug log
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Mechanic removed successfully!'
      });
    } catch (error) {
      console.log('Subtract Mechanic Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove mechanic.'
      });
    }
  };

  const handleAddTowTruck = async () => {
    try {
      const mechanicDocRef = doc(db, 'users', auth.currentUser.uid);
      const newTowTrucks = (mechanicData.availableTowTrucks || 0) + 1;
      await updateDoc(mechanicDocRef, {
        availableTowTrucks: newTowTrucks,
        updatedAt: new Date().toISOString(),
      });
      console.log('Added Tow Truck - New Count:', newTowTrucks); // Debug log
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Tow truck added successfully!'
      });
    } catch (error) {
      console.log('Add Tow Truck Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add tow truck.'
      });
    }
  };

  const handleSubtractTowTruck = async () => {
    const currentTowTrucks = mechanicData.availableTowTrucks || 0;
    if (currentTowTrucks <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No tow trucks available to subtract.'
      });
      return;
    }
    try {
      const mechanicDocRef = doc(db, 'users', auth.currentUser.uid);
      const newTowTrucks = currentTowTrucks - 1;
      await updateDoc(mechanicDocRef, {
        availableTowTrucks: newTowTrucks,
        updatedAt: new Date().toISOString(),
      });
      console.log('Subtracted Tow Truck - New Count:', newTowTrucks); // Debug log
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Tow truck removed successfully!'
      });
    } catch (error) {
      console.log('Subtract Tow Truck Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove tow truck.'
      });
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

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Mechanic Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Welcome, {mechanicData?.name || 'Mechanic'}</Text>

      {/* Mechanic Resources Section */}
      {mechanicData ? (
        <View style={styles.resourcesContainer}>
          <Text style={styles.sectionTitle}>Mechanic Resources</Text>
          <View style={styles.resourceRow}>
            <Ionicons name="construct-outline" size={20} color="#666" style={styles.icon} />
            <Text style={styles.resourceText}>Available Mechanics: {mechanicData.availableMechanics || 0}</Text>
            <View style={styles.resourceButtons}>
              <TouchableOpacity style={styles.resourceButton} onPress={handleAddMechanic}>
                <Ionicons name="add-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.resourceButton} onPress={handleSubtractMechanic}>
                <Ionicons name="remove-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.resourceRow}>
            <Ionicons name="car-outline" size={20} color="#666" style={styles.icon} />
            <Text style={styles.resourceText}>Available Tow Trucks: {mechanicData.availableTowTrucks || 0}</Text>
            <View style={styles.resourceButtons}>
              <TouchableOpacity style={styles.resourceButton} onPress={handleAddTowTruck}>
                <Ionicons name="add-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.resourceButton} onPress={handleSubtractTowTruck}>
                <Ionicons name="remove-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4444" />
          <Text style={styles.loadingText}>Loading mechanic resources...</Text>
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
            <Text style={styles.sectionTitle}>Pending Vehicle Emergencies</Text>
            {pendingEmergencies.length === 0 ? (
              <Text style={styles.noDataText}>No pending emergencies available.</Text>
            ) : (
              pendingEmergencies.map((emergency) => (
                <View key={emergency.id} style={styles.emergencyCard}>
                  <View style={styles.emergencyRow}>
                    <Ionicons name="car-outline" size={20} color="#666" style={styles.icon} />
                    <Text style={styles.emergencyText}>Type: {emergency.type}</Text>
                  </View>
                  <View style={styles.emergencyRow}>
                    <Ionicons name="car-sport-outline" size={20} color="#666" style={styles.icon} />
                    <Text style={styles.emergencyText}>Vehicle Type: {emergency.vehicleType}</Text>
                  </View>
                  <View style={styles.emergencyRow}>
                    <Ionicons name="warning-outline" size={20} color="#666" style={styles.icon} />
                    <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                      Description: {emergency.description}
                    </Text>
                  </View>
                  {emergency.notes && (
                    <View style={styles.emergencyRow}>
                      <Ionicons name="document-text-outline" size={20} color="#666" style={styles.icon} />
                      <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                        Notes: {emergency.notes}
                      </Text>
                    </View>
                  )}
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
                  <View style={styles.emergencyRow}>
                    <Ionicons name="time-outline" size={20} color="#666" style={styles.icon} />
                    <Text style={styles.emergencyText}>Time: {new Date(emergency.timestamp).toLocaleString()}</Text>
                  </View>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton, processing === emergency.id && styles.disabledButton]}
                      onPress={() => handleAcceptEmergency(emergency.id)}
                      disabled={processing === emergency.id}
                    >
                      {processing === emergency.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.actionButtonText}>Accept</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton, processing === emergency.id && styles.disabledButton]}
                      onPress={() => handleDeclineEmergency(emergency.id)}
                      disabled={processing === emergency.id}
                    >
                      {processing === emergency.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.actionButtonText}>Decline</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Accepted Emergencies Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Accepted Vehicle Emergencies</Text>
            {acceptedEmergencies.length === 0 ? (
              <Text style={styles.noDataText}>No accepted emergencies.</Text>
            ) : (
              acceptedEmergencies.map((emergency) => (
                <View key={emergency.id} style={styles.emergencyCard}>
                  <View style={styles.emergencyRow}>
                    <Ionicons name="car-outline" size={20} color="#666" style={styles.icon} />
                    <Text style={styles.emergencyText}>Type: {emergency.type}</Text>
                  </View>
                  <View style={styles.emergencyRow}>
                    <Ionicons name="car-sport-outline" size={20} color="#666" style={styles.icon} />
                    <Text style={styles.emergencyText}>Vehicle Type: {emergency.vehicleType}</Text>
                  </View>
                  <View style={styles.emergencyRow}>
                    <Ionicons name="warning-outline" size={20} color="#666" style={styles.icon} />
                    <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                      Description: {emergency.description}
                    </Text>
                  </View>
                  {emergency.notes && (
                    <View style={styles.emergencyRow}>
                      <Ionicons name="document-text-outline" size={20} color="#666" style={styles.icon} />
                      <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                        Notes: {emergency.notes}
                      </Text>
                    </View>
                  )}
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
                  <View style={styles.emergencyRow}>
                    <Ionicons name="time-outline" size={20} color="#666" style={styles.icon} />
                    <Text style={styles.emergencyText}>Time: {new Date(emergency.timestamp).toLocaleString()}</Text>
                  </View>
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: '#00CC00', // Green button
  },
  declineButton: {
    backgroundColor: '#FF4444', // Red button
  },
  disabledButton: {
    backgroundColor: '#999999', // Gray when disabled
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

export default MechanicDashboard;