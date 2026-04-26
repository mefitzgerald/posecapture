import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCameraPermission } from 'react-native-vision-camera';
import * as MediaLibrary from 'expo-media-library';

type LandingScreenProps = {
  onContinue: () => void;
};

export default function LandingScreen({ onContinue }: LandingScreenProps) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [requesting, setRequesting] = useState(false);

  const handleStart = useCallback(async () => {
    if (requesting) return;

    setRequesting(true);
    try {
      const cameraGranted = hasPermission || (await requestPermission());
      if (!cameraGranted) {
        Alert.alert('Permission required', 'Camera access is needed to continue.');
        return;
      }

      // Ask media-library permission up-front so Save works without a second prompt.
      if (!mediaPermission?.granted) {
        await requestMediaPermission();
      }

      onContinue();
    } catch (error: any) {
      Alert.alert('Permission error', error?.message ?? 'Could not request permissions.');
    } finally {
      setRequesting(false);
    }
  }, [hasPermission, mediaPermission?.granted, onContinue, requestMediaPermission, requestPermission, requesting]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pose Capture</Text>
      <Text style={styles.subtitle}>
        Expo ML Kit Demo
      </Text>

      <TouchableOpacity
        style={[styles.button, requesting && styles.buttonDisabled]}
        onPress={handleStart}
        disabled={requesting}
      >
        {requesting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Start Camera</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0A1F44',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#42526B',
    textAlign: 'center',
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 180,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
