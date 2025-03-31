import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, runTransaction, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const MechanicDashboard = ({ navigation }) => {
  const [mechanicData, setMechanicData] = useState(null);
  const [pendingEmergencies, setPendingEmergencies] = useState([]);
  const [acceptedEmergencies, setAcceptedEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) {
      navigation.replace('Login');
      return;
    }

    const fetchMechanicData = async () => {
      try {
        const mechanicDocRef = doc(db, 'users', auth.currentUser.uid);
        const mechanicDoc = await getDoc(mechanicDocRef);
        if (mechanicDoc.exists()) {
          setMechanicData(mechanicDoc.data());
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Mechanic data not found.',
          });
        }
      } catch (error) {
        console.log('Mechanic Fetch Error:', error.code, error.message);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch mechanic data.',
        });
      }
    };

    fetchMechanicData();

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
      setPendingEmergencies(emergencies);
      setLoading(false);
    }, (error) => {
      console.log('Snapshot Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message,
      });
      setLoading(false);
    });

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
      setAcceptedEmergencies(emergencies);
    }, (error) => {
      console.log('Snapshot Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message,
      });
    });

    const mechanicDocRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribeMechanic = onSnapshot(mechanicDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setMechanicData(docSnapshot.data());
      }
    }, (error) => {
      console.log('Mechanic Snapshot Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update mechanic data.',
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
          status: 'accepted',
        });
      });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Emergency accepted successfully!',
      });
    } catch (error) {
      console.log('Accept Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message,
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
        status: 'declined',
      });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Emergency declined.',
      });
    } catch (error) {
      console.log('Decline Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message,
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleAddMechanic = async () => {
    try {
      const mechanicDocRef = doc(db, 'users', auth.currentUser.uid);
      const newMechanics = (mechanicData?.availableMechanics || 0) + 1;
      await updateDoc(mechanicDocRef, {
        availableMechanics: newMechanics,
        updatedAt: new Date().toISOString(),
      });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Mechanic added successfully!',
      });
    } catch (error) {
      console.log('Add Mechanic Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add mechanic.',
      });
    }
  };

  const handleSubtractMechanic = async () => {
    const currentMechanics = mechanicData?.availableMechanics || 0;
    if (currentMechanics <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No mechanics available to subtract.',
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
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Mechanic removed successfully!',
      });
    } catch (error) {
      console.log('Subtract Mechanic Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove mechanic.',
      });
    }
  };

  const handleAddTowTruck = async () => {
    try {
      const mechanicDocRef = doc(db, 'users', auth.currentUser.uid);
      const newTowTrucks = (mechanicData?.availableTowTrucks || 0) + 1;
      await updateDoc(mechanicDocRef, {
        availableTowTrucks: newTowTrucks,
        updatedAt: new Date().toISOString(),
      });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Tow truck added successfully!',
      });
    } catch (error) {
      console.log('Add Tow Truck Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add tow truck.',
      });
    }
  };

  const handleSubtractTowTruck = async () => {
    const currentTowTrucks = mechanicData?.availableTowTrucks || 0;
    if (currentTowTrucks <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No tow trucks available to subtract.',
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
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Tow truck removed successfully!',
      });
    } catch (error) {
      console.log('Subtract Tow Truck Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove tow truck.',
      });
    }
  };

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
      console.log('Logout Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message,
      });
    }
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#E6F0FA']} // White to light blue gradient
      style={styles.gradientContainer}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Mechanic Dashboard</Text>
            <Text style={styles.subtitle}>Manage Vehicle Emergencies</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Mechanic Resources Section */}
        {mechanicData ? (
          <View style={styles.resourcesContainer}>
            <Text style={styles.sectionTitle}>Mechanic Resources</Text>
            <View style={styles.resourceRow}>
              <Ionicons name="construct" size={22} color="#F4A261" style={styles.icon} />
              <Text style={styles.resourceText}>Mechanics: {mechanicData.availableMechanics || 0}</Text>
              <View style={styles.resourceButtons}>
                <TouchableOpacity style={styles.resourceButtonAdd} onPress={handleAddMechanic}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.resourceButtonSubtract} onPress={handleSubtractMechanic}>
                  <Ionicons name="remove" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.resourceRow}>
              <Ionicons name="car" size={22} color="#F4A261" style={styles.icon} />
              <Text style={styles.resourceText}>Tow Trucks: {mechanicData.availableTowTrucks || 0}</Text>
              <View style={styles.resourceButtons}>
                <TouchableOpacity style={styles.resourceButtonAdd} onPress={handleAddTowTruck}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.resourceButtonSubtract} onPress={handleSubtractTowTruck}>
                  <Ionicons name="remove" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F4A261" />
            <Text style={styles.loadingText}>Loading resources...</Text>
          </View>
        )}

        {/* Loading State for Emergencies */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F4A261" />
            <Text style={styles.loadingText}>Loading emergencies...</Text>
          </View>
        ) : (
          <>
            {/* Pending Emergencies Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Pending Vehicle Emergencies</Text>
              {pendingEmergencies.length === 0 ? (
                <Text style={styles.noDataText}>No pending emergencies.</Text>
              ) : (
                pendingEmergencies.map((emergency) => (
                  <View key={emergency.id} style={styles.emergencyCard}>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="car" size={20} color="#F4A261" style={styles.icon} />
                      <Text style={styles.emergencyText}>Type: {emergency.type}</Text>
                    </View>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="car-sport" size={20} color="#F4A261" style={styles.icon} />
                      <Text style={styles.emergencyText}>Vehicle: {emergency.vehicleType}</Text>
                    </View>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="warning" size={20} color="#F4A261" style={styles.icon} />
                      <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                        Issue: {emergency.description}
                      </Text>
                    </View>
                    {emergency.notes && (
                      <View style={styles.emergencyRow}>
                        <Ionicons name="document-text" size={20} color="#F4A261" style={styles.icon} />
                        <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                          Notes: {emergency.notes}
                        </Text>
                      </View>
                    )}
                    <View style={styles.emergencyRow}>
                      <Ionicons name="location" size={20} color="#F4A261" style={styles.icon} />
                      <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                        Location: {emergency.location}
                      </Text>
                    </View>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="person" size={20} color="#F4A261" style={styles.icon} />
                      <Text style={styles.emergencyText}>User: {emergency.userName}</Text>
                    </View>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="time" size={20} color="#F4A261" style={styles.icon} />
                      <Text style={styles.emergencyText}>
                        Time: {new Date(emergency.timestamp).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.acceptButton,
                          (processing === emergency.id || mechanicData?.availableMechanics === 0 || mechanicData?.availableTowTrucks === 0) && styles.disabledButton,
                        ]}
                        onPress={() => handleAcceptEmergency(emergency.id)}
                        disabled={processing === emergency.id || mechanicData?.availableMechanics === 0 || mechanicData?.availableTowTrucks === 0}
                      >
                        {processing === emergency.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.actionButtonText}>ACCEPT</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.declineButton,
                          processing === emergency.id && styles.disabledButton,
                        ]}
                        onPress={() => handleDeclineEmergency(emergency.id)}
                        disabled={processing === emergency.id}
                      >
                        {processing === emergency.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.actionButtonText}>DECLINE</Text>
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
                  <View key={emergency.id} style={[styles.emergencyCard, { borderLeftColor: '#2A9D8F' }]}>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="car" size={20} color="#2A9D8F" style={styles.icon} />
                      <Text style={styles.emergencyText}>Type: {emergency.type}</Text>
                    </View>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="car-sport" size={20} color="#2A9D8F" style={styles.icon} />
                      <Text style={styles.emergencyText}>Vehicle: {emergency.vehicleType}</Text>
                    </View>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="warning" size={20} color="#2A9D8F" style={styles.icon} />
                      <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                        Issue: {emergency.description}
                      </Text>
                    </View>
                    {emergency.notes && (
                      <View style={styles.emergencyRow}>
                        <Ionicons name="document-text" size={20} color="#2A9D8F" style={styles.icon} />
                        <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                          Notes: {emergency.notes}
                        </Text>
                      </View>
                    )}
                    <View style={styles.emergencyRow}>
                      <Ionicons name="location" size={20} color="#2A9D8F" style={styles.icon} />
                      <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                        Location: {emergency.location}
                      </Text>
                    </View>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="person" size={20} color="#2A9D8F" style={styles.icon} />
                      <Text style={styles.emergencyText}>User: {emergency.userName || 'Unknown'}</Text>
                    </View>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="call" size={20} color="#2A9D8F" style={styles.icon} />
                      <Text style={styles.emergencyText}>Contact: {emergency.userPhone || 'N/A'}</Text>
                    </View>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="time" size={20} color="#2A9D8F" style={styles.icon} />
                      <Text style={styles.emergencyText}>
                        Time: {new Date(emergency.timestamp).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
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
    backgroundColor: '#F4A261', // Orange for mechanic theme
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F4A261',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resourcesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  resourceText: {
    fontSize: 16,
    color: '#1D3557',
    flex: 1,
    fontWeight: '500',
  },
  resourceButtons: {
    flexDirection: 'row',
  },
  resourceButtonAdd: {
    backgroundColor: '#2A9D8F', // Teal for adding
    padding: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  resourceButtonSubtract: {
    backgroundColor: '#F4A261', // Orange for subtracting
    padding: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  loadingContainer: {
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
  sectionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D3557',
    marginBottom: 15,
  },
  emergencyCard: {
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
    borderLeftColor: '#F4A261', // Orange for pending
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    marginRight: 12,
  },
  emergencyText: {
    fontSize: 16,
    color: '#1D3557',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptButton: {
    backgroundColor: '#2A9D8F', // Teal for accept
    shadowColor: '#2A9D8F',
  },
  declineButton: {
    backgroundColor: '#F4A261', // Orange for decline
    shadowColor: '#F4A261',
  },
  disabledButton: {
    backgroundColor: '#A3BFFA', // Light blue when disabled
    shadowOpacity: 0,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  noDataText: {
    fontSize: 16,
    color: '#457B9D',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default MechanicDashboard;