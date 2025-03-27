import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import DashboardCard from '../components/DashboardCard';
import Toast from 'react-native-toast-message';

const UserDashboard = ({ navigation }) => {
  const [userData, setUserData] = useState(null);

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
              text2: 'User data not found'
            });
          }
        } catch (error) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: error.message
          });
        }
      }
    };
    fetchUserData();
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

  const handleMedicalEmergency = () => {
    navigation.navigate('MedicalEmergency');
  };

  const handleVehicleBreakdown = () => {
    navigation.navigate('VehicleBreakdown');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Welcome, {userData?.name || 'User'}</Text>
      <Text style={styles.subtitle}>Your Dashboard</Text>
      
      {userData && (
        <View style={styles.cardsContainer}>
          <DashboardCard title="Email" value={userData.email} />
          <DashboardCard title="Phone" value={userData.phone} />
          <DashboardCard title="Address" value={userData.address} />
          <DashboardCard title="Aadhaar" value={userData.aadhaar} />
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Medical Emergency" 
          onPress={handleMedicalEmergency} 
          color="#FF4444" 
        />
        <View style={styles.buttonSpacer} />
        <Button 
          title="Vehicle Breakdown Emergency" 
          onPress={handleVehicleBreakdown} 
          color="#FFBB33" 
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
  buttonContainer: {
    marginBottom: 20,
  },
  buttonSpacer: {
    height: 15,
  }
});

export default UserDashboard;