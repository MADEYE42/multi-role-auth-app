import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';
import { collection, addDoc, doc, getDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location'; // For location fetching
import { Ionicons } from '@expo/vector-icons'; // For icons
import MapView, { Marker } from 'react-native-maps'; // For displaying maps

const MedicalEmergencyScreen = ({ navigation }) => {
  const [emergencyType, setEmergencyType] = useState('');
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState(null); // Store latitude and longitude for the map
  const [status, setStatus] = useState(null);
  const [acceptedHospital, setAcceptedHospital] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [postingEmergency, setPostingEmergency] = useState(false);
  const [loadingHospital, setLoadingHospital] = useState(false);
  const [emergencyId, setEmergencyId] = useState(null); // Track the current emergency ID
  const [unsubscribe, setUnsubscribe] = useState(null); // Store the onSnapshot unsubscribe function

  // Fetch user's location on component mount
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Toast.show({
            type: 'error',
            text1: 'Permission Denied',
            text2: 'Location permission is required to report an emergency.'
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
          text2: 'Failed to fetch location.'
        });
        setLocation('Failed to fetch location');
      } finally {
        setLoadingLocation(false);
      }
    })();

    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handlePostEmergency = async () => {
    if (!emergencyType.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter the type of emergency.'
      });
      return;
    }

    setPostingEmergency(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found.');
      }

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : { name: 'Unknown User', phone: 'Not available' };
      console.log('User Data:', userData); // Debug log

      const emergencyData = {
        userId: user.uid,
        userName: userData.name,
        userPhone: userData.phone,
        medicalConditions: userData.medicalConditions || null,
        medicalCertificate: userData.medicalCertificate || null,
        type: emergencyType,
        location,
        latitude: coordinates?.latitude || null,
        longitude: coordinates?.longitude || null,
        timestamp: new Date().toISOString(),
        status: 'pending',
        hospitalId: null,
      };
      console.log('Posting Emergency with Data:', emergencyData); // Debug log

      const emergencyDoc = await addDoc(collection(db, 'MedicalEmergency'), emergencyData);

      console.log('Emergency Posted with ID:', emergencyDoc.id); // Debug log
      setEmergencyId(emergencyDoc.id);
      setStatus('pending');
      Toast.show({
        type: 'success',
        text1: 'Emergency Posted',
        text2: 'Your medical emergency has been submitted'
      });

      // Listen for status updates in real-time using onSnapshot
      const emergencyDocRef = doc(db, 'MedicalEmergency', emergencyDoc.id);
      const unsubscribeSnapshot = onSnapshot(emergencyDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setStatus(data.status);
          if (data.status === 'accepted' && data.hospitalId) {
            setLoadingHospital(true);
            getDoc(doc(db, 'users', data.hospitalId))
              .then((hospitalDoc) => {
                setAcceptedHospital(hospitalDoc.exists() ? hospitalDoc.data() : null);
              })
              .catch((error) => {
                console.log('Hospital Fetch Error:', error.code, error.message);
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Failed to fetch hospital details.'
                });
              })
              .finally(() => {
                setLoadingHospital(false);
              });
            unsubscribeSnapshot();
          }
        }
      }, (error) => {
        console.log('Snapshot Error:', error.code, error.message);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.message
        });
      });

      setUnsubscribe(() => unsubscribeSnapshot);
    } catch (error) {
      console.log('Firestore Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to post emergency.'
      });
    } finally {
      setPostingEmergency(false);
    }
  };

  const handleCancelEmergency = async () => {
    if (!emergencyId || status !== 'pending') return;

    try {
      const emergencyDocRef = doc(db, 'MedicalEmergency', emergencyId);
      await deleteDoc(emergencyDocRef);
      setStatus(null);
      setEmergencyId(null);
      setEmergencyType('');
      if (unsubscribe) {
        unsubscribe();
        setUnsubscribe(null);
      }
      Toast.show({
        type: 'success',
        text1: 'Emergency Cancelled',
        text2: 'Your emergency has been cancelled.'
      });
    } catch (error) {
      console.log('Cancel Emergency Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to cancel the emergency.'
      });
    }
  };

  const handleBack = () => {
    if (unsubscribe) {
      unsubscribe();
    }
    navigation.navigate('UserDashboard');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back-outline" size={28} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Medical Emergency</Text>
      </View>
      <Text style={styles.subtitle}>Report your emergency</Text>

      {/* Input Section */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <Ionicons name="medkit-outline" size={20} color="#666" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Type of Emergency (e.g., Heart Attack)"
            value={emergencyType}
            onChangeText={setEmergencyType}
            placeholderTextColor="#666"
            editable={!status} // Disable input if an emergency is already posted
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="location-outline" size={20} color="#666" style={styles.icon} />
          {loadingLocation ? (
            <ActivityIndicator size="small" color="#FF4444" style={styles.input} />
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
              <Text style={styles.submitButtonText}>Post Emergency</Text>
            )}
          </TouchableOpacity>
        ) : status === 'pending' ? (
          <TouchableOpacity
            style={[styles.cancelButton]}
            onPress={handleCancelEmergency}
          >
            <Text style={styles.cancelButtonText}>Cancel Emergency</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status Section */}
      {status && !acceptedHospital && !loadingHospital && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Emergency Status</Text>
          <Text style={styles.statusText}>
            Status: <Text style={styles.statusValue}>{status}</Text>
          </Text>
        </View>
      )}

      {/* Accepted Hospital and Map Section */}
      {acceptedHospital && (
        <>
          {/* Status Update */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Emergency Status</Text>
            <Text style={styles.statusText}>
              Status: <Text style={[styles.statusValue, styles.acceptedStatus]}>Accepted</Text>
            </Text>
          </View>

          {/* Map Section */}
          {coordinates && (
            <View style={styles.mapContainer}>
              <Text style={styles.mapTitle}>Ambulance Route</Text>
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
                  coordinate={{
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude,
                  }}
                  title="Your Location"
                  description="Emergency Location"
                />
              </MapView>
              <Text style={styles.mapInfo}>Ambulance is on the way to your location!</Text>
            </View>
          )}

          {/* Hospital Information */}
          {loadingHospital ? (
            <View style={styles.statusContainer}>
              <ActivityIndicator size="large" color="#FF4444" />
              <Text style={styles.loadingText}>Loading hospital details...</Text>
            </View>
          ) : (
            <View style={styles.hospitalContainer}>
              <Text style={styles.hospitalTitle}>Hospital Information</Text>
              <View style={styles.hospitalRow}>
                <Ionicons name="hospital-outline" size={20} color="#00CC00" style={styles.hospitalIcon} />
                <Text style={styles.hospitalText}>Name: {acceptedHospital.name || 'Not available'}</Text>
              </View>
              <View style={styles.hospitalRow}>
                <Ionicons name="location-outline" size={20} color="#00CC00" style={styles.hospitalIcon} />
                <Text style={styles.hospitalText}>Address: {acceptedHospital.address || 'Not available'}</Text>
              </View>
              <View style={styles.hospitalRow}>
                <Ionicons name="call-outline" size={20} color="#00CC00" style={styles.hospitalIcon} />
                <Text style={styles.hospitalText}>Contact: {acceptedHospital.phone || 'Not available'}</Text>
              </View>
              <View style={styles.hospitalRow}>
                <Ionicons name="bed-outline" size={20} color="#00CC00" style={styles.hospitalIcon} />
                <Text style={styles.hospitalText}>Available Beds: {acceptedHospital.availableBeds || 'Not available'}</Text>
              </View>
              <View style={styles.hospitalRow}>
                <Ionicons name="car-outline" size={20} color="#00CC00" style={styles.hospitalIcon} />
                <Text style={styles.hospitalText}>Available Ambulances: {acceptedHospital.availableAmbulances || 'Not available'}</Text>
              </View>
            </View>
          )}
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
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000', // Black text
    marginLeft: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFBB33', // Medium yellow
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF', // White card background
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 10,
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 10,
  },
  icon: {
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: '#FF4444', // Red button
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#FF9999', // Lighter red when disabled
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#FFBB33', // Yellow button for cancel
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
  },
  statusValue: {
    color: '#FF4444',
    fontWeight: 'bold',
  },
  acceptedStatus: {
    color: '#00CC00', // Green for accepted status
  },
  mapContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 15,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  mapInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  hospitalContainer: {
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
  hospitalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00CC00',
    marginBottom: 15,
  },
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  hospitalIcon: {
    marginRight: 10,
  },
  hospitalText: {
    fontSize: 16,
    color: '#000000',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default MedicalEmergencyScreen;