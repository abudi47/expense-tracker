import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export async function getBiometricSupport() {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  const hasFingerprint = types.includes(
    LocalAuthentication.AuthenticationType.FINGERPRINT
  );
  const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);

  let label = 'Biometrics';
  if (Platform.OS === 'ios' && hasFace) label = 'Face ID';
  else if (hasFingerprint) label = 'Fingerprint';
  else if (hasFace) label = 'Face Unlock';

  return {
    available: compatible && enrolled,
    label,
  };
}

export async function authenticateWithBiometric(prompt: string) {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
    fallbackLabel: 'Use passcode',
  });
  return result.success;
}
