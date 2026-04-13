/**
 * modules/my-module/src/PoseDetection.ts — TypeScript wrapper for the native module.
 *
 * requireNativeModule('PoseDetection') loads the Kotlin class registered under
 * that name in PoseDetectionModule.kt. This declaration tells TypeScript what methods and
 * types it exposes so we get type checking and autocomplete in the rest of the app.
 */
import { NativeModule, requireNativeModule } from 'expo';
import { PoseLandmark } from './PoseDetection.types';

declare class PoseDetectionModule extends NativeModule {
  /**
   * Runs ML Kit Accurate Pose Detection on the image at the given file URI.
   * Returns an array of up to 33 body landmarks, each with pixel coordinates
   * and a confidence score (inFrameLikelihood).
   */
  detectPose(imageUri: string): Promise<PoseLandmark[]>;
}

export default requireNativeModule<PoseDetectionModule>('PoseDetection');
