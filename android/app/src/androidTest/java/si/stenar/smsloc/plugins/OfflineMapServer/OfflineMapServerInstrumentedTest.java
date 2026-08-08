package si.stenar.smsloc.plugins.OfflineMapServer;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import android.content.Context;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

/**
 * Stage 3 PoC: JNI + Swift loopback server on device.
 * Single test method — LoggingSystem.bootstrap is process-once; avoid flaky multi-start until
 * packaged Core includes the once-guard (package-android-jni.sh).
 */
@RunWith(AndroidJUnit4.class)
public class OfflineMapServerInstrumentedTest {
  private static final int PORT = 41237;
  private File root;

  @Before
  public void setUp() throws Exception {
    assertTrue(
        "libOfflineMapServer*.so missing — run package-android-jni.sh",
        OfflineMapServerNative.ensureLoaded());
    Context ctx = InstrumentationRegistry.getInstrumentation().getTargetContext();
    root = new File(ctx.getFilesDir(), "offline-map-instrumented");
    File styleDir = new File(root, "styles/fixture");
    assertTrue(styleDir.mkdirs() || styleDir.isDirectory());
    write(
        new File(styleDir, "style.json"),
        "{\"version\":8,\"name\":\"offline-fixture\",\"sources\":{},\"layers\":[]}");
  }

  @After
  public void tearDown() {
    if (OfflineMapServerNative.ensureLoaded()) {
      OfflineMapServerNative.offline_map_server_stop();
    }
  }

  @Test
  public void loopbackServeStopAndLanIsolated() throws Exception {
    assertEquals(
        0,
        OfflineMapServerNative.offline_map_server_start(
            root.getAbsolutePath(), "127.0.0.1", PORT));

    // Idempotent second start must not fail / crash.
    assertEquals(
        0,
        OfflineMapServerNative.offline_map_server_start(
            root.getAbsolutePath(), "127.0.0.1", PORT));

    assertEquals(200, httpStatus("http://127.0.0.1:" + PORT + "/healthy"));
    assertEquals(
        200, httpStatus("http://127.0.0.1:" + PORT + "/styles/fixture/style.json"));

    byte[] buf = new byte[512];
    assertEquals(0, OfflineMapServerNative.offline_map_server_base_url(buf));
    int end = 0;
    while (end < buf.length && buf[end] != 0) end++;
    String url = new String(buf, 0, end, StandardCharsets.UTF_8);
    assertEquals("http://127.0.0.1:" + PORT, url);
    assertFalse(url.contains("0.0.0.0"));

    String lan = firstLanIpv4();
    if (lan != null) {
      try {
        httpStatus("http://" + lan + ":" + PORT + "/healthy", 800);
        fail("expected LAN IP " + lan + " to be unreachable");
      } catch (Exception expected) {
        // timeout / connection refused
      }
    }

    OfflineMapServerNative.offline_map_server_stop();
    try {
      httpStatus("http://127.0.0.1:" + PORT + "/healthy", 800);
      fail("expected failure after stop");
    } catch (Exception expected) {
      // ok
    }

    // Restart after stop (needs LoggingSystem once-guard in Core).
    assertEquals(
        0,
        OfflineMapServerNative.offline_map_server_start(
            root.getAbsolutePath(), "127.0.0.1", PORT));
    assertEquals(200, httpStatus("http://127.0.0.1:" + PORT + "/healthy"));
  }

  private static void write(File file, String body) throws Exception {
    try (FileOutputStream out = new FileOutputStream(file)) {
      out.write(body.getBytes(StandardCharsets.UTF_8));
    }
  }

  private static int httpStatus(String url) throws Exception {
    return httpStatus(url, 5000);
  }

  private static int httpStatus(String url, int timeoutMs) throws Exception {
    HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
    conn.setConnectTimeout(timeoutMs);
    conn.setReadTimeout(timeoutMs);
    conn.setRequestMethod("GET");
    try {
      int code = conn.getResponseCode();
      try (BufferedReader r =
          new BufferedReader(
              new InputStreamReader(
                  code >= 400 ? conn.getErrorStream() : conn.getInputStream(),
                  StandardCharsets.UTF_8))) {
        if (r != null) {
          while (r.readLine() != null) {
            // discard
          }
        }
      } catch (Exception ignored) {
        // no body
      }
      return code;
    } finally {
      conn.disconnect();
    }
  }

  private static String firstLanIpv4() throws Exception {
    for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
      if (!ni.isUp() || ni.isLoopback()) continue;
      for (InetAddress addr : Collections.list(ni.getInetAddresses())) {
        if (addr instanceof Inet4Address && !addr.isLoopbackAddress()) {
          return addr.getHostAddress();
        }
      }
    }
    return null;
  }
}
