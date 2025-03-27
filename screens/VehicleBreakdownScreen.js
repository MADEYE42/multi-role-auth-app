import React from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';

const VehicleBreakdownScreen = ({ navigation }) => {
  const handleBack = () => {
    navigation.navigate('UserDashboard');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Vehicle Breakdown Emergency</Text>
      <Text style={styles.subtitle}>Contact roadside assistance or nearby mechanics</Text>
      
      <View style={styles.content}>
        <Text style={styles.info}>Emergency Number: 911</Text>
        <Text style={styles.info}>Instructions:</Text>
        <Text style={styles.info}>- Stay safe, pull over if possible</Text>
        <Text style={styles.info}>- Provide your location</Text>
        <Text style={styles.info}>- Describe the vehicle issue</Text>
      </View>
      
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
  content: {
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
  info: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  buttonContainer: {
    marginBottom: 20,
  }
});

export default VehicleBreakdownScreen;