/**
 * App.tsx — Entry point
 *
 * Renders a simple 2-step flow:
 *   1) Landing screen requests permissions
 *   2) Pose camera screen opens only after permission is granted
 */
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import LandingScreen from './screens/LandingScreen';
import PoseCameraScreen from './screens/PoseCameraScreen';

export default function App() {
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  return (
    <>
      <StatusBar style={isCameraOpen ? 'light' : 'dark'} />
      {isCameraOpen ? (
        <PoseCameraScreen onBack={() => setIsCameraOpen(false)} />
      ) : (
        <LandingScreen onContinue={() => setIsCameraOpen(true)} />
      )}
    </>
  );
}
