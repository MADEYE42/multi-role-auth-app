import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons'; // For icons
import * as DocumentPicker from 'expo-document-picker'; // For picking files
import axios from 'axios'; // For Cloudinary upload

const AddMedicalInfoScreen = ({ navigation }) => {
  const [certificate, setCertificate] = useState(null); // Store the selected file
  const [medicalConditions, setMedicalConditions] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pick a certificate (image or PDF)
  const pickCertificate = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'], // Allow images and PDFs
      copyToCacheDirectory: true,
    });

    if (result.type !== 'cancel') {
      setCertificate({
        uri: result.uri,
        name: result.name,
      });
      console.log('Certificate Selected:', result); // Debug log
    } else {
      console.log('Certificate selection cancelled');
    }
  };

  // Upload the certificate to Cloudinary
  const uploadToCloudinary = async (file) => {
    setUploading(true);
    const formData = new FormData();

    // Determine the file type
    let fileType = 'application/octet-stream'; // Default fallback
    const fileName = file.name || file.uri.split('/').pop();
    const fileExtension = fileName.split('.').pop().toLowerCase();

    if (fileExtension === 'pdf') {
      fileType = 'application/pdf';
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
      fileType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
    }

    formData.append('file', {
      uri: file.uri,
      type: fileType,
      name: fileName,
    });
    formData.append('upload_preset', 'unsigned_upload');
    formData.append('api_key', '716922125171436');

    try {
      const response = await axios.post('https://api.cloudinary.com/v1_1/dmjtkwal5/auto/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Cloudinary Upload Success:', response.data); // Debug log
      return response.data.secure_url; // Return the URL of the uploaded file
    } catch (error) {
      console.log('Cloudinary Upload Error:', error.response?.data || error.message);
      Toast.show({
        type: 'error',
        text1: 'Upload Error',
        text2: 'Failed to upload certificate. Please try again.'
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!medicalConditions.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter your medical conditions.'
      });
      return;
    }

    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found.');
      }

      let certificateUrl = null;
      if (certificate) {
        certificateUrl = await uploadToCloudinary(certificate);
        if (!certificateUrl) {
          Toast.show({
            type: 'info',
            text1: 'Upload Skipped',
            text2: 'Certificate upload failed. Proceeding without certificate.'
          });
        }
      }

      const userDocRef = doc(db, 'users', user.uid);
      const updateData = {
        medicalConditions: medicalConditions.trim(),
        medicalCertificate: certificateUrl || null,
        updatedAt: new Date().toISOString(),
      };
      console.log('Updating Firestore with:', updateData); // Debug log
      await updateDoc(userDocRef, updateData);

      console.log('Firestore Update Success'); // Debug log
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Medical information added successfully!'
      });
      navigation.goBack();
    } catch (error) {
      console.log('Firestore Error:', error.code || error.name, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to add medical information.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back-outline" size={28} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Medical Information</Text>
      </View>
      <Text style={styles.subtitle}>Provide your medical details</Text>

      {/* Input Section */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <Ionicons name="medkit-outline" size={20} color="#666" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Medical Conditions (e.g., Asthma, Diabetes)"
            value={medicalConditions}
            onChangeText={setMedicalConditions}
            placeholderTextColor="#666"
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.disabledButton]}
          onPress={pickCertificate}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.uploadButtonText}>
              {certificate ? 'Certificate Selected' : 'Upload Certificate (Image/PDF)'}
            </Text>
          )}
        </TouchableOpacity>

        {certificate && (
          <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="tail">
            Selected File: {certificate.name}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting || uploading}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5E6CC', // Beige background
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000', // Black text
    marginLeft: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFBB33', // Medium yellow
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF', // White card background
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 10,
    minHeight: 100, // Allow multiline input
    textAlignVertical: 'top',
  },
  icon: {
    marginRight: 10,
  },
  uploadButton: {
    backgroundColor: '#FFBB33', // Yellow button for upload
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fileName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#00CC00', // Green button for submit
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#999999', // Gray when disabled
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddMedicalInfoScreen;