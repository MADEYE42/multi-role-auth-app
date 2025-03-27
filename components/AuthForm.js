import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Import Picker from the new package
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message'; // Ensure Toast is imported

const AuthForm = ({ onSubmit, isRegister, loading, initialAddress }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState(initialAddress || '');
  const [role, setRole] = useState('user');
  const [aadhaar, setAadhaar] = useState('');
  const [license, setLicense] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = () => {
    if (isRegister && password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Passwords do not match.'
      });
      return;
    }

    if (isRegister && !termsAccepted) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please agree to the terms and conditions.'
      });
      return;
    }

    onSubmit({
      email,
      password,
      role,
      name,
      phone,
      address,
      aadhaar,
      license,
    });
  };

  return (
    <View style={styles.container}>
      {isRegister && (
        <>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999999"
            />
          </View>
        </>
      )}

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#999999"
        />
      </View>

      {isRegister && (
        <>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#999999"
            />
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Address"
              value={address}
              onChangeText={setAddress}
              placeholderTextColor="#999999"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Picker
              selectedValue={role}
              style={styles.picker}
              onValueChange={(itemValue) => setRole(itemValue)}
            >
              <Picker.Item label="User" value="user" />
              <Picker.Item label="Hospital" value="hospital" />
              <Picker.Item label="Mechanic" value="mechanic" />
            </Picker>
          </View>

          {(role === 'user' || role === 'mechanic') && (
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Aadhaar Number"
                value={aadhaar}
                onChangeText={setAadhaar}
                keyboardType="numeric"
                placeholderTextColor="#999999"
              />
            </View>
          )}

          {role === 'hospital' && (
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="License Number"
                value={license}
                onChangeText={setLicense}
                placeholderTextColor="#999999"
              />
            </View>
          )}
        </>
      )}

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          placeholderTextColor="#999999"
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#999999"
          />
        </TouchableOpacity>
      </View>

      {isRegister && (
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            placeholderTextColor="#999999"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#999999"
            />
          </TouchableOpacity>
        </View>
      )}

      {isRegister && (
        <View style={styles.termsContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setTermsAccepted(!termsAccepted)}
          >
            {termsAccepted ? (
              <Ionicons name="checkbox-outline" size={24} color="#FFFFFF" />
            ) : (
              <Ionicons name="square-outline" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          <Text style={styles.termsText}>Agree to terms and conditions</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#000000" />
        ) : (
          <Text style={styles.submitButtonText}>
            {isRegister ? 'SIGN UP' : 'SIGN IN'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5', // Light gray background for inputs
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 15,
  },
  picker: {
    flex: 1,
    color: '#000000',
    paddingVertical: 15,
  },
  eyeIcon: {
    padding: 10,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 10,
  },
  termsText: {
    fontSize: 14,
    color: '#FFFFFF', // White text
  },
  submitButton: {
    backgroundColor: '#E0E0E0', // Light gray button background
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#B0B0B0', // Darker gray when disabled
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000', // Black text
  },
});

export default AuthForm;