# expo-pose-detection

An Expo native module for on-device human pose detection using Google ML Kit. Detects 33 body landmarks (BlazePose topology) from a photo URI and provides joint angle calculations — no internet connection required.

**Platform support:** Android only.

---

## Requirements

- Expo SDK 54 or later
- React Native 0.76 or later
- A development build (Expo Go is not supported — this module contains native Android code)

---

## Dependencies

### Automatic (no action needed)

The following is declared in the module's `build.gradle` and is downloaded automatically by Gradle when you build:

- `com.google.mlkit:pose-detection-accurate:18.0.0-beta5`

### Your responsibility

This module only handles pose detection. It accepts any `file://` URI — how you obtain that URI (camera, photo picker, etc.) is up to you. A common choice is [`react-native-vision-camera`](https://mrousavy.com/react-native-vision-camera/):

```bash
npx expo install react-native-vision-camera
```

---

## Installation

Install directly from GitHub using the Expo CLI:

```bash
npx expo install github:yourusername/expo-pose-detection
```

Replace `yourusername` with your GitHub username.

Because this module contains native code you need to rebuild your app after installing:

```bash
npx expo run:android
```

---

## Setup

No additional configuration is required. The module registers itself automatically via Expo's autolinking system.

If you are using a bare React Native project (without Expo) you will need to run autolinking manually:

```bash
npx expo-modules-autolinking android
```

---

## Usage

### Detecting a pose

Call `detectPose` with a `file://` URI pointing to a photo on the device. It returns a promise that resolves to an array of up to 33 landmarks.

```typescript
import { PoseDetection } from 'expo-pose-detection';

const landmarks = await PoseDetection.detectPose('file:///path/to/photo.jpg');
```

Each landmark in the array has the following shape:

```typescript
{
  type: number;             // BlazePose index 0–32
  x: number;               // Pixel x coordinate in the source image
  y: number;               // Pixel y coordinate in the source image
  z: number;               // Depth in metres relative to the hips
  inFrameLikelihood: number; // Confidence the landmark is visible (0–1)
}
```

Use `inFrameLikelihood > 0.5` to filter out landmarks the model is not confident about.

### Getting landmark names

```typescript
import { LANDMARK_NAMES } from 'expo-pose-detection';

const name = LANDMARK_NAMES[landmark.type]; // e.g. "LEFT_KNEE"
```

### Drawing a skeleton

`POSE_CONNECTIONS` is an array of `[number, number]` pairs — each pair is two landmark indices that should be connected by a line to form the skeleton.

```typescript
import { POSE_CONNECTIONS } from 'expo-pose-detection';

POSE_CONNECTIONS.forEach(([a, b]) => {
  const lmA = landmarks.find(l => l.type === a);
  const lmB = landmarks.find(l => l.type === b);
  if (lmA && lmB) {
    // draw a line from (lmA.x, lmA.y) to (lmB.x, lmB.y)
  }
});
```

---

## Joint Angles

### All major joints at once

`getPoseAngles` takes the landmarks array and returns pre-calculated angles (in degrees) for all major joints. Returns `null` if any required landmark is not detected.

```typescript
import { PoseDetection, getPoseAngles } from 'expo-pose-detection';

const landmarks = await PoseDetection.detectPose(uri);
const angles = getPoseAngles(landmarks);

if (angles) {
  console.log(angles.leftKnee);      // e.g. 162
  console.log(angles.rightElbow);    // e.g. 87
  console.log(angles.leftHip);       // e.g. 110
}
```

The returned `PoseAngles` object contains:

| Property | Joint | Landmarks used |
|---|---|---|
| `leftShoulder` | Left shoulder | Left hip → left shoulder → left elbow |
| `rightShoulder` | Right shoulder | Right hip → right shoulder → right elbow |
| `leftElbow` | Left elbow | Left shoulder → left elbow → left wrist |
| `rightElbow` | Right elbow | Right shoulder → right elbow → right wrist |
| `leftHip` | Left hip | Left shoulder → left hip → left knee |
| `rightHip` | Right hip | Right shoulder → right hip → right knee |
| `leftKnee` | Left knee | Left hip → left knee → left ankle |
| `rightKnee` | Right knee | Right hip → right knee → right ankle |
| `leftAnkle` | Left ankle | Left knee → left ankle → left foot index |
| `rightAnkle` | Right ankle | Right knee → right ankle → right foot index |

All angles are in degrees and are always the acute representation (0–180°).

### Custom angles

Use `getAngle` to calculate the angle at any landmark you choose:

```typescript
import { getAngle } from 'expo-pose-detection';
import type { PoseLandmark } from 'expo-pose-detection';

// Angle at the midPoint formed by firstPoint → midPoint → lastPoint
const angle = getAngle(firstPoint, midPoint, lastPoint);
```

Example — right hip angle using landmark indices:

```typescript
const rightHip = landmarks.find(l => l.type === 24)!;
const rightShoulder = landmarks.find(l => l.type === 12)!;
const rightKnee = landmarks.find(l => l.type === 26)!;

const hipAngle = getAngle(rightShoulder, rightHip, rightKnee);
```

---

## Landmark reference

| Index | Name | Index | Name |
|---|---|---|---|
| 0 | NOSE | 17 | LEFT_PINKY |
| 1 | LEFT_EYE_INNER | 18 | RIGHT_PINKY |
| 2 | LEFT_EYE | 19 | LEFT_INDEX |
| 3 | LEFT_EYE_OUTER | 20 | RIGHT_INDEX |
| 4 | RIGHT_EYE_INNER | 21 | LEFT_THUMB |
| 5 | RIGHT_EYE | 22 | RIGHT_THUMB |
| 6 | RIGHT_EYE_OUTER | 23 | LEFT_HIP |
| 7 | LEFT_EAR | 24 | RIGHT_HIP |
| 8 | RIGHT_EAR | 25 | LEFT_KNEE |
| 9 | LEFT_MOUTH | 26 | RIGHT_KNEE |
| 10 | RIGHT_MOUTH | 27 | LEFT_ANKLE |
| 11 | LEFT_SHOULDER | 28 | RIGHT_ANKLE |
| 12 | RIGHT_SHOULDER | 29 | LEFT_HEEL |
| 13 | LEFT_ELBOW | 30 | RIGHT_HEEL |
| 14 | RIGHT_ELBOW | 31 | LEFT_FOOT_INDEX |
| 15 | LEFT_WRIST | 32 | RIGHT_FOOT_INDEX |
| 16 | RIGHT_WRIST | | |

---

## How it works

The module uses ML Kit's **Accurate Pose Detector** (`SINGLE_IMAGE_MODE`) which runs entirely on-device. EXIF rotation metadata is read automatically, so landmarks are always returned in the visually-correct upright image space regardless of how the camera sensor stored the raw pixels.
