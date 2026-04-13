/**
 * PoseDetectionModule.kt — Native Expo module that wraps Google ML Kit Pose Detection.
 *
 * This is the Android-side "native code" of the app. It registers a module
 * called "PoseDetection" that JavaScript can call via the Expo Modules API.
 *
 * When detectPose(uri) is called from JavaScript:
 *   1. The image at the given file URI is loaded into an ML Kit InputImage.
 *   2. ML Kit's AccuratePoseDetector runs on-device inference to find 33 body
 *      landmarks (BlazePose topology).
 *   3. Each landmark's pixel coordinates, depth, and confidence are returned
 *      to JavaScript as a list of maps.
 *
 * ML Kit reads EXIF rotation metadata from the file automatically, so
 * landmarks are always returned in the visually-correct (upright) image space
 * regardless of how the raw sensor stored the pixels.
 */
package expo.modules.posedetection

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.accurate.AccuratePoseDetectorOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PoseDetectionModule : Module() {
  override fun definition() = ModuleDefinition {

    // The name JavaScript uses to require this module:
    // requireNativeModule('PoseDetection')
    Name("PoseDetection")

    AsyncFunction("detectPose") { imageUri: String, promise: Promise ->
      val context = appContext.reactContext
        ?: return@AsyncFunction promise.reject("CTX_ERROR", "React context unavailable", null)

      // AccuratePoseDetectorOptions gives better landmark accuracy than the
      // base (fast) model. SINGLE_IMAGE_MODE is correct for still photos —
      // STREAM_MODE is faster but designed for live video frames.
      val options = AccuratePoseDetectorOptions.Builder()
        .setDetectorMode(AccuratePoseDetectorOptions.SINGLE_IMAGE_MODE)
        .build()

      val detector = PoseDetection.getClient(options)

      try {
        // fromFilePath reads EXIF rotation so ML Kit sees an upright image.
        val image = InputImage.fromFilePath(context, Uri.parse(imageUri))

        detector.process(image)
          .addOnSuccessListener { pose ->
            // Map each of the 33 landmarks to a plain JS-friendly object.
            // position.x / position.y are pixel coordinates in the image.
            // position3D.z is depth in metres relative to the hips.
            val landmarks = pose.allPoseLandmarks.map { lm ->
              mapOf(
                "type"              to lm.landmarkType,
                "x"                 to lm.position.x.toDouble(),
                "y"                 to lm.position.y.toDouble(),
                "z"                 to lm.position3D.z.toDouble(),
                "inFrameLikelihood" to lm.inFrameLikelihood.toDouble()
              )
            }
            promise.resolve(landmarks)
          }
          .addOnFailureListener { e ->
            promise.reject("DETECTION_FAILED", e.message ?: "Pose detection failed", e)
          }
      } catch (e: Exception) {
        promise.reject("INPUT_ERROR", e.message ?: "Failed to load image", e)
      }
    }
  }
}
