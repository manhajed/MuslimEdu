import { Platform, PermissionsAndroid } from 'react-native';

export type CameraPermissionResult = 'granted' | 'denied' | 'blocked';

/**
 * Asks for the Android CAMERA runtime permission, returning what the user
 * chose ('blocked' = "Don't ask again", which only Settings can undo).
 *
 * This has to be done by the app, NOT by react-native-image-picker.
 * launchCamera() only *checks* the permission - Utils.isCameraPermissionFulfilled
 * sees CAMERA declared in AndroidManifest.xml (our build workflows inject it
 * for QR/ID scanning), finds it not granted, and bails out with
 * errorCode: 'permission' without ever showing a prompt. So declaring the
 * permission actually makes the picker *stricter*, and the OS dialog never
 * appears unless we request it ourselves first.
 *
 * iOS needs nothing here: the OS shows its own prompt (backed by the
 * NSCameraUsageDescription string) the first time the camera is opened,
 * same split as getCurrentCoordinates() in geolocation.ts.
 */
export async function ensureCameraPermission(): Promise<CameraPermissionResult> {
  if (Platform.OS !== 'android') return 'granted';

  try {
    const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (already) return 'granted';

    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
      title: 'Camera permission',
      message: 'Used to photograph your ID and take your verification selfie.',
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    });

    if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';
    return 'denied';
  } catch {
    return 'denied';
  }
}
