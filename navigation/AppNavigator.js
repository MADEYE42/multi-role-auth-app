import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import UserDashboard from '../screens/UserDashboard';
import HospitalDashboard from '../screens/HospitalDashboard';
import MechanicDashboard from '../screens/MechanicDashboard';
import MedicalEmergencyScreen from '../screens/MedicalEmergencyScreen';
import VehicleBreakdownScreen from '../screens/VehicleBreakdownScreen';
import AddMedicalInfoScreen from '../screens/AddMedicalInfoScreen';
import TermsAndConditionsScreen from '../screens/TermsAndConditionsScreen';
import MedicalEmergencyFormScreen from '../screens/MedicalEmergencyFormScreen'; // Ensure this import matches your file structure

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="UserDashboard" component={UserDashboard} />
        <Stack.Screen name="HospitalDashboard" component={HospitalDashboard} />
        <Stack.Screen name="MechanicDashboard" component={MechanicDashboard} />
        <Stack.Screen name="MedicalEmergency" component={MedicalEmergencyScreen} />
        <Stack.Screen name="VehicleBreakdown" component={VehicleBreakdownScreen} />
        <Stack.Screen name="AddMedicalInfo" component={AddMedicalInfoScreen} />
        <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
        <Stack.Screen name="MedicalEmergencyForm" component={MedicalEmergencyFormScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;