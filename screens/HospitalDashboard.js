import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { printToFileAsync } from 'expo-print';
import * as Sharing from 'expo-sharing';

const HospitalDashboard = ({ navigation }) => {
  const [pendingEmergencies, setPendingEmergencies] = useState([]);
  const [acceptedEmergencies, setAcceptedEmergencies] = useState([]);
  const [hospitalData, setHospitalData] = useState(null);
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) {
      navigation.replace('Login');
      return;
    }

    const fetchHospitalData = async () => {
      try {
        const hospitalDocRef = doc(db, 'users', auth.currentUser.uid);
        const hospitalDoc = await getDoc(hospitalDocRef);
        if (hospitalDoc.exists()) {
          setHospitalData(hospitalDoc.data());
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Hospital data not found.',
          });
        }
      } catch (error) {
        console.log('Hospital Fetch Error:', error.code, error.message);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch hospital data.',
        });
      }
    };

    fetchHospitalData();

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
      setPendingEmergencies(emergencies);
      setLoading(false);
    }, (error) => {
      console.log('Pending Snapshot Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message,
      });
      setLoading(false);
    });

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
      setAcceptedEmergencies(emergencies);

      emergencies.forEach((emergency) => {
        const formDocRef = doc(db, 'MedicalEmergencyForms', `${emergency.id}_${emergency.userId}`);
        onSnapshot(formDocRef, (formDoc) => {
          if (formDoc.exists()) {
            console.log('Form Data Fetched:', formDoc.data(), 'for Emergency:', emergency.id);
            setForms((prev) => ({ ...prev, [emergency.id]: formDoc.data() }));
          } else {
            console.log('No Form Exists for ID:', `${emergency.id}_${emergency.userId}`);
          }
        }, (error) => {
          console.log('Form Fetch Error:', error.code, error.message, 'Form ID:', `${emergency.id}_${emergency.userId}`);
          // Optionally notify user of permission issue
          Toast.show({
            type: 'info',
            text1: 'Info',
            text2: 'Form data unavailable due to permissions.',
            visibilityTime: 2000,
          });
        });
      });
    }, (error) => {
      console.log('Accepted Snapshot Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message,
      });
    });

    const hospitalDocRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribeHospital = onSnapshot(hospitalDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setHospitalData(docSnapshot.data());
      }
    }, (error) => {
      console.log('Hospital Snapshot Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update hospital data.',
      });
    });

    return () => {
      unsubscribePending();
      unsubscribeAccepted();
      unsubscribeHospital();
    };
  }, [navigation]);

  const updateHospitalResources = async (newBeds, newAmbulances) => {
    try {
      const hospitalDocRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(hospitalDocRef, {
        availableBeds: newBeds,
        availableAmbulances: newAmbulances,
        updatedAt: new Date().toISOString(),
      });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Resources updated successfully!',
      });
    } catch (error) {
      console.log('Resource Update Error:', error.code, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update resources.',
      });
    }
  };

  const handleAddBeds = () => {
    const newBeds = (hospitalData?.availableBeds || 0) + 1;
    updateHospitalResources(newBeds, hospitalData?.availableAmbulances || 0);
  };

  const handleSubtractBeds = () => {
    const currentBeds = hospitalData?.availableBeds || 0;
    if (currentBeds <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No beds available to subtract.',
      });
      return;
    }
    const newBeds = currentBeds - 1;
    updateHospitalResources(newBeds, hospitalData?.availableAmbulances || 0);
  };

  const handleAddAmbulances = () => {
    const newAmbulances = (hospitalData?.availableAmbulances || 0) + 1;
    updateHospitalResources(hospitalData?.availableBeds || 0, newAmbulances);
  };

  const handleSubtractAmbulances = () => {
    const currentAmbulances = hospitalData?.availableAmbulances || 0;
    if (currentAmbulances <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No ambulances available to subtract.',
      });
      return;
    }
    const newAmbulances = currentAmbulances - 1;
    updateHospitalResources(hospitalData?.availableBeds || 0, newAmbulances);
  };

  const handleAcceptEmergency = async (emergencyId) => {
    setAccepting(emergencyId);
    try {
      const currentBeds = hospitalData?.availableBeds || 0;
      const currentAmbulances = hospitalData?.availableAmbulances || 0;

      if (currentBeds === 0 && currentAmbulances === 0) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'No beds or ambulances available to accept this emergency.',
        });
        setAccepting(null);
        return;
      } else if (currentBeds === 0) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'No beds available to accept this emergency.',
        });
        setAccepting(null);
        return;
      } else if (currentAmbulances === 0) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'No ambulances available to accept this emergency.',
        });
        setAccepting(null);
        return;
      }

      const emergencyRef = doc(db, 'MedicalEmergency', emergencyId);
      await updateDoc(emergencyRef, {
        hospitalId: auth.currentUser.uid,
        status: 'accepted',
      });

      const newBeds = currentBeds - 1;
      const newAmbulances = currentAmbulances - 1;
      await updateHospitalResources(newBeds, newAmbulances);

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
      setAccepting(null);
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

  const generatePDF = async (formData, emergencyId) => {
    try {
      const html = `
        <h1 style="color: #1D3557; text-align: center;">Medical Emergency Form</h1>
        <h2 style="color: #457B9D;">Personal Information</h2>
        <p><strong>Full Name:</strong> ${formData.fullName || 'N/A'}</p>
        <p><strong>Age:</strong> ${formData.age || 'N/A'}</p>
        <p><strong>Gender:</strong> ${formData.gender || 'N/A'}</p>
        <p><strong>Contact Number:</strong> ${formData.contactNumber || 'N/A'}</p>
        <p><strong>Alternate Contact:</strong> ${formData.alternateContact || 'N/A'}</p>
        <p><strong>Address:</strong> ${formData.address || 'N/A'}</p>
        <h2 style="color: #457B9D;">Medical History</h2>
        <p><strong>Pre-existing Conditions:</strong> ${formData.hasMedicalConditions || 'No'} ${formData.medicalConditions ? `- ${formData.medicalConditions}` : ''}</p>
        <p><strong>Medications:</strong> ${formData.onMedications || 'No'} ${formData.medications ? `- ${formData.medications}` : ''}</p>
        <p><strong>Allergies:</strong> ${formData.hasAllergies || 'No'} ${formData.allergies ? `- ${formData.allergies}` : ''}</p>
        <p><strong>Past Surgeries:</strong> ${formData.hadSurgeries || 'No'} ${formData.surgeries ? `- ${formData.surgeries}` : ''}</p>
        <h2 style="color: #457B9D;">Emergency Details</h2>
        <p><strong>Primary Issue:</strong> ${formData.primaryIssue || 'N/A'}</p>
        <p><strong>Conscious:</strong> ${formData.isConscious || 'N/A'}</p>
        <p><strong>Related Conditions:</strong> ${formData.relatedConditions || 'No'} ${formData.relatedConditionsDetails ? `- ${formData.relatedConditionsDetails}` : ''}</p>
        <p><strong>Special Assistance:</strong> ${formData.specialAssistance || 'None'}</p>
        <p><strong>Additional Symptoms:</strong> ${formData.additionalSymptoms || 'None'}</p>
        <h2 style="color: #457B9D;">Insurance</h2>
        <p><strong>Has Insurance:</strong> ${formData.hasInsurance || 'No'}</p>
        ${formData.hasInsurance === 'Yes' ? `
          <p><strong>Policy Number:</strong> ${formData.insurancePolicy || 'N/A'}</p>
          <p><strong>Provider Name:</strong> ${formData.insuranceProvider || 'N/A'}</p>
        ` : ''}
        <h2 style="color: #457B9D;">Consent & Verification</h2>
        <p><strong>Consent for Records:</strong> ${formData.consent || 'N/A'}</p>
        <p><strong>ID Proof URL:</strong> ${formData.idProofUrl || 'Not provided'}</p>
      `;
      const { uri } = await printToFileAsync({
        html,
        fileName: `MedicalForm_${emergencyId}`,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Open or Share Medical Form PDF',
          UTI: 'com.adobe.pdf',
        });
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'PDF generated successfully!',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Sharing is not available on this device.',
        });
      }
    } catch (error) {
      console.log('PDF Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to generate PDF: ' + error.message,
      });
    }
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#E6F0FA']} style={styles.gradientContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Hospital Dashboard</Text>
            <Text style={styles.subtitle}>Manage Emergencies</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Hospital Resources Section */}
        {hospitalData ? (
          <View style={styles.resourcesContainer}>
            <Text style={styles.sectionTitle}>Hospital Resources</Text>
            <View style={styles.resourceRow}>
              <Ionicons name="bed" size={22} color="#E63946" style={styles.icon} />
              <Text style={styles.resourceText}>Beds: {hospitalData.availableBeds || 0}</Text>
              <View style={styles.resourceButtons}>
                <TouchableOpacity style={styles.resourceButtonAdd} onPress={handleAddBeds}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.resourceButtonSubtract} onPress={handleSubtractBeds}>
                  <Ionicons name="remove" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.resourceRow}>
              <Ionicons name="car" size={22} color="#E63946" style={styles.icon} />
              <Text style={styles.resourceText}>Ambulances: {hospitalData.availableAmbulances || 0}</Text>
              <View style={styles.resourceButtons}>
                <TouchableOpacity style={styles.resourceButtonAdd} onPress={handleAddAmbulances}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.resourceButtonSubtract} onPress={handleSubtractAmbulances}>
                  <Ionicons name="remove" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E63946" />
            <Text style={styles.loadingText}>Loading resources...</Text>
          </View>
        )}

        {/* Loading State for Emergencies */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E63946" />
            <Text style={styles.loadingText}>Loading emergencies...</Text>
          </View>
        ) : (
          <>
            {/* Pending Emergencies Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Pending Emergencies</Text>
              {pendingEmergencies.length === 0 ? (
                <Text style={styles.noDataText}>No pending emergencies.</Text>
              ) : (
                pendingEmergencies.map((emergency) => (
                  <View key={emergency.id} style={styles.emergencyCard}>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="medkit" size={20} color="#E63946" style={styles.icon} />
                      <Text style={styles.emergencyText}>Type: {emergency.type}</Text>
                    </View>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="location" size={20} color="#E63946" style={styles.icon} />
                      <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                        Location: {emergency.location}
                      </Text>
                    </View>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="person" size={20} color="#E63946" style={styles.icon} />
                      <Text style={styles.emergencyText}>User: {emergency.userName}</Text>
                    </View>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="call" size={20} color="#E63946" style={styles.icon} />
                      <Text style={styles.emergencyText}>Contact: {emergency.userPhone || 'N/A'}</Text>
                    </View>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="medkit" size={20} color="#E63946" style={styles.icon} />
                      <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                        Conditions: {emergency.medicalConditions || 'Not provided'}
                      </Text>
                    </View>
                    {emergency.medicalCertificate ? (
                      <TouchableOpacity onPress={() => openCertificate(emergency.medicalCertificate)}>
                        <View style={styles.emergencyRow}>
                          <Ionicons name="document" size={20} color="#E63946" style={styles.icon} />
                          <Text style={[styles.emergencyText, styles.linkText]}>View Certificate</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.emergencyRow}>
                        <Ionicons name="document" size={20} color="#E63946" style={styles.icon} />
                        <Text style={styles.emergencyText}>Certificate: Not provided</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        (accepting === emergency.id || hospitalData?.availableBeds === 0 || hospitalData?.availableAmbulances === 0) && styles.disabledButton,
                      ]}
                      onPress={() => handleAcceptEmergency(emergency.id)}
                      disabled={accepting === emergency.id || hospitalData?.availableBeds === 0 || hospitalData?.availableAmbulances === 0}
                    >
                      {accepting === emergency.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.actionButtonText}>ACCEPT EMERGENCY</Text>
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
                  <View key={emergency.id} style={[styles.emergencyCard, { borderLeftColor: '#2A9D8F' }]}>
                    <View style={styles.emergencyRow}>
                      <Ionicons name="medkit" size={20} color="#2A9D8F" style={styles.icon} />
                      <Text style={styles.emergencyText}>Type: {emergency.type}</Text>
                    </View>
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
                      <Ionicons name="medkit" size={20} color="#2A9D8F" style={styles.icon} />
                      <Text style={styles.emergencyText} numberOfLines={2} ellipsizeMode="tail">
                        Conditions: {emergency.medicalConditions || 'Not provided'}
                      </Text>
                    </View>
                    {emergency.medicalCertificate ? (
                      <TouchableOpacity onPress={() => openCertificate(emergency.medicalCertificate)}>
                        <View style={styles.emergencyRow}>
                          <Ionicons name="document" size={20} color="#2A9D8F" style={styles.icon} />
                          <Text style={[styles.emergencyText, styles.linkText]}>View Certificate</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.emergencyRow}>
                        <Ionicons name="document" size={20} color="#2A9D8F" style={styles.icon} />
                        <Text style={styles.emergencyText}>Certificate: Not provided</Text>
                      </View>
                    )}
                    {/* Display Medical Form if Submitted */}
                    {forms[emergency.id] ? (
                      <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Medical Emergency Form</Text>
                        <View style={styles.emergencyRow}>
                          <Ionicons name="person" size={20} color="#2A9D8F" style={styles.icon} />
                          <Text style={styles.emergencyText}>Full Name: {forms[emergency.id].fullName || 'N/A'}</Text>
                        </View>
                        <View style={styles.emergencyRow}>
                          <Ionicons name="calendar" size={20} color="#2A9D8F" style={styles.icon} />
                          <Text style={styles.emergencyText}>Age: {forms[emergency.id].age || 'N/A'}</Text>
                        </View>
                        <View style={styles.emergencyRow}>
                          <Ionicons name="male-female" size={20} color="#2A9D8F" style={styles.icon} />
                          <Text style={styles.emergencyText}>Gender: {forms[emergency.id].gender || 'N/A'}</Text>
                        </View>
                        <View style={styles.emergencyRow}>
                          <Ionicons name="call" size={20} color="#2A9D8F" style={styles.icon} />
                          <Text style={styles.emergencyText}>Alternate Contact: {forms[emergency.id].alternateContact || 'N/A'}</Text>
                        </View>
                        <View style={styles.emergencyRow}>
                          <Ionicons name="location" size={20} color="#2A9D8F" style={styles.icon} />
                          <Text style={styles.emergencyText}>Address: {forms[emergency.id].address || 'N/A'}</Text>
                        </View>
                        <View style={styles.emergencyRow}>
                          <Ionicons name="medkit" size={20} color="#2A9D8F" style={styles.icon} />
                          <Text style={styles.emergencyText}>Primary Issue: {forms[emergency.id].primaryIssue || 'N/A'}</Text>
                        </View>
                        <View style={styles.emergencyRow}>
                          <Ionicons name="eye" size={20} color="#2A9D8F" style={styles.icon} />
                          <Text style={styles.emergencyText}>Conscious: {forms[emergency.id].isConscious || 'N/A'}</Text>
                        </View>
                        <View style={styles.emergencyRow}>
                          <Ionicons name="pulse" size={20} color="#2A9D8F" style={styles.icon} />
                          <Text style={styles.emergencyText}>Additional Symptoms: {forms[emergency.id].additionalSymptoms || 'None'}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.downloadButton}
                          onPress={() => generatePDF(forms[emergency.id], emergency.id)}
                        >
                          <Text style={styles.downloadButtonText}>Download Form as PDF</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.formSection}>
                        <Text style={styles.noDataText}>Form not available yet.</Text>
                      </View>
                    )}
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
  gradientContainer: { flex: 1 },
  container: { flex: 1 },
  scrollContainer: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 30 },
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
  headerTextContainer: { flex: 1 },
  title: { fontSize: 26, fontWeight: '700', color: '#1D3557', letterSpacing: 0.3 },
  subtitle: { fontSize: 14, color: '#457B9D', fontWeight: '500', marginTop: 2 },
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
  resourceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  resourceText: { fontSize: 16, color: '#1D3557', flex: 1, fontWeight: '500' },
  resourceButtons: { flexDirection: 'row' },
  resourceButtonAdd: { backgroundColor: '#2A9D8F', padding: 8, borderRadius: 8, marginLeft: 10 },
  resourceButtonSubtract: { backgroundColor: '#E63946', padding: 8, borderRadius: 8, marginLeft: 10 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#457B9D', fontWeight: '500' },
  sectionContainer: { marginBottom: 30 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1D3557', marginBottom: 15 },
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
    borderLeftColor: '#E63946', // Default red for pending
  },
  emergencyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  icon: { marginRight: 12 },
  emergencyText: { fontSize: 16, color: '#1D3557', fontWeight: '500' },
  linkText: { color: '#457B9D', textDecorationLine: 'underline', fontWeight: '600' },
  actionButton: {
    backgroundColor: '#E63946',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 10,
  },
  disabledButton: { backgroundColor: '#E6A8A8', shadowOpacity: 0 },
  actionButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.8 },
  noDataText: { fontSize: 16, color: '#457B9D', textAlign: 'center', fontWeight: '500' },
  formSection: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#E6E6E6' },
  downloadButton: {
    backgroundColor: '#2A9D8F',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  downloadButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', textTransform: 'uppercase' },
});

export default HospitalDashboard;