/**
 * modules/my-module/src/MyModule.types.ts — Shared types and constants.
 *
 * ML Kit returns 33 body landmarks following the BlazePose topology (the same
 * layout used by MediaPipe). Each landmark has a type integer (0–32) that maps
 * to a specific body part, pixel coordinates in the source image, and a depth
 * estimate relative to the hips.
 */

/** Human-readable names for each of the 33 BlazePose landmark indices. */
export const LANDMARK_NAMES: Record<number, string> = {
  0:  'NOSE',
  1:  'LEFT_EYE_INNER',  2: 'LEFT_EYE',   3: 'LEFT_EYE_OUTER',
  4:  'RIGHT_EYE_INNER', 5: 'RIGHT_EYE',  6: 'RIGHT_EYE_OUTER',
  7:  'LEFT_EAR',        8: 'RIGHT_EAR',
  9:  'LEFT_MOUTH',     10: 'RIGHT_MOUTH',
  11: 'LEFT_SHOULDER',  12: 'RIGHT_SHOULDER',
  13: 'LEFT_ELBOW',     14: 'RIGHT_ELBOW',
  15: 'LEFT_WRIST',     16: 'RIGHT_WRIST',
  17: 'LEFT_PINKY',     18: 'RIGHT_PINKY',
  19: 'LEFT_INDEX',     20: 'RIGHT_INDEX',
  21: 'LEFT_THUMB',     22: 'RIGHT_THUMB',
  23: 'LEFT_HIP',       24: 'RIGHT_HIP',
  25: 'LEFT_KNEE',      26: 'RIGHT_KNEE',
  27: 'LEFT_ANKLE',     28: 'RIGHT_ANKLE',
  29: 'LEFT_HEEL',      30: 'RIGHT_HEEL',
  31: 'LEFT_FOOT_INDEX', 32: 'RIGHT_FOOT_INDEX',
};

/**
 * Pairs of landmark indices that should be connected by a line to form the
 * skeleton. Each pair [a, b] draws a line between landmark a and landmark b.
 */
export const POSE_CONNECTIONS: [number, number][] = [
  // Face
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Left leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

/** A single body landmark returned by ML Kit. */
export interface PoseLandmark {
  /** BlazePose landmark index (0–32). Use LANDMARK_NAMES to get the body part name. */
  type: number;
  /** Pixel x coordinate in the source image. */
  x: number;
  /** Pixel y coordinate in the source image. */
  y: number;
  /** Depth in metres, relative to the hips (negative = closer to camera). */
  z: number;
  /** Confidence that this landmark is visible in the frame (0–1). */
  inFrameLikelihood: number;
}

/**
 * Calculates the angle in degrees at midPoint, formed by the line segments
 * midPoint→firstPoint and midPoint→lastPoint.
 * Always returns the acute representation (0–180°).
 */
export function getAngle(
  firstPoint: PoseLandmark,
  midPoint: PoseLandmark,
  lastPoint: PoseLandmark,
): number {
  let result = Math.abs(
    Math.atan2(lastPoint.y - midPoint.y, lastPoint.x - midPoint.x) -
    Math.atan2(firstPoint.y - midPoint.y, firstPoint.x - midPoint.x)
  ) * (180 / Math.PI);
  if (result > 180) {
    result = 360 - result;
  }
  return result;
}

/** Pre-calculated angles (degrees) for each major joint in the pose. */
export interface PoseAngles {
  leftShoulder:  number;
  rightShoulder: number;
  leftElbow:     number;
  rightElbow:    number;
  leftHip:       number;
  rightHip:      number;
  leftKnee:      number;
  rightKnee:     number;
  leftAnkle:     number;
  rightAnkle:    number;
}

/**
 * Computes angles for all major joints from a landmarks array returned by
 * detectPose(). Returns null if any required landmark is missing.
 */
export function getPoseAngles(landmarks: PoseLandmark[]): PoseAngles | null {
  const lm = (type: number) => landmarks.find(l => l.type === type);

  const leftShoulder  = lm(11), rightShoulder = lm(12);
  const leftElbow     = lm(13), rightElbow    = lm(14);
  const leftWrist     = lm(15), rightWrist    = lm(16);
  const leftHip       = lm(23), rightHip      = lm(24);
  const leftKnee      = lm(25), rightKnee     = lm(26);
  const leftAnkle     = lm(27), rightAnkle    = lm(28);
  const leftFoot      = lm(31), rightFoot     = lm(32);

  if (!leftShoulder || !rightShoulder || !leftElbow  || !rightElbow  ||
      !leftWrist    || !rightWrist    || !leftHip     || !rightHip    ||
      !leftKnee     || !rightKnee     || !leftAnkle   || !rightAnkle  ||
      !leftFoot     || !rightFoot) {
    return null;
  }

  return {
    leftShoulder:  getAngle(leftHip,       leftShoulder,  leftElbow),
    rightShoulder: getAngle(rightHip,      rightShoulder, rightElbow),
    leftElbow:     getAngle(leftShoulder,  leftElbow,     leftWrist),
    rightElbow:    getAngle(rightShoulder, rightElbow,    rightWrist),
    leftHip:       getAngle(leftShoulder,  leftHip,       leftKnee),
    rightHip:      getAngle(rightShoulder, rightHip,      rightKnee),
    leftKnee:      getAngle(leftHip,       leftKnee,      leftAnkle),
    rightKnee:     getAngle(rightHip,      rightKnee,     rightAnkle),
    leftAnkle:     getAngle(leftKnee,      leftAnkle,     leftFoot),
    rightAnkle:    getAngle(rightKnee,     rightAnkle,    rightFoot),
  };
}
