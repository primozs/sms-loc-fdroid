package si.stenar.smsloc.plugins.OfflineMapServer;

/**
 * JNI bindings to Swift OfflineMapServerCore (libOfflineMapServerCore.so).
 * Absent until jniLibs are packaged via package-android-jni.sh.
 */
final class OfflineMapServerNative {
  private static boolean loaded = false;
  private static String loadError = "not attempted";

  static synchronized boolean ensureLoaded() {
    if (loaded) return true;
    try {
      // Core first (Swift/Vapor), then JNI shim with Java_* symbols.
      System.loadLibrary("OfflineMapServerCore");
      System.loadLibrary("OfflineMapServerJni");
      loaded = true;
      loadError = "";
      return true;
    } catch (UnsatisfiedLinkError e) {
      loadError = e.getMessage() != null ? e.getMessage() : e.toString();
      return false;
    }
  }

  static String getLoadError() {
    return loadError;
  }

  /** 0 = ok, non-zero = error */
  static native int offline_map_server_start(String rootDir, String host, int port);

  static native void offline_map_server_stop();

  /** 0 = ok and out filled; non-zero = error */
  static native int offline_map_server_base_url(byte[] out);
}
