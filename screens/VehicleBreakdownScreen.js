import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';
import { collection, addDoc, doc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';

const VehicleBreakdownScreen = ({ navigation }) => {
  const [emergencyType, setEmergencyType] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [status, setStatus] = useState(null);
  const [acceptedMechanic, setAcceptedMechanic] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [postingEmergency, setPostingEmergency] = useState(false);
  const [emergencyId, setEmergencyId] = useState(null);
  const [unsubscribe, setUnsubscribe] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Toast.show({
            type: 'error',
            text1: 'Permission Denied',
            text2: 'Location permission is required.',
          });
          setLocation('Location permission denied');
          setLoadingLocation(false);
          return;
        }

        let userLocation = await Location.getCurrentPositionAsync({});
        let addressResponse = await Location.reverseGeocodeAsync({
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
        });

        if (addressResponse.length > 0) {
          const { street, city, region, country } = addressResponse[0];
          const formattedAddress = `${street || ''}, ${city || ''}, ${region || ''}, ${country || ''}`;
          setLocation(formattedAddress);
          setCoordinates({
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude,
          });
        } else {
          setLocation('Unable to fetch location');
        }
      } catch (error) {
        console.log('Location Error:', error.message);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch location.',
        });
        setLocation('Failed to fetch location');
      } finally {
        setLoadingLocation(false);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handlePostEmergency = async () => {
    if (!emergencyType.trim() || !vehicleType.trim() || !description.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all required fields.',
      });
      return;
    }

    setPostingEmergency(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user found.');

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : { name: 'Unknown User', phone: 'Not available' };

      const emergencyData = {
        userId: user.uid,
        userName: userData.name,
        userPhone: userData.phone,
        type: emergencyType,
        vehicleType,
        description,
        notes: notes.trim() || null,
        location,
        latitude: coordinates?.latitude || null,
        longitude: coordinates?.longitude || null,
        timestamp: new Date().toISOString(),
        status: 'pending',
        mechanicId: null,
      };

      const emergencyDoc = await addDoc(collection(db, 'VehicleEmergency'), emergencyData);
      setEmergencyId(emergencyDoc.id);
      setStatus('pending');
      Toast.show({
        type: 'success',
        text1: 'Emergency Posted',
        text2: 'Your vehicle breakdown has been submitted.',
      });

      const emergencyDocRef = doc(db, 'VehicleEmergency', emergencyDoc.id);
      const unsubscribeSnapshot = onSnapshot(emergencyDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setStatus(data.status);
          if (data.status === 'accepted' && data.mechanicId) {
            getDoc(doc(db, 'users', data.mechanicId))
              .then((mechanicDoc) => {
                setAcceptedMechanic(mechanicDoc.exists() ? mechanicDoc.data() : null);
              })
              .catch((error) => {
                console.log('Mechanic Fetch Error:', error.code, error.message);
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Failed to fetch mechanic details.',
                });
              });
            unsubscribeSnapshot();
          } else if (data.status === 'declined') {
            setStatus('declined');
            unsubscribeSnapshot();
          }
        }
      }, (error) => {
        console.log('Snapshot Error:', error.code, error.message);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.message,
        });
      });

      setUnsubscribe(() => unsubscribeSnapshot);
    } catch (error) {
      console.log('Firestore Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to post emergency.',
      });
    } finally {
      setPostingEmergency(false);
    }
  };

  const handleCancelEmergency = async () => {
    if (!emergencyId || status !== 'pending') return;

    try {
      const emergencyDocRef = doc(db, 'VehicleEmergency', emergencyId);
      await deleteDoc(emergencyDocRef);
      setStatus(null);
      setEmergencyId(null);
      setEmergencyType('');
      setVehicleType('');
      setDescription('');
      setNotes('');
      if (unsubscribe) {
        unsubscribe();
        setUnsubscribe(null);
      }
      Toast.show({
        type: 'success',
        text1: 'Emergency Cancelled',
        text2: 'Your vehicle emergency has been cancelled.',
      });
    } catch (error) {
      console.log('Cancel Emergency Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to cancel the emergency.',
      });
    }
  };

  const handleBack = () => {
    if (unsubscribe) unsubscribe();
    navigation.navigate('UserDashboard');
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#E6F0FA']} // White to light blue gradient
      style={styles.gradientContainer}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#1D3557" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Vehicle Breakdown</Text>
            <Text style={styles.subtitle}>Report a Breakdown</Text>
          </View>
        </View>

        {/* Input Section */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="car" size={22} color="#457B9D" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Emergency Type (e.g., Flat Tire)"
              value={emergencyType}
              onChangeText={setEmergencyType}
              placeholderTextColor="#457B9D"
              editable={!status}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="car-sport" size={22} color="#457B9D" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Vehicle Type (e.g., Sedan)"
              value={vehicleType}
              onChangeText={setVehicleType}
              placeholderTextColor="#457B9D"
              editable={!status}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="warning" size={22} color="#457B9D" style={styles.icon} />
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Description (e.g., Engine Failure)"
              value={description}
              onChangeText={setDescription}
              placeholderTextColor="#457B9D"
              multiline
              editable={!status}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="document-text" size={22} color="#457B9D" style={styles.icon} />
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholderTextColor="#457B9D"
              multiline
              editable={!status}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="location" size={22} color="#457B9D" style={styles.icon} />
            {loadingLocation ? (
              <ActivityIndicator size="small" color="#457B9D" style={styles.input} />
            ) : (
              <Text style={styles.locationText} numberOfLines={2} ellipsizeMode="tail">
                {location}
              </Text>
            )}
          </View>

          {!status ? (
            <TouchableOpacity
              style={[styles.submitButton, (postingEmergency || loadingLocation) && styles.disabledButton]}
              onPress={handlePostEmergency}
              disabled={postingEmergency || loadingLocation}
            >
              {postingEmergency ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>REPORT BREAKDOWN</Text>
              )}
            </TouchableOpacity>
          ) : status === 'pending' ? (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEmergency}>
              <Text style={styles.cancelButtonText}>CANCEL BREAKDOWN</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Section */}
        {status && !acceptedMechanic && status !== 'accepted' && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Breakdown Status</Text>
            <Text style={styles.statusText}>
              Status: <Text style={[styles.statusValue, status === 'pending' ? styles.pendingStatus : styles.declinedStatus]}>{status}</Text>
            </Text>
            {status === 'declined' && (
              <Text style={styles.statusMessage}>Request declined. Please try again.</Text>
            )}
          </View>
        )}

        {/* Accepted Mechanic and Map Section */}
        {acceptedMechanic && (
          <>
            {/* Status Update */}
            <View style={styles.statusContainer}>
              <Text style={styles.statusTitle}>Breakdown Status</Text>
              <Text style={styles.statusText}>
                Status: <Text style={[styles.statusValue, styles.acceptedStatus]}>Accepted</Text>
              </Text>
            </View>

            {/* Map Section */}
            {coordinates && (
              <View style={styles.mapContainer}>
                <Text style={styles.mapTitle}>Mechanic Route</Text>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={true}
                  zoomEnabled={true}
                >
                  <Marker
                    coordinate={{ latitude: coordinates.latitude, longitude: coordinates.longitude }}
                    title="Your Location"
                    description="Breakdown Location"
                    pinColor="#457B9D"
                  />
                </MapView>
                <Text style={styles.mapInfo}>Mechanic dispatched to your location!</Text>
              </View>
            )}

            {/* Mechanic Information */}
            <View style={styles.mechanicContainer}>
              <Text style={styles.mechanicTitle}>Mechanic Details</Text>
              <View style={styles.mechanicRow}>
                <Ionicons name="person" size={20} color="#F4A261" style={styles.mechanicIcon} />
                <Text style={styles.mechanicText}>Name: {acceptedMechanic.name || 'N/A'}</Text>
              </View>
              <View style={styles.mechanicRow}>
                <Ionicons name="call" size={20} color="#F4A261" style={styles.mechanicIcon} />
                <Text style={styles.mechanicText}>Contact: {acceptedMechanic.phone || 'N/A'}</Text>
              </View>
              <View style={styles.mechanicRow}>
                <Ionicons name="construct" size={20} color="#F4A261" style={styles.mechanicIcon} />
                <Text style={styles.mechanicText}>Mechanics: {acceptedMechanic.availableMechanics || 'N/A'}</Text>
              </View>
              <View style={styles.mechanicRow}>
                <Ionicons name="car" size={20} color="#F4A261" style={styles.mechanicIcon} />
                <Text style={styles.mechanicText}>Tow Trucks: {acceptedMechanic.availableTowTrucks || 'N/A'}</Text>
              </View>
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
  backButton: {
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
  inputContainer: {
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1D3557',
    paddingVertical: 5,
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    color: '#1D3557',
    paddingVertical: 5,
  },
  icon: {
    marginRight: 12,
  },
  submitButton: {
    backgroundColor: '#457B9D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#457B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#A3BFFA',
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cancelButton: {
    backgroundColor: '#F4A261',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#F4A261',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D3557',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#457B9D',
  },
  statusValue: {
    fontWeight: '600',
  },
  pendingStatus: {
    color: '#457B9D',
  },
  declinedStatus: {
    color: '#E63946',
  },
  acceptedStatus: {
    color: '#F4A261',
  },
  statusMessage: {
    fontSize: 14,
    color: '#E63946',
    marginTop: 10,
    textAlign: 'center',
  },
  mapContainer: {
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
  mapTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D3557',
    marginBottom: 15,
    textAlign: 'center',
  },
  map: {
    width: '100%',
    height: 250,
    borderRadius: 10,
  },
  mapInfo: {
    fontSize: 14,
    color: '#457B9D',
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  mechanicContainer: {
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
  mechanicTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F4A261',
    marginBottom: 15,
  },
  mechanicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mechanicIcon: {
    marginRight: 12,
  },
  mechanicText: {
    fontSize: 16,
    color: '#1D3557',
    fontWeight: '500',
  },
});

export default VehicleBreakdownScreen;