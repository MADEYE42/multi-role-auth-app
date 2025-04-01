import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';
import { collection, addDoc, doc, getDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';

const MedicalEmergencyScreen = ({ navigation }) => {
  const [emergencyType, setEmergencyType] = useState('');
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [status, setStatus] = useState(null);
  const [acceptedHospital, setAcceptedHospital] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [postingEmergency, setPostingEmergency] = useState(false);
  const [loadingHospital, setLoadingHospital] = useState(false);
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
    if (!emergencyType.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter the emergency type.',
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

      const emergencyDoc = await addDoc(collection(db, 'MedicalEmergency'), emergencyData);
      setEmergencyId(emergencyDoc.id);
      setStatus('pending');
      Toast.show({
        type: 'success',
        text1: 'Emergency Posted',
        text2: 'Your emergency has been submitted.',
      });

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
                  text2: 'Failed to fetch hospital details.',
                });
              })
              .finally(() => setLoadingHospital(false));
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
        text2: 'Your emergency has been cancelled.',
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

  const handleSubmitMedicalForm = () => {
    if (emergencyId && status === 'accepted') {
      navigation.navigate('MedicalEmergencyForm', { emergencyId });
    }
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#E6F0FA']}
      style={styles.gradientContainer}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#1D3557" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Medical Emergency</Text>
            <Text style={styles.subtitle}>Report an Emergency</Text>
          </View>
        </View>

        {/* Input Section */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="medkit" size={22} color="#E63946" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Emergency Type (e.g., Heart Attack)"
              value={emergencyType}
              onChangeText={setEmergencyType}
              placeholderTextColor="#457B9D"
              editable={!status}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="location" size={22} color="#E63946" style={styles.icon} />
            {loadingLocation ? (
              <ActivityIndicator size="small" color="#E63946" style={styles.input} />
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
                <Text style={styles.submitButtonText}>REPORT EMERGENCY</Text>
              )}
            </TouchableOpacity>
          ) : status === 'pending' ? (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEmergency}>
              <Text style={styles.cancelButtonText}>CANCEL EMERGENCY</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Section */}
        {status && !acceptedHospital && !loadingHospital && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Emergency Status</Text>
            <Text style={styles.statusText}>
              Status: <Text style={[styles.statusValue, status === 'pending' && styles.pendingStatus]}>{status}</Text>
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
                    coordinate={{ latitude: coordinates.latitude, longitude: coordinates.longitude }}
                    title="Your Location"
                    description="Emergency Location"
                    pinColor="#E63946"
                  />
                </MapView>
                <Text style={styles.mapInfo}>Ambulance dispatched to your location!</Text>
              </View>
            )}

            {/* Hospital Information */}
            {loadingHospital ? (
              <View style={styles.statusContainer}>
                <ActivityIndicator size="large" color="#E63946" />
                <Text style={styles.loadingText}>Loading hospital details...</Text>
              </View>
            ) : (
              <View style={styles.hospitalContainer}>
                <Text style={styles.hospitalTitle}>Hospital Details</Text>
                <View style={styles.hospitalRow}>
                  <Ionicons name="hospital" size={20} color="#2A9D8F" style={styles.hospitalIcon} />
                  <Text style={styles.hospitalText}>Name: {acceptedHospital.name || 'N/A'}</Text>
                </View>
                <View style={styles.hospitalRow}>
                  <Ionicons name="location" size={20} color="#2A9D8F" style={styles.hospitalIcon} />
                  <Text style={styles.hospitalText}>Address: {acceptedHospital.address || 'N/A'}</Text>
                </View>
                <View style={styles.hospitalRow}>
                  <Ionicons name="call" size={20} color="#2A9D8F" style={styles.hospitalIcon} />
                  <Text style={styles.hospitalText}>Contact: {acceptedHospital.phone || 'N/A'}</Text>
                </View>
                <View style={styles.hospitalRow}>
                  <Ionicons name="bed" size={20} color="#2A9D8F" style={styles.hospitalIcon} />
                  <Text style={styles.hospitalText}>Beds: {acceptedHospital.availableBeds || 'N/A'}</Text>
                </View>
                <View style={styles.hospitalRow}>
                  <Ionicons name="car" size={20} color="#2A9D8F" style={styles.hospitalIcon} />
                  <Text style={styles.hospitalText}>Ambulances: {acceptedHospital.availableAmbulances || 'N/A'}</Text>
                </View>
                {/* Submit Medical Form Button */}
                <TouchableOpacity
                  style={styles.formButton}
                  onPress={handleSubmitMedicalForm}
                >
                  <Text style={styles.formButtonText}>SUBMIT MEDICAL FORM</Text>
                </TouchableOpacity>
              </View>
            )}
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
    backgroundColor: '#E63946',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#E6A8A8',
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
    color: '#E63946',
  },
  acceptedStatus: {
    color: '#2A9D8F',
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
  hospitalContainer: {
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
  hospitalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2A9D8F',
    marginBottom: 15,
  },
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hospitalIcon: {
    marginRight: 12,
  },
  hospitalText: {
    fontSize: 16,
    color: '#1D3557',
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#457B9D',
    fontWeight: '500',
  },
  formButton: {
    backgroundColor: '#E63946',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 20,
  },
  formButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

export default MedicalEmergencyScreen;