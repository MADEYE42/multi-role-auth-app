import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const AuthForm = ({ onSubmit, isRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [details, setDetails] = useState({
    name: '',
    phone: '',
    address: '',
    aadhaar: '',
    license: ''
  });

  const handleSubmit = () => {
    if (isRegister) {
      onSubmit({ email, password, role, ...details });
    } else {
      onSubmit({ email, password });
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        placeholderTextColor="#666"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#666"
      />
      {isRegister && (
        <>
          <Picker
            selectedValue={role}
            style={styles.picker}
            onValueChange={(itemValue) => setRole(itemValue)}
          >
            <Picker.Item label="User" value="user" />
            <Picker.Item label="Hospital" value="hospital" />
            <Picker.Item label="Mechanic" value="mechanic" />
          </Picker>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={details.name}
            onChangeText={(text) => setDetails(prev => ({ ...prev, name: text }))}
            placeholderTextColor="#666"
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={details.phone}
            onChangeText={(text) => setDetails(prev => ({ ...prev, phone: text }))}
            keyboardType="phone-pad"
            placeholderTextColor="#666"
          />
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={details.address}
            onChangeText={(text) => setDetails(prev => ({ ...prev, address: text }))}
            placeholderTextColor="#666"
          />
          {(role === 'user' || role === 'mechanic') && (
            <TextInput
              style={styles.input}
              placeholder="Aadhaar Number"
              value={details.aadhaar}
              onChangeText={(text) => setDetails(prev => ({ ...prev, aadhaar: text }))}
              keyboardType="numeric"
              placeholderTextColor="#666"
            />
          )}
          {role === 'hospital' && (
            <TextInput
              style={styles.input}
              placeholder="License Number"
              value={details.license}
              onChangeText={(text) => setDetails(prev => ({ ...prev, license: text }))}
              placeholderTextColor="#666"
            />
          )}
        </>
      )}
      <Button 
        title={isRegister ? "Register" : "Login"} 
        onPress={handleSubmit}
        color="#007AFF"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    margin: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  picker: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  }
});

export default AuthForm;