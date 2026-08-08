package si.stenar.smsloc.plugins.OfflineMapServer;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.atomic.AtomicBoolean;

/** Download map.tar.gz into offline-map root and extract `map/`. */
final class OfflineMapPackInstaller {
  static final String ARCHIVE_NAME = "map.tar.gz";

  interface Progress {
    void onProgress(double percent, long transferred, long total);
  }

  private final AtomicBoolean cancel = new AtomicBoolean(false);
  private final Object lock = new Object();
  private Thread worker;

  void cancel() {
    cancel.set(true);
  }

  boolean isBusy() {
    synchronized (lock) {
      return worker != null && worker.isAlive();
    }
  }

  void installAsync(File root, String url, Progress progress, Runnable onOk, Runnable onFail) {
    synchronized (lock) {
      if (worker != null && worker.isAlive()) {
        onFail.run();
        return;
      }
      cancel.set(false);
      worker =
          new Thread(
              () -> {
                try {
                  install(root, url, progress);
                  if (cancel.get()) {
                    onFail.run();
                  } else {
                    onOk.run();
                  }
                } catch (Exception e) {
                  onFail.run();
                }
              },
              "offline-map-install");
      worker.start();
    }
  }

  void install(File root, String url, Progress progress) throws IOException {
    if (!root.isDirectory() && !root.mkdirs()) {
      throw new IOException("mkdir " + root);
    }
    File archive = new File(root, ARCHIVE_NAME);
    File mapDir = new File(root, "map");
    deleteRecursive(mapDir);
    if (archive.exists() && !archive.delete()) {
      throw new IOException("delete archive");
    }

    download(url, archive, progress);
    if (cancel.get()) {
      deleteQuiet(archive);
      throw new IOException("cancelled");
    }

    if (progress != null) {
      progress.onProgress(1.0, archive.length(), archive.length());
    }
    TarGzExtract.extract(archive, root, cancel::get);
    deleteQuiet(archive);

    if (!OfflineMapServerPlugin.isPackInstalled(root)) {
      deleteRecursive(mapDir);
      throw new IOException("MAP_INSTALL_UNSUCCESSFUL");
    }
  }

  void remove(File root) throws IOException {
    cancel.set(true);
    deleteRecursive(new File(root, "map"));
    deleteQuiet(new File(root, ARCHIVE_NAME));
  }

  private void download(String urlStr, File dest, Progress progress) throws IOException {
    HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
    conn.setConnectTimeout(30_000);
    conn.setReadTimeout(60_000);
    conn.setInstanceFollowRedirects(true);
    conn.connect();
    int code = conn.getResponseCode();
    if (code >= 400) {
      conn.disconnect();
      throw new IOException("HTTP " + code);
    }
    long total = conn.getContentLengthLong();
    long transferred = 0;
    int tick = 0;
    try (InputStream in = new BufferedInputStream(conn.getInputStream());
        BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(dest))) {
      byte[] buf = new byte[64 * 1024];
      int n;
      while ((n = in.read(buf)) >= 0) {
        if (cancel.get()) {
          throw new IOException("cancelled");
        }
        out.write(buf, 0, n);
        transferred += n;
        tick++;
        if (progress != null && (total <= 0 || tick % 20 == 0)) {
          double pct = total > 0 ? Math.min(1.0, (double) transferred / (double) total) : 0;
          progress.onProgress(pct, transferred, Math.max(total, 0));
        }
      }
      out.flush();
    } finally {
      conn.disconnect();
    }
    if (progress != null && total > 0) {
      progress.onProgress(1.0, transferred, total);
    }
  }

  static void deleteRecursive(File f) throws IOException {
    if (f == null || !f.exists()) return;
    if (f.isDirectory()) {
      File[] kids = f.listFiles();
      if (kids != null) {
        for (File k : kids) deleteRecursive(k);
      }
    }
    if (!f.delete()) {
      throw new IOException("delete " + f);
    }
  }

  private static void deleteQuiet(File f) {
    try {
      if (f != null && f.exists()) deleteRecursive(f);
    } catch (IOException ignored) {
      // best-effort cleanup
    }
  }
}
