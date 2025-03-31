import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const AddMedicalInfoScreen = ({ navigation }) => {
  const [certificate, setCertificate] = useState(null);
  const [medicalConditions, setMedicalConditions] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickCertificate = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });

    if (result.type !== 'cancel') {
      setCertificate({
        uri: result.uri,
        name: result.name,
      });
      console.log('Certificate Selected:', result);
    } else {
      console.log('Certificate selection cancelled');
    }
  };

  const uploadToCloudinary = async (file) => {
    setUploading(true);
    const formData = new FormData();

    let fileType = 'application/octet-stream';
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
      console.log('Cloudinary Upload Success:', response.data);
      return response.data.secure_url;
    } catch (error) {
      console.log('Cloudinary Upload Error:', error.response?.data || error.message);
      Toast.show({
        type: 'error',
        text1: 'Upload Error',
        text2: 'Failed to upload certificate.',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!medicalConditions.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter your medical conditions.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user found.');

      let certificateUrl = null;
      if (certificate) {
        certificateUrl = await uploadToCloudinary(certificate);
        if (!certificateUrl) {
          Toast.show({
            type: 'info',
            text1: 'Upload Skipped',
            text2: 'Certificate upload failed. Proceeding without it.',
          });
        }
      }

      const userDocRef = doc(db, 'users', user.uid);
      const updateData = {
        medicalConditions: medicalConditions.trim(),
        medicalCertificate: certificateUrl || null,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(userDocRef, updateData);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Medical information added successfully!',
      });
      navigation.goBack();
    } catch (error) {
      console.log('Firestore Error:', error.code || error.name, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to add medical information.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#E6F0FA']} // White to light blue gradient
      style={styles.gradientContainer}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#1D3557" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Add Medical Info</Text>
            <Text style={styles.subtitle}>Update Your Medical Details</Text>
          </View>
        </View>

        {/* Input Section */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="medkit" size={22} color="#E63946" style={styles.icon} />
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Medical Conditions (e.g., Asthma)"
              value={medicalConditions}
              onChangeText={setMedicalConditions}
              placeholderTextColor="#457B9D"
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
                {certificate ? 'Certificate Selected' : 'UPLOAD CERTIFICATE'}
              </Text>
            )}
          </TouchableOpacity>

          {certificate && (
            <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="tail">
              File: {certificate.name}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.submitButton, (submitting || uploading) && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={submitting || uploading}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>SUBMIT</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
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
  backButton: {
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1D3557',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#457B9D',
    fontWeight: '500',
    marginTop: 2,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1D3557',
    paddingVertical: 5,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  icon: {
    marginRight: 12,
  },
  uploadButton: {
    backgroundColor: '#2A9D8F',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2A9D8F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 15,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fileName: {
    fontSize: 14,
    color: '#457B9D',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
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
  },
  disabledButton: {
    backgroundColor: '#A3BFFA',
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

export default AddMedicalInfoScreen;