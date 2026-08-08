#include <jni.h>
#include <stdint.h>
#include <string.h>

/* Implemented in Swift OfflineMapServerCore (@_cdecl). */
extern int32_t offline_map_server_start(const char *rootDir, const char *host, int32_t port);
extern void offline_map_server_stop(void);
extern int32_t offline_map_server_base_url(char *out, int32_t outLen);

JNIEXPORT jint JNICALL
Java_si_stenar_smsloc_plugins_OfflineMapServer_OfflineMapServerNative_offline_1map_1server_1start(
    JNIEnv *env, jclass clazz, jstring rootDir, jstring host, jint port) {
  (void)clazz;
  if (rootDir == NULL) return 1;

  const char *root = (*env)->GetStringUTFChars(env, rootDir, NULL);
  if (root == NULL) return 1;

  const char *hostname = "127.0.0.1";
  const char *hostChars = NULL;
  if (host != NULL) {
    hostChars = (*env)->GetStringUTFChars(env, host, NULL);
    if (hostChars != NULL) hostname = hostChars;
  }

  int32_t rc = offline_map_server_start(root, hostname, (int32_t)port);

  (*env)->ReleaseStringUTFChars(env, rootDir, root);
  if (hostChars != NULL) {
    (*env)->ReleaseStringUTFChars(env, host, hostChars);
  }
  return (jint)rc;
}

JNIEXPORT void JNICALL
Java_si_stenar_smsloc_plugins_OfflineMapServer_OfflineMapServerNative_offline_1map_1server_1stop(
    JNIEnv *env, jclass clazz) {
  (void)env;
  (void)clazz;
  offline_map_server_stop();
}

JNIEXPORT jint JNICALL
Java_si_stenar_smsloc_plugins_OfflineMapServer_OfflineMapServerNative_offline_1map_1server_1base_1url(
    JNIEnv *env, jclass clazz, jbyteArray out) {
  (void)clazz;
  if (out == NULL) return 1;

  jsize len = (*env)->GetArrayLength(env, out);
  if (len < 2) return 1;

  char buf[512];
  int32_t cap = (int32_t)(len < (jsize)sizeof(buf) ? len : (jsize)sizeof(buf));
  int32_t rc = offline_map_server_base_url(buf, cap);
  if (rc != 0) return (jint)rc;

  (*env)->SetByteArrayRegion(env, out, 0, cap, (const jbyte *)buf);
  return 0;
}
