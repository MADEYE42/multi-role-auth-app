import React, { useState, useEffect } from 'react'; // Add useEffect
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

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

  // Sync address state with initialAddress when it changes
  useEffect(() => {
    setAddress(initialAddress || '');
  }, [initialAddress]);

  const handleSubmit = () => {
    if (isRegister && password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Passwords do not match.',
      });
      return;
    }

    if (isRegister && !termsAccepted) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please agree to the terms and conditions.',
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
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#457B9D" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#8A8A8A"
            value={name}
            onChangeText={setName}
          />
        </View>
      )}

      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#457B9D" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#8A8A8A"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {isRegister && (
        <>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#457B9D" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#8A8A8A"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color="#457B9D" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Address"
              placeholderTextColor="#8A8A8A"
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <View style={[styles.inputContainer, styles.pickerContainer]}>
            <Ionicons name="people-outline" size={20} color="#457B9D" style={styles.inputIcon} />
            <Picker
              selectedValue={role}
              style={styles.picker}
              onValueChange={(itemValue) => setRole(itemValue)}
              dropdownIconColor="#457B9D"
            >
              <Picker.Item label="User" value="user" />
              <Picker.Item label="Hospital" value="hospital" />
              <Picker.Item label="Mechanic" value="mechanic" />
            </Picker>
          </View>

          {(role === 'user' || role === 'mechanic') && (
            <View style={styles.inputContainer}>
              <Ionicons name="card-outline" size={20} color="#457B9D" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Aadhaar Number"
                placeholderTextColor="#8A8A8A"
                value={aadhaar}
                onChangeText={setAadhaar}
                keyboardType="numeric"
              />
            </View>
          )}

          {role === 'hospital' && (
            <View style={styles.inputContainer}>
              <Ionicons name="document-outline" size={20} color="#457B9D" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="License Number"
                placeholderTextColor="#8A8A8A"
                value={license}
                onChangeText={setLicense}
              />
            </View>
          )}
        </>
      )}

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#457B9D" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#8A8A8A"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#457B9D"
          />
        </TouchableOpacity>
      </View>

      {isRegister && (
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#457B9D" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#8A8A8A"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#457B9D"
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
            <Ionicons
              name={termsAccepted ? 'checkbox' : 'square-outline'}
              size={24}
              color={termsAccepted ? '#E63946' : '#457B9D'}
            />
          </TouchableOpacity>
          <Text style={styles.termsText}>I agree to the </Text>
          <TouchableOpacity>
            <Text style={styles.termsLink}>Terms and Conditions</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>
            {isRegister ? 'CREATE ACCOUNT' : 'SIGN IN'}
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1D3557',
    paddingVertical: 15,
  },
  pickerContainer: {
    paddingHorizontal: 5,
  },
  picker: {
    flex: 1,
    color: '#1D3557',
    height: 50,
  },
  eyeIcon: {
    padding: 10,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  checkbox: {
    marginRight: 8,
  },
  termsText: {
    fontSize: 14,
    color: '#457B9D',
  },
  termsLink: {
    fontSize: 14,
    color: '#E63946',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#E63946',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#B0B0B0',
    shadowColor: 'transparent',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AuthForm;