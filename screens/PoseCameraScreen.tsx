/**
 * PoseCameraScreen.tsx — Main screen of the pose capture app.
 *
 * Flow:
 *   1. CAMERA MODE  — Live camera preview. Tap "Detect" to capture a photo and
 *                     run ML Kit pose detection on it.
 *   2. PREVIEW MODE — Shows the captured photo with the skeleton overlay drawn
 *                     on top. Tap "Save" to write the composite image to the
 *                     device gallery, or "Back" to return to the camera.
 *
 * The skeleton overlay is an SVG layer rendered over the photo. Landmark
 * coordinates from ML Kit are in image-pixel space, so they are scaled to
 * screen space using a "cover" transform that matches how the camera preview
 * fills the screen.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import * as MediaLibrary from 'expo-media-library';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { PoseDetection, POSE_CONNECTIONS, getPoseAngles } from '../modules/expo-pose-detection';
import type { PoseLandmark } from '../modules/expo-pose-detection';

// Seed the layout state with screen dimensions so scaling works before
// the first onLayout event fires.
const SCREEN = Dimensions.get('window');

type Mode = 'camera' | 'preview';

type PoseCameraScreenProps = {
  onBack?: () => void;
};

export default function PoseCameraScreen({ onBack }: PoseCameraScreenProps) {
  // Media library permissions (saving)
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  // Use the back camera for this flow.
  const device = useCameraDevice('back');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Refs to the Camera and ViewShot components so we can call methods on them
  const cameraRef = useRef<Camera>(null);
  const viewShotRef = useRef<ViewShot>(null);

  // App state
  const [mode, setMode] = useState<Mode>('camera');
  const [photoUri, setPhotoUri] = useState<string>('');
  const [landmarks, setLandmarks] = useState<PoseLandmark[]>([]);
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [viewLayout, setViewLayout] = useState({ width: SCREEN.width, height: SCREEN.height });
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCameraError = useCallback((error: any) => {
    const isRestricted = error?.code === 'system/camera-is-restricted';
    const message = isRestricted
      ? 'Camera is currently restricted by the operating system. Close other camera apps or check device policy, then retry.'
      : (error?.message ?? 'Camera error');

    setCameraError(message);
  }, []);

  /**
   * Captures a still photo and runs ML Kit pose detection on it.
   * On success, transitions to preview mode with the photo and landmarks set.
   */
  const handleDetect = useCallback(async () => {
    if (!cameraRef.current || detecting) return;
    setDetecting(true);
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });

      // vision-camera returns a bare file path on Android — ensure it has the
      // file:// scheme so Android APIs (ML Kit, Image component) can load it.
      const uri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;

      const results = await PoseDetection.detectPose(uri);
      console.log('Joint angles:', getPoseAngles(results));

      setPhotoUri(uri);
      setImageSize({ width: photo.width, height: photo.height });
      setLandmarks(results);
      setMode('preview');
    } catch (e: any) {
      Alert.alert('Detection failed', e?.message ?? 'Unknown error');
    } finally {
      setDetecting(false);
    }
  }, [detecting]);

  /**
   * Captures the preview ViewShot (photo + SVG skeleton) as a single JPEG
   * and saves it to the device media library.
   */
  const handleSave = async () => {
    if (!viewShotRef.current || saving) return;
    if (!mediaPermission?.granted) await requestMediaPermission();
    setSaving(true);
    try {
      const uri = await (viewShotRef.current as any).capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'Image saved to your gallery.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save image.');
    } finally {
      setSaving(false);
    }
  };

  // Track the rendered size of the root view so the overlay scales correctly.
  const onViewLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewLayout({ width, height });
  };

  // ── Landmark scaling ────────────────────────────────────────────────────────
  //
  // ML Kit reads EXIF rotation and returns landmarks in the visually-correct
  // (portrait) image space. However, the raw photo dimensions from vision-camera
  // on Android may still be landscape (width > height from the sensor), so we
  // swap them to get the effective portrait dimensions.
  //
  // We then apply a "cover" scale — the same transform the camera preview uses
  // to fill the screen — so that landmark positions align with what the user
  // sees in both the live preview and the static photo.
  const isLandscape = imageSize.width > imageSize.height;
  const effectiveW = isLandscape ? imageSize.height : imageSize.width;
  const effectiveH = isLandscape ? imageSize.width : imageSize.height;

  const viewW = viewLayout.width;
  const viewH = viewLayout.height;

  // Scale factor that makes the image fill the full view (cover behaviour)
  const coverScale = Math.max(viewW / effectiveW, viewH / effectiveH);

  // How many pixels of the image are cropped from each side after scaling
  const cropOffsetX = (effectiveW * coverScale - viewW) / 2;
  const cropOffsetY = (effectiveH * coverScale - viewH) / 2;

  const scaleX = (x: number) => x * coverScale - cropOffsetX;
  const scaleY = (y: number) => y * coverScale - cropOffsetY;

  // Only render landmarks the model is confident are visible in the frame
  const visibleLandmarks = landmarks.filter(lm => lm.inFrameLikelihood > 0.5);
  const landmarkMap = new Map(visibleLandmarks.map(lm => [lm.type, lm]));

  // Map landmark type index → angle value for joints that have an angle
  const poseAngles = getPoseAngles(landmarks);
  const angleAtJoint = new Map<number, number>([
    [11, poseAngles?.leftShoulder],
    [12, poseAngles?.rightShoulder],
    [13, poseAngles?.leftElbow],
    [14, poseAngles?.rightElbow],
    [23, poseAngles?.leftHip],
    [24, poseAngles?.rightHip],
    [25, poseAngles?.leftKnee],
    [26, poseAngles?.rightKnee],
    [27, poseAngles?.leftAnkle],
    [28, poseAngles?.rightAnkle],
  ].filter((entry): entry is [number, number] => entry[1] !== undefined));

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>No camera device found.</Text>
      </View>
    );
  }

  if (cameraError) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{cameraError}</Text>
        <View style={styles.errorActions}>
          <TouchableOpacity style={styles.btn} onPress={() => setCameraError(null)}>
            <Text style={styles.btnText}>Retry</Text>
          </TouchableOpacity>
          {onBack && (
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={onBack}>
              <Text style={styles.btnText}>Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const isPreview = mode === 'preview';

  return (
    <View style={styles.container} onLayout={onViewLayout}>

      {/*
        Camera is always mounted so vision-camera can release the hardware
        gracefully. isActive=false pauses the feed without unmounting.
      */}
      <Camera
        ref={cameraRef}
        style={[styles.camera, isPreview && styles.hidden]}
        device={device}
        isActive={!isPreview}
        photo={true}
        onError={handleCameraError}
      />

      {/* Preview: captured photo with SVG skeleton drawn on top */}
      {isPreview && (
        <ViewShot
          ref={viewShotRef}
          style={{ width: viewW, height: viewH }}
          options={{ format: 'jpg', quality: 0.95 }}
        >
          <Image
            source={{ uri: photoUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />

          {/* SVG overlay — red lines for bones, cyan dots for joints */}
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            {POSE_CONNECTIONS.map(([a, b], i) => {
              const lmA = landmarkMap.get(a);
              const lmB = landmarkMap.get(b);
              if (!lmA || !lmB) return null;
              return (
                <Line
                  key={`line-${i}`}
                  x1={scaleX(lmA.x)} y1={scaleY(lmA.y)}
                  x2={scaleX(lmB.x)} y2={scaleY(lmB.y)}
                  stroke="#FF3D00"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              );
            })}
            {visibleLandmarks.map(lm => (
              <Circle
                key={`dot-${lm.type}`}
                cx={scaleX(lm.x)}
                cy={scaleY(lm.y)}
                r={6}
                fill="#00E5FF"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            ))}
            {visibleLandmarks.map(lm => {
              const angle = angleAtJoint.get(lm.type);
              if (angle === undefined) return null;
              return (
                <SvgText
                  key={`angle-${lm.type}`}
                  x={scaleX(lm.x) + 8}
                  y={scaleY(lm.y) - 8}
                  fontSize={12}
                  fontWeight="bold"
                  fill="#FFFF00"
                  stroke="#000000"
                  strokeWidth={0.5}
                >
                  {Math.round(angle)}°
                </SvgText>
              );
            })}
          </Svg>
        </ViewShot>
      )}

      {/* Control bar — buttons swap depending on current mode */}
      <View style={styles.controls}>
        {isPreview ? (
          <>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setMode('camera')}>
              <Text style={styles.iconText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.saveBtn, saving && styles.actionBtnBusy]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.actionBtnText}>Save</Text>}
            </TouchableOpacity>
            {visibleLandmarks.length > 0 ? (
              <View style={styles.iconBtn}>
                <Text style={styles.badgeText}>{visibleLandmarks.length} pts</Text>
              </View>
            ) : (
              <View style={styles.iconBtnSpacer} />
            )}
          </>
        ) : (
          <>
            {onBack ? (
              <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
                <Text style={styles.iconText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.iconBtnSpacer} />
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.detectBtn, detecting && styles.actionBtnBusy]}
              onPress={handleDetect}
              disabled={detecting}
            >
              {detecting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.actionBtnText}>Detect</Text>}
            </TouchableOpacity>
            {/* Spacer keeps the Detect button centred */}
            <View style={styles.iconBtnSpacer} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera:    { flex: 1 },
  // Hides the camera view without unmounting it
  hidden:    { display: 'none' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message:   { fontSize: 16, textAlign: 'center', marginBottom: 16 },
  errorActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
  },

  // Primary action buttons (Detect / Save)
  actionBtn:     { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  detectBtn:     { backgroundColor: '#00E5FF' },
  saveBtn:       { backgroundColor: '#00C853' },
  actionBtnBusy: { opacity: 0.5 },
  actionBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Small circular buttons (Flip / Back / badge)
  iconBtn:   { width: 56, height: 56, borderRadius: 28, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center' },
  iconBtnSpacer: { width: 56, height: 56 },
  iconText:  { color: '#fff', fontSize: 12, fontWeight: '600' },
  badgeText: { color: '#00E5FF', fontSize: 12, fontWeight: '600' },

  btn: { backgroundColor: '#00E5FF', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
  btnSecondary: { backgroundColor: '#334155' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
