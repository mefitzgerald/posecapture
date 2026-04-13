/**
 * modules/expo-pose-detection/index.ts — Public API of the native pose detection module.
 *
 * Re-exports everything the rest of the app needs so imports stay clean:
 *   import { PoseDetection, POSE_CONNECTIONS } from '../modules/expo-pose-detection';
 */
export { default as PoseDetection } from './src/PoseDetection';
export { POSE_CONNECTIONS, LANDMARK_NAMES, getAngle, getPoseAngles } from './src/PoseDetection.types';
export type { PoseLandmark, PoseAngles } from './src/PoseDetection.types';
