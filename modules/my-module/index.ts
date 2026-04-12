/**
 * modules/my-module/index.ts — Public API of the native pose detection module.
 *
 * Re-exports everything the rest of the app needs so imports stay clean:
 *   import { PoseDetection, POSE_CONNECTIONS } from '../modules/my-module';
 */
export { default as PoseDetection } from './src/MyModule';
export { POSE_CONNECTIONS, LANDMARK_NAMES } from './src/MyModule.types';
export type { PoseLandmark } from './src/MyModule.types';
