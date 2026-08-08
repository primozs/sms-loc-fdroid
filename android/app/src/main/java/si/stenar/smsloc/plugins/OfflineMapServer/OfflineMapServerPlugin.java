package si.stenar.smsloc.plugins.OfflineMapServer;

import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "OfflineMapServer")
public class OfflineMapServerPlugin extends Plugin {
  /** App-files root that contains `map/` after pack extract. */
  static final String OFFLINE_MAP_DIR = "offline-map";
  static final String PACK_STYLE_REL = "map/styles/planet-small/style.json";
  public static final String EVENT_PROGRESS = "offlineMapProgress";

  private final OfflineMapPackInstaller installer = new OfflineMapPackInstaller();
  private final Handler main = new Handler(Looper.getMainLooper());

  private File offlineMapRoot() {
    return new File(getContext().getFilesDir(), OFFLINE_MAP_DIR);
  }

  static boolean isPackInstalled(File root) {
    File map = new File(root, "map");
    return new File(root, PACK_STYLE_REL).isFile()
        && new File(map, "tiles").isDirectory()
        && new File(map, "fonts").isDirectory();
  }

  @PluginMethod
  public void start(PluginCall call) {
    if (!OfflineMapServerNative.ensureLoaded()) {
      call.reject("Swift OfflineMapServerCore not loaded: " + OfflineMapServerNative.getLoadError());
      return;
    }

    String rootDir = call.getString("rootDir", "");
    boolean fixture = Boolean.TRUE.equals(call.getBoolean("fixture", false));
    if (rootDir == null || rootDir.isEmpty()) {
      File root = offlineMapRoot();
      if (fixture) {
        try {
          ensureFixture(root);
        } catch (IOException e) {
          call.reject("fixture write failed: " + e.getMessage());
          return;
        }
      } else if (!root.isDirectory() && !root.mkdirs()) {
        call.reject("mkdir offline-map failed");
        return;
      }
      rootDir = root.getAbsolutePath();
    }
    String host = call.getString("host", "127.0.0.1");
    Integer port = call.getInt("port", 4000);

    int rc = OfflineMapServerNative.offline_map_server_start(rootDir, host, port);
    if (rc != 0) {
      call.reject("offline_map_server_start failed: " + rc);
      return;
    }

    JSObject ret = new JSObject();
    ret.put("baseUrl", readBaseUrl());
    ret.put("rootDir", rootDir);
    call.resolve(ret);
  }

  @PluginMethod
  public void getPackStatus(PluginCall call) {
    File root = offlineMapRoot();
    JSObject ret = new JSObject();
    ret.put("rootDir", root.getAbsolutePath());
    ret.put("installed", isPackInstalled(root));
    ret.put("stylePath", PACK_STYLE_REL);
    ret.put("busy", installer.isBusy());
    call.resolve(ret);
  }

  @PluginMethod
  public void installPack(PluginCall call) {
    String url = call.getString("url", "");
    if (url == null || url.isEmpty()) {
      call.reject("url required");
      return;
    }
    if (installer.isBusy()) {
      call.reject("install already running");
      return;
    }
    File root = offlineMapRoot();
    call.setKeepAlive(true);
    installer.installAsync(
        root,
        url,
        (percent, transferred, total) ->
            main.post(
                () -> {
                  JSObject ev = new JSObject();
                  ev.put("percent", percent);
                  ev.put("transferred", transferred);
                  ev.put("total", total);
                  notifyListeners(EVENT_PROGRESS, ev);
                }),
        () ->
            main.post(
                () -> {
                  JSObject ret = new JSObject();
                  ret.put("installed", isPackInstalled(root));
                  ret.put("rootDir", root.getAbsolutePath());
                  call.resolve(ret);
                }),
        () -> main.post(() -> call.reject("install failed or cancelled")));
  }

  @PluginMethod
  public void cancelInstall(PluginCall call) {
    installer.cancel();
    call.resolve();
  }

  @PluginMethod
  public void removePack(PluginCall call) {
    try {
      if (OfflineMapServerNative.ensureLoaded()) {
        OfflineMapServerNative.offline_map_server_stop();
      }
      installer.remove(offlineMapRoot());
      JSObject ret = new JSObject();
      ret.put("removed", true);
      call.resolve(ret);
    } catch (IOException e) {
      call.reject("remove failed: " + e.getMessage());
    }
  }

  private static void ensureFixture(File root) throws IOException {
    File styleDir = new File(root, "styles/fixture");
    if (!styleDir.exists() && !styleDir.mkdirs()) {
      throw new IOException("mkdir " + styleDir);
    }
    // Always refresh PoC fixture so Stage bumps are not stuck on an old style.json.
    writeUtf8(
        new File(styleDir, "style.json"),
        "{\"version\":8,\"name\":\"offline-fixture\",\"sources\":{\"fixture\":{\"type\":\"geojson\",\"data\":\"data.geojson\"}},\"layers\":[{\"id\":\"background\",\"type\":\"background\",\"paint\":{\"background-color\":\"#ddeeff\"}},{\"id\":\"fixture-fill\",\"type\":\"fill\",\"source\":\"fixture\",\"paint\":{\"fill-color\":\"#228833\",\"fill-opacity\":0.65}},{\"id\":\"fixture-outline\",\"type\":\"line\",\"source\":\"fixture\",\"paint\":{\"line-color\":\"#0a4d1c\",\"line-width\":2}}]}");
    writeUtf8(
        new File(styleDir, "data.geojson"),
        "{\"type\":\"FeatureCollection\",\"features\":[{\"type\":\"Feature\",\"properties\":{\"name\":\"offline-fixture\"},\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[[14.4,46.0],[14.65,46.0],[14.65,46.15],[14.4,46.15],[14.4,46.0]]]}}]}");
  }

  private static void writeUtf8(File file, String body) throws IOException {
    try (FileOutputStream out = new FileOutputStream(file)) {
      out.write(body.getBytes(StandardCharsets.UTF_8));
    }
  }

  @PluginMethod
  public void stop(PluginCall call) {
    if (!OfflineMapServerNative.ensureLoaded()) {
      call.reject("Swift OfflineMapServerCore not loaded: " + OfflineMapServerNative.getLoadError());
      return;
    }
    OfflineMapServerNative.offline_map_server_stop();
    call.resolve();
  }

  @PluginMethod
  public void getBaseUrl(PluginCall call) {
    if (!OfflineMapServerNative.ensureLoaded()) {
      call.reject("Swift OfflineMapServerCore not loaded: " + OfflineMapServerNative.getLoadError());
      return;
    }
    JSObject ret = new JSObject();
    ret.put("baseUrl", readBaseUrl());
    call.resolve(ret);
  }

  @PluginMethod
  public void isAvailable(PluginCall call) {
    boolean ok = OfflineMapServerNative.ensureLoaded();
    JSObject ret = new JSObject();
    ret.put("available", ok);
    if (!ok) {
      ret.put("error", OfflineMapServerNative.getLoadError());
    }
    call.resolve(ret);
  }

  private static String readBaseUrl() {
    byte[] buf = new byte[512];
    int rc = OfflineMapServerNative.offline_map_server_base_url(buf);
    if (rc != 0) return "";
    int end = 0;
    while (end < buf.length && buf[end] != 0) end++;
    return new String(buf, 0, end, StandardCharsets.UTF_8);
  }
}
