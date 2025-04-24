import React from 'react';
import AppNavigator from './navigation/AppNavigator';
import Toast, { BaseToast } from 'react-native-toast-message';

// Toast configuration
const toastConfig = {
  warning: ({ text1, text2, ...rest }) => (
    <BaseToast
      {...rest}
      style={{ borderLeftColor: '#FFA500', backgroundColor: '#FFF3CD' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: '600', color: '#856404' }}
      text2Style={{ fontSize: 14, color: '#856404' }}
      text1={text1}
      text2={text2}
    />
  ),
  success: ({ text1, text2, ...rest }) => (
    <BaseToast
      {...rest}
      style={{ borderLeftColor: '#28A745', backgroundColor: '#D4EDDA' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: '600', color: '#155724' }}
      text2Style={{ fontSize: 14, color: '#155724' }}
      text1={text1}
      text2={text2}
    />
  ),
  error: ({ text1, text2, ...rest }) => (
    <BaseToast
      {...rest}
      style={{ borderLeftColor: '#DC3545', backgroundColor: '#F8D7DA' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: '600', color: '#721C24' }}
      text2Style={{ fontSize: 14, color: '#721C24' }}
      text1={text1}
      text2={text2}
    />
  ),
  info: ({ text1, text2, ...rest }) => (
    <BaseToast
      {...rest}
      style={{ borderLeftColor: '#17A2B8', backgroundColor: '#D1ECF1' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: '600', color: '#0C5460' }}
      text2Style={{ fontSize: 14, color: '#0C5460' }}
      text1={text1}
      text2={text2}
    />
  ),
};

export default function App() {
  return (
    <>
      <AppNavigator />
      <Toast config={toastConfig} />
    </>
  );
}