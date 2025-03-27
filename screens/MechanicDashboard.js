import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import DashboardCard from '../components/DashboardCard';
import Toast from 'react-native-toast-message';

const MechanicDashboard = ({ navigation }) => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Ensure employees field exists, default to 0 if not present
            setUserData({ ...data, employees: data.employees || 0 });
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

  const handleAddEmployee = async () => {
    try {
      const user = auth.currentUser;
      const docRef = doc(db, "users", user.uid);
      const newEmployees = (userData.employees || 0) + 1;
      await updateDoc(docRef, { employees: newEmployees });
      setUserData(prev => ({ ...prev, employees: newEmployees }));
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Employee added successfully'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    }
  };

  const handleSubtractEmployee = async () => {
    try {
      const user = auth.currentUser;
      const docRef = doc(db, "users", user.uid);
      const currentEmployees = userData.employees || 0;
      if (currentEmployees <= 0) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Cannot reduce employees below 0'
        });
        return;
      }
      const newEmployees = currentEmployees - 1;
      await updateDoc(docRef, { employees: newEmployees });
      setUserData(prev => ({ ...prev, employees: newEmployees }));
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Employee removed successfully'
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
      <Text style={styles.title}>Welcome, {userData?.name || 'Mechanic'}</Text>
      <Text style={styles.subtitle}>Mechanic Dashboard</Text>
      
      {userData && (
        <View style={styles.cardsContainer}>
          <DashboardCard title="Email" value={userData.email} />
          <DashboardCard title="Phone" value={userData.phone} />
          <DashboardCard title="Address" value={userData.address} />
          <DashboardCard title="Aadhaar" value={userData.aadhaar} />
          <DashboardCard title="Employees" value={userData.employees.toString()} />
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Add Employee" 
          onPress={handleAddEmployee} 
          color="#00CC00" 
        />
        <View style={styles.buttonSpacer} />
        <Button 
          title="Remove Employee" 
          onPress={handleSubtractEmployee} 
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
  buttonContainer: {
    marginBottom: 20,
  },
  buttonSpacer: {
    height: 15,
  }
});

export default MechanicDashboard;