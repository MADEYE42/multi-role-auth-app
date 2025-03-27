import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import Toast from 'react-native-toast-message';

const MedicalEmergencyScreen = ({ navigation }) => {
  const [emergencyType, setEmergencyType] = useState('');
  const [location, setLocation] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [status, setStatus] = useState(null);

  const handleSearch = async () => {
    try {
      const city = location.split(',').pop().trim(); // Extract city from location
      const hospitalsQuery = query(
        collection(db, 'users'), // Fetch from users collection
        where('role', '==', 'hospital'),
        where('city', '==', city), // Use exact match on city field
        orderBy('availableBeds', 'desc'),
        orderBy('availableAmbulances', 'desc')
      );
      const querySnapshot = await getDocs(hospitalsQuery);
      const hospitalList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHospitals(hospitalList);
      if (hospitalList.length === 0) {
        Toast.show({
          type: 'error',
          text1: 'No Hospitals Found',
          text2: 'No hospitals available in your city'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    }
  };

  const handleProceed = async (hospital) => {
    try {
      const user = auth.currentUser;
      const emergencyDoc = await addDoc(collection(db, 'emergencies'), {
        userId: user.uid,
        hospitalId: hospital.id,
        type: emergencyType,
        location,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      setSelectedHospital(hospital);
      setStatus('pending');
      Toast.show({
        type: 'success',
        text1: 'Request Sent',
        text2: 'Your emergency request has been submitted'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    }
  };

  const handleShare = () => {
    Toast.show({
      type: 'success',
      text1: 'Info Shared',
      text2: 'Emergency details shared with the hospital'
    });
  };

  const handleBack = () => {
    navigation.navigate('UserDashboard');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Medical Emergency</Text>
      <Text style={styles.subtitle}>Report your emergency</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type of Emergency"
          value={emergencyType}
          onChangeText={setEmergencyType}
          placeholderTextColor="#666"
        />
        <TextInput
          style={styles.input}
          placeholder="Location (e.g., 123 Main St, City)"
          value={location}
          onChangeText={setLocation}
          placeholderTextColor="#666"
        />
        <Button title="Search Hospitals" onPress={handleSearch} color="#007AFF" />
      </View>

      {hospitals.length > 0 && !selectedHospital && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Available Hospitals</Text>
          {hospitals.map(hospital => (
            <View key={hospital.id} style={styles.hospitalCard}>
              <Text style={styles.hospitalName}>{hospital.name}</Text>
              <Text style={styles.hospitalInfo}>Beds: {hospital.availableBeds || 0}</Text>
              <Text style={styles.hospitalInfo}>Ambulances: {hospital.availableAmbulances || 0}</Text>
              <Button 
                title="Proceed" 
                onPress={() => handleProceed(hospital)} 
                color="#00CC00" 
              />
            </View>
          ))}
        </View>
      )}

      {selectedHospital && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Emergency Status</Text>
          <Text style={styles.hospitalName}>{selectedHospital.name}</Text>
          <Text style={styles.status}>Status: {status}</Text>
          <Button 
            title="Share with Hospital" 
            onPress={handleShare} 
            color="#007AFF" 
          />
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button 
          title="Back to Dashboard" 
          onPress={handleBack} 
          color="#007AFF" 
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  resultsContainer: {
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  hospitalCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  hospitalInfo: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  buttonContainer: {
    marginBottom: 20,
  }
});

export default MedicalEmergencyScreen;