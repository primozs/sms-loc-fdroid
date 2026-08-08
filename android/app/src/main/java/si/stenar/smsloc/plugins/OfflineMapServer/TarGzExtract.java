package si.stenar.smsloc.plugins.OfflineMapServer;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPInputStream;

/** Minimal ustar .tar.gz extractor (map packs). Rejects path traversal. */
final class TarGzExtract {
  private TarGzExtract() {}

  interface Cancel {
    boolean get();
  }

  static void extract(File archive, File destRoot, Cancel cancel) throws IOException {
    if (!destRoot.isDirectory() && !destRoot.mkdirs()) {
      throw new IOException("mkdir " + destRoot);
    }
    try (InputStream in =
        new BufferedInputStream(
            new GZIPInputStream(new BufferedInputStream(new FileInputStream(archive))))) {
      byte[] header = new byte[512];
      while (true) {
        if (cancel != null && cancel.get()) {
          throw new IOException("cancelled");
        }
        int n = readFully(in, header, 0, 512);
        if (n < 512) break;
        if (isZeroBlock(header)) break;

        String name = tarString(header, 0, 100);
        String prefix = tarString(header, 345, 155);
        if (!prefix.isEmpty()) {
          name = prefix + "/" + name;
        }
        long size = parseOctal(header, 124, 12);
        char type = (char) (header[156] & 0xff);

        File out = resolveSafe(destRoot, name);
        if (type == '5' || name.endsWith("/")) {
          if (!out.isDirectory() && !out.mkdirs()) {
            throw new IOException("mkdir " + out);
          }
        } else if (type == '0' || type == '\0') {
          File parent = out.getParentFile();
          if (parent != null && !parent.isDirectory() && !parent.mkdirs()) {
            throw new IOException("mkdir " + parent);
          }
          try (FileOutputStream fos = new FileOutputStream(out)) {
            long left = size;
            byte[] buf = new byte[8192];
            while (left > 0) {
              if (cancel != null && cancel.get()) {
                throw new IOException("cancelled");
              }
              int want = (int) Math.min(buf.length, left);
              int r = in.read(buf, 0, want);
              if (r < 0) throw new IOException("truncated tar entry " + name);
              fos.write(buf, 0, r);
              left -= r;
            }
          }
        } else {
          // skip unsupported entry types
          skipFully(in, size);
        }
        long pad = (512 - (size % 512)) % 512;
        if (pad > 0) skipFully(in, pad);
      }
    }
  }

  private static File resolveSafe(File root, String name) throws IOException {
    if (name.isEmpty() || name.startsWith("/") || name.contains("..")) {
      throw new IOException("unsafe tar path: " + name);
    }
    File out = new File(root, name);
    String rootPath = root.getCanonicalPath();
    String outPath = out.getCanonicalPath();
    if (!outPath.startsWith(rootPath + File.separator) && !outPath.equals(rootPath)) {
      throw new IOException("tar path escapes root: " + name);
    }
    return out;
  }

  private static String tarString(byte[] header, int off, int len) {
    int end = off;
    int max = off + len;
    while (end < max && header[end] != 0) end++;
    return new String(header, off, end - off, StandardCharsets.UTF_8).trim();
  }

  private static long parseOctal(byte[] header, int off, int len) {
    long v = 0;
    int end = off + len;
    int i = off;
    while (i < end && (header[i] == 0 || header[i] == ' ')) i++;
    while (i < end && header[i] != 0 && header[i] != ' ') {
      v = (v << 3) + (header[i] - '0');
      i++;
    }
    return v;
  }

  private static boolean isZeroBlock(byte[] header) {
    for (byte b : header) {
      if (b != 0) return false;
    }
    return true;
  }

  private static int readFully(InputStream in, byte[] buf, int off, int len) throws IOException {
    int total = 0;
    while (total < len) {
      int r = in.read(buf, off + total, len - total);
      if (r < 0) return total;
      total += r;
    }
    return total;
  }

  private static void skipFully(InputStream in, long n) throws IOException {
    long left = n;
    while (left > 0) {
      long s = in.skip(left);
      if (s <= 0) {
        if (in.read() < 0) throw new IOException("unexpected EOF");
        left--;
      } else {
        left -= s;
      }
    }
  }
}
