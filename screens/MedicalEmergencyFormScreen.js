import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const MedicalEmergencyFormScreen = ({ navigation, route }) => {
  const { emergencyId } = route.params;
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    gender: '',
    contactNumber: '',
    alternateContact: '',
    address: '',
    hasMedicalConditions: 'No',
    medicalConditions: '',
    onMedications: 'No',
    medications: '',
    hasAllergies: 'No',
    allergies: '',
    hadSurgeries: 'No',
    surgeries: '',
    primaryIssue: '',
    isConscious: 'Yes',
    relatedConditions: 'No',
    relatedConditionsDetails: '',
    specialAssistance: '',
    additionalSymptoms: '',
    hasInsurance: 'No',
    insurancePolicy: '',
    insuranceProvider: '',
    consent: 'Yes',
    idProofUrl: '',
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setFormData((prev) => ({
            ...prev,
            fullName: data.name || '',
            contactNumber: data.phone || '',
            hasMedicalConditions: data.medicalInfo ? 'Yes' : 'No',
            medicalConditions: data.medicalInfo?.conditions || '',
            onMedications: data.medicalInfo?.medications ? 'Yes' : 'No',
            medications: data.medicalInfo?.medications || '',
            hasAllergies: data.medicalInfo?.allergies ? 'Yes' : 'No',
            allergies: data.medicalInfo?.allergies || '',
            hadSurgeries: data.medicalInfo?.surgeries ? 'Yes' : 'No',
            surgeries: data.medicalInfo?.surgeries || '',
          }));
        }
        setLoading(false);
      } catch (error) {
        console.log('Fetch Error:', error.code, error.message);
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load user data.' });
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleSubmit = async () => {
    if (!formData.age || !formData.gender || !formData.primaryIssue) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in Age, Gender, and Primary Issue.',
      });
      return;
    }

    if (!auth.currentUser) {
      Toast.show({
        type: 'error',
        text1: 'Authentication Error',
        text2: 'User not authenticated. Please log in again.',
      });
      navigation.navigate('Login');
      return;
    }

    setSubmitting(true);
    try {
      const formId = `${emergencyId}_${auth.currentUser.uid}`;
      const formDocRef = doc(db, 'MedicalEmergencyForms', formId);
      const submissionData = {
        ...formData,
        emergencyId,
        userId: auth.currentUser.uid,
        submittedAt: new Date().toISOString(),
      };
      console.log('Authenticated User UID:', auth.currentUser.uid);
      console.log('Submitting Form with ID:', formId, 'Data:', submissionData);
      await setDoc(formDocRef, submissionData);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Form submitted successfully! Emergency ID: ' + emergencyId,
      });
      navigation.goBack();
    } catch (error) {
      console.log('Submit Error:', error.code, error.message, 'Emergency ID:', emergencyId);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Failed to submit form: ${error.message}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E63946" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#FFFFFF', '#E6F0FA']} style={styles.gradientContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#1D3557" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Medical Emergency Form</Text>
            <Text style={styles.subtitle}>Please provide the following details</Text>
          </View>
        </View>

        <View style={styles.formContainer}>
          {/* 1. Personal Information */}
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person" size={22} color="#E63946" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={formData.fullName}
              editable={false}
              placeholder="Full Name"
              placeholderTextColor="#457B9D"
            />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="calendar" size={22} color="#E63946" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={formData.age}
              onChangeText={(text) => setFormData({ ...formData, age: text })}
              placeholder="Age"
              keyboardType="numeric"
              placeholderTextColor="#457B9D"
            />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="male-female" size={22} color="#E63946" style={styles.icon} />
            <Picker
              selectedValue={formData.gender}
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
              style={styles.picker}
            >
              <Picker.Item label="Select Gender" value="" />
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="call" size={22} color="#E63946" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={formData.contactNumber}
              editable={false}
              placeholder="Contact Number"
              placeholderTextColor="#457B9D"
            />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={22} color="#E63946" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={formData.alternateContact}
              onChangeText={(text) => setFormData({ ...formData, alternateContact: text })}
              placeholder="Alternate Contact Number"
              keyboardType="phone-pad"
              placeholderTextColor="#457B9D"
            />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="location" size={22} color="#E63946" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Address"
              placeholderTextColor="#457B9D"
            />
          </View>

          {/* 2. Medical History (Skipped if uploaded) */}
          {!userData?.medicalInfo && (
            <>
              <Text style={styles.sectionTitle}>Medical History</Text>
              <View style={styles.radioGroup}>
                <Text style={styles.radioLabel}>Pre-existing Conditions?</Text>
                <TouchableOpacity onPress={() => setFormData({ ...formData, hasMedicalConditions: 'Yes' })}>
                  <Text style={formData.hasMedicalConditions === 'Yes' ? styles.radioSelected : styles.radio}>
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFormData({ ...formData, hasMedicalConditions: 'No' })}>
                  <Text style={formData.hasMedicalConditions === 'No' ? styles.radioSelected : styles.radio}>
                    No
                  </Text>
                </TouchableOpacity>
              </View>
              {formData.hasMedicalConditions === 'Yes' && (
                <View style={styles.inputWrapper}>
                  <Ionicons name="medkit" size={22} color="#E63946" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    value={formData.medicalConditions}
                    onChangeText={(text) => setFormData({ ...formData, medicalConditions: text })}
                    placeholder="Specify Conditions"
                    placeholderTextColor="#457B9D"
                  />
                </View>
              )}
              <View style={styles.radioGroup}>
                <Text style={styles.radioLabel}>On Medications?</Text>
                <TouchableOpacity onPress={() => setFormData({ ...formData, onMedications: 'Yes' })}>
                  <Text style={formData.onMedications === 'Yes' ? styles.radioSelected : styles.radio}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFormData({ ...formData, onMedications: 'No' })}>
                  <Text style={formData.onMedications === 'No' ? styles.radioSelected : styles.radio}>No</Text>
                </TouchableOpacity>
              </View>
              {formData.onMedications === 'Yes' && (
                <View style={styles.inputWrapper}>
                  <Ionicons name="pill" size={22} color="#E63946" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    value={formData.medications}
                    onChangeText={(text) => setFormData({ ...formData, medications: text })}
                    placeholder="Specify Medications"
                    placeholderTextColor="#457B9D"
                  />
                </View>
              )}
              <View style={styles.radioGroup}>
                <Text style={styles.radioLabel}>Allergies?</Text>
                <TouchableOpacity onPress={() => setFormData({ ...formData, hasAllergies: 'Yes' })}>
                  <Text style={formData.hasAllergies === 'Yes' ? styles.radioSelected : styles.radio}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFormData({ ...formData, hasAllergies: 'No' })}>
                  <Text style={formData.hasAllergies === 'No' ? styles.radioSelected : styles.radio}>No</Text>
                </TouchableOpacity>
              </View>
              {formData.hasAllergies === 'Yes' && (
                <View style={styles.inputWrapper}>
                  <Ionicons name="warning" size={22} color="#E63946" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    value={formData.allergies}
                    onChangeText={(text) => setFormData({ ...formData, allergies: text })}
                    placeholder="Specify Allergies"
                    placeholderTextColor="#457B9D"
                  />
                </View>
              )}
              <View style={styles.radioGroup}>
                <Text style={styles.radioLabel}>Past Surgeries?</Text>
                <TouchableOpacity onPress={() => setFormData({ ...formData, hadSurgeries: 'Yes' })}>
                  <Text style={formData.hadSurgeries === 'Yes' ? styles.radioSelected : styles.radio}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFormData({ ...formData, hadSurgeries: 'No' })}>
                  <Text style={formData.hadSurgeries === 'No' ? styles.radioSelected : styles.radio}>No</Text>
                </TouchableOpacity>
              </View>
              {formData.hadSurgeries === 'Yes' && (
                <View style={styles.inputWrapper}>
                  <Ionicons name="cut" size={22} color="#E63946" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    value={formData.surgeries}
                    onChangeText={(text) => setFormData({ ...formData, surgeries: text })}
                    placeholder="Specify Surgeries"
                    placeholderTextColor="#457B9D"
                  />
                </View>
              )}
            </>
          )}

          {/* 3. Emergency Details */}
          <Text style={styles.sectionTitle}>Emergency Details</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="medkit" size={22} color="#E63946" style={styles.icon} />
            <Picker
              selectedValue={formData.primaryIssue}
              onValueChange={(value) => setFormData({ ...formData, primaryIssue: value })}
              style={styles.picker}
            >
              <Picker.Item label="Select Primary Issue" value="" />
              <Picker.Item label="Cardiac Arrest" value="Cardiac Arrest" />
              <Picker.Item label="Stroke" value="Stroke" />
              <Picker.Item label="Accident" value="Accident" />
              <Picker.Item label="Trauma" value="Trauma" />
              <Picker.Item label="Respiratory Issue" value="Respiratory Issue" />
              <Picker.Item label="Severe Allergic Reaction" value="Severe Allergic Reaction" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>
          {formData.primaryIssue === 'Other' && (
            <View style={styles.inputWrapper}>
              <Ionicons name="help" size={22} color="#E63946" style={styles.icon} />
              <TextInput
                style={styles.input}
                onChangeText={(text) => setFormData({ ...formData, primaryIssue: text })}
                placeholder="Specify Other Issue"
                placeholderTextColor="#457B9D"
              />
            </View>
          )}
          <View style={styles.inputWrapper}>
            <Ionicons name="eye" size={22} color="#E63946" style={styles.icon} />
            <Picker
              selectedValue={formData.isConscious}
              onValueChange={(value) => setFormData({ ...formData, isConscious: value })}
              style={styles.picker}
            >
              <Picker.Item label="Is Conscious?" value="" />
              <Picker.Item label="Yes" value="Yes" />
              <Picker.Item label="No" value="No" />
            </Picker>
          </View>
          <View style={styles.radioGroup}>
            <Text style={styles.radioLabel}>Related Conditions?</Text>
            <TouchableOpacity onPress={() => setFormData({ ...formData, relatedConditions: 'Yes' })}>
              <Text style={formData.relatedConditions === 'Yes' ? styles.radioSelected : styles.radio}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFormData({ ...formData, relatedConditions: 'No' })}>
              <Text style={formData.relatedConditions === 'No' ? styles.radioSelected : styles.radio}>No</Text>
            </TouchableOpacity>
          </View>
          {formData.relatedConditions === 'Yes' && (
            <View style={styles.inputWrapper}>
              <Ionicons name="information" size={22} color="#E63946" style={styles.icon} />
              <TextInput
                style={styles.input}
                value={formData.relatedConditionsDetails}
                onChangeText={(text) => setFormData({ ...formData, relatedConditionsDetails: text })}
                placeholder="Specify Related Conditions"
                placeholderTextColor="#457B9D"
              />
            </View>
          )}
          <View style={styles.inputWrapper}>
            <Ionicons name="accessibility" size={22} color="#E63946" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={formData.specialAssistance}
              onChangeText={(text) => setFormData({ ...formData, specialAssistance: text })}
              placeholder="Special Assistance Needed"
              placeholderTextColor="#457B9D"
            />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="pulse" size={22} color="#E63946" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={formData.additionalSymptoms}
              onChangeText={(text) => setFormData({ ...formData, additionalSymptoms: text })}
              placeholder="Additional Symptoms"
              placeholderTextColor="#457B9D"
            />
          </View>

          {/* 4. Insurance */}
          <Text style={styles.sectionTitle}>Insurance</Text>
          <View style={styles.radioGroup}>
            <Text style={styles.radioLabel}>Medical Insurance?</Text>
            <TouchableOpacity onPress={() => setFormData({ ...formData, hasInsurance: 'Yes' })}>
              <Text style={formData.hasInsurance === 'Yes' ? styles.radioSelected : styles.radio}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFormData({ ...formData, hasInsurance: 'No' })}>
              <Text style={formData.hasInsurance === 'No' ? styles.radioSelected : styles.radio}>No</Text>
            </TouchableOpacity>
          </View>
          {formData.hasInsurance === 'Yes' && (
            <>
              <View style={styles.inputWrapper}>
                <Ionicons name="card" size={22} color="#E63946" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  value={formData.insurancePolicy}
                  onChangeText={(text) => setFormData({ ...formData, insurancePolicy: text })}
                  placeholder="Policy Number"
                  placeholderTextColor="#457B9D"
                />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="business" size={22} color="#E63946" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  value={formData.insuranceProvider}
                  onChangeText={(text) => setFormData({ ...formData, insuranceProvider: text })}
                  placeholder="Provider Name"
                  placeholderTextColor="#457B9D"
                />
              </View>
            </>
          )}

          {/* 5. Consent & Verification */}
          <Text style={styles.sectionTitle}>Consent & Verification</Text>
          <View style={styles.radioGroup}>
            <Text style={styles.radioLabel}>Consent for Medical Records?</Text>
            <TouchableOpacity onPress={() => setFormData({ ...formData, consent: 'Yes' })}>
              <Text style={formData.consent === 'Yes' ? styles.radioSelected : styles.radio}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFormData({ ...formData, consent: 'No' })}>
              <Text style={formData.consent === 'No' ? styles.radioSelected : styles.radio}>No</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="document" size={22} color="#E63946" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={formData.idProofUrl}
              onChangeText={(text) => setFormData({ ...formData, idProofUrl: text })}
              placeholder="ID Proof URL (Temporary)"
              placeholderTextColor="#457B9D"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>SUBMIT FORM</Text>
            )}
          </TouchableOpacity>
        </View>
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
  backButton: { marginRight: 15 },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 26, fontWeight: '700', color: '#1D3557', letterSpacing: 0.3 },
  subtitle: { fontSize: 14, color: '#457B9D', fontWeight: '500', marginTop: 2 },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1D3557', marginBottom: 15, marginTop: 10 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1D3557',
    paddingVertical: 5,
  },
  picker: { flex: 1, height: 50, color: '#1D3557' },
  icon: { marginRight: 12 },
  radioGroup: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  radioLabel: { fontSize: 16, color: '#1D3557', flex: 1 },
  radio: { fontSize: 16, color: '#1D3557', marginHorizontal: 10 },
  radioSelected: { fontSize: 16, color: '#E63946', fontWeight: '600', marginHorizontal: 10 },
  submitButton: {
    backgroundColor: '#E63946',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 20,
  },
  disabledButton: { backgroundColor: '#E6A8A8', shadowOpacity: 0 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default MedicalEmergencyFormScreen;