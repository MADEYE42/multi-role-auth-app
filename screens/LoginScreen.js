import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
  CheckBox, // Note: React Native doesn't have a built-in CheckBox, see below
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore'; // Added updateDoc
import { auth, db } from '../firebase/firebaseConfig';
import AuthForm from '../components/AuthForm';
import Toast from 'react-native-toast-message';

const LoginScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false); // Checkbox state
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 800,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, slideAnim]);

  const handleLogin = async ({ email, password }) => {
    if (!termsAccepted) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please accept the Terms and Conditions to proceed.',
      });
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error('User data not found in database');
      }

      const userData = userDoc.data();

      // Update termsAccepted in Firestore only if not already true
      if (!userData.termsAccepted) {
        await updateDoc(userDocRef, {
          termsAccepted: true,
          termsAcceptedAt: new Date().toISOString(),
        });
      }

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Logged in successfully!',
      });

      switch (userData.role) {
        case 'user':
          navigation.replace('UserDashboard');
          break;
        case 'hospital':
          navigation.replace('HospitalDashboard');
          break;
        case 'mechanic':
          navigation.replace('MechanicDashboard');
          break;
        default:
          throw new Error('Invalid role');
      }
    } catch (error) {
      console.log('Login Error:', error.code || error.name, error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentContainer}>
          <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>Access your emergency network</Text>

            <View style={styles.formContainer}>
              <AuthForm onSubmit={handleLogin} isRegister={false} loading={loading} />
            </View>

            {/* Terms and Conditions Checkbox and Link */}
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setTermsAccepted(!termsAccepted)}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.termsText}>I agree to the </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('TermsAndConditions', { role: 'user' })}>
                <Text style={styles.termsLink}>Terms and Conditions</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.View style={[styles.linksContainer, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>

            <View style={styles.signupPrompt}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[styles.linkText, styles.signupLink]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 150,
    height: 150,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D3557',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#457B9D',
    marginBottom: 24,
  },
  formContainer: {
    marginBottom: 16,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#E63946',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#E63946',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 14,
    color: '#1D3557',
  },
  termsLink: {
    fontSize: 14,
    color: '#E63946',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  linksContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#E63946',
    fontSize: 14,
    fontWeight: '500',
  },
  signupPrompt: {
    flexDirection: 'row',
    marginTop: 16,
  },
  signupText: {
    color: '#457B9D',
    fontSize: 14,
  },
  signupLink: {
    fontWeight: '600',
  },
});

export default LoginScreen;