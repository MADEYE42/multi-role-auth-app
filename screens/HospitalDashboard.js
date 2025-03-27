import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import DashboardCard from '../components/DashboardCard';
import Toast from 'react-native-toast-message';

const HospitalDashboard = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [emergencies, setEmergencies] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          // Fetch hospital data
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({
              ...data,
              availableBeds: data.availableBeds || 0,
              availableAmbulances: data.availableAmbulances || 0
            });
          } else {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Hospital data not found'
            });
          }

          // Fetch pending emergencies
          const emergenciesQuery = query(
            collection(db, 'emergencies'),
            where('hospitalId', '==', user.uid),
            where('status', '==', 'pending')
          );
          const querySnapshot = await getDocs(emergenciesQuery);
          const emergencyList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setEmergencies(emergencyList);
        } catch (error) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: error.message
          });
        }
      }
    };
    fetchData();
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

  const handleAcceptEmergency = async (emergencyId) => {
    try {
      const emergencyRef = doc(db, 'emergencies', emergencyId);
      await updateDoc(emergencyRef, { status: 'accepted' });
      setEmergencies(prev => prev.filter(e => e.id !== emergencyId));
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Emergency request accepted'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    }
  };

  const handleDeclineEmergency = async (emergencyId) => {
    try {
      const emergencyRef = doc(db, 'emergencies', emergencyId);
      await updateDoc(emergencyRef, { status: 'declined' });
      setEmergencies(prev => prev.filter(e => e.id !== emergencyId));
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Emergency request declined'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    }
  };

  const handleAddBed = async () => {
    try {
      const user = auth.currentUser;
      const docRef = doc(db, "users", user.uid);
      const newBeds = (userData.availableBeds || 0) + 1;
      await updateDoc(docRef, { availableBeds: newBeds });
      setUserData(prev => ({ ...prev, availableBeds: newBeds }));
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Bed added successfully'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    }
  };

  const handleSubtractBed = async () => {
    try {
      const user = auth.currentUser;
      const docRef = doc(db, "users", user.uid);
      const currentBeds = userData.availableBeds || 0;
      if (currentBeds <= 0) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Cannot reduce beds below 0'
        });
        return;
      }
      const newBeds = currentBeds - 1;
      await updateDoc(docRef, { availableBeds: newBeds });
      setUserData(prev => ({ ...prev, availableBeds: newBeds }));
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Bed removed successfully'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    }
  };

  const handleAddAmbulance = async () => {
    try {
      const user = auth.currentUser;
      const docRef = doc(db, "users", user.uid);
      const newAmbulances = (userData.availableAmbulances || 0) + 1;
      await updateDoc(docRef, { availableAmbulances: newAmbulances });
      setUserData(prev => ({ ...prev, availableAmbulances: newAmbulances }));
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Ambulance added successfully'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    }
  };

  const handleSubtractAmbulance = async () => {
    try {
      const user = auth.currentUser;
      const docRef = doc(db, "users", user.uid);
      const currentAmbulances = userData.availableAmbulances || 0;
      if (currentAmbulances <= 0) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Cannot reduce ambulances below 0'
        });
        return;
      }
      const newAmbulances = currentAmbulances - 1;
      await updateDoc(docRef, { availableAmbulances: newAmbulances });
      setUserData(prev => ({ ...prev, availableAmbulances: newAmbulances }));
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Ambulance removed successfully'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Welcome, {userData?.name || 'Hospital'}</Text>
      <Text style={styles.subtitle}>Hospital Dashboard</Text>
      
      {userData && (
        <View style={styles.cardsContainer}>
          <DashboardCard title="Email" value={userData.email} />
          <DashboardCard title="Phone" value={userData.phone} />
          <DashboardCard title="Address" value={userData.address} />
          <DashboardCard title="License" value={userData.license} />
          <DashboardCard title="Available Beds" value={userData.availableBeds.toString()} />
          <DashboardCard title="Available Ambulances" value={userData.availableAmbulances.toString()} />
        </View>
      )}
      
      {emergencies.length > 0 && (
        <View style={styles.emergenciesContainer}>
          <Text style={styles.emergenciesTitle}>Pending Emergency Requests</Text>
          {emergencies.map(emergency => (
            <View key={emergency.id} style={styles.emergencyCard}>
              <Text style={styles.emergencyInfo}>Type: {emergency.type}</Text>
              <Text style={styles.emergencyInfo}>Location: {emergency.location}</Text>
              <Text style={styles.emergencyInfo}>Status: {emergency.status}</Text>
              <View style={styles.buttonRow}>
                <Button 
                  title="Accept" 
                  onPress={() => handleAcceptEmergency(emergency.id)} 
                  color="#00CC00" 
                />
                <View style={styles.buttonSpacerSmall} />
                <Button 
                  title="Decline" 
                  onPress={() => handleDeclineEmergency(emergency.id)} 
                  color="#FF4444" 
                />
              </View>
            </View>
          ))}
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Add Bed" 
          onPress={handleAddBed} 
          color="#00CC00" 
        />
        <View style={styles.buttonSpacer} />
        <Button 
          title="Remove Bed" 
          onPress={handleSubtractBed} 
          color="#FF4444" 
        />
        <View style={styles.buttonSpacer} />
        <Button 
          title="Add Ambulance" 
          onPress={handleAddAmbulance} 
          color="#00CC00" 
        />
        <View style={styles.buttonSpacer} />
        <Button 
          title="Remove Ambulance" 
          onPress={handleSubtractAmbulance} 
          color="#FF4444" 
        />
        <View style={styles.buttonSpacer} />
        <Button 
          title="Logout" 
          onPress={handleLogout} 
          color="#FF3B30" 
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
  cardsContainer: {
    marginBottom: 30,
  },
  emergenciesContainer: {
    marginBottom: 20,
  },
  emergenciesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emergencyCard: {
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
  emergencyInfo: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonSpacerSmall: {
    width: 10,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  buttonSpacer: {
    height: 15,
  }
});

export default HospitalDashboard;