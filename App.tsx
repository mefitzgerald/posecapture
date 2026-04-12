/**
 * App.tsx — Entry point
 *
 * Renders the status bar and the single screen of this app.
 * The app has no navigation stack — PoseCameraScreen is the whole app.
 */
import { StatusBar } from 'expo-status-bar';
import PoseCameraScreen from './screens/PoseCameraScreen';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <PoseCameraScreen />
    </>
  );
}
