package si.stenar.smsloc.plugins.OfflineMapServer;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import org.junit.Test;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.zip.GZIPOutputStream;

public class TarGzExtractTest {
  @Test
  public void extractsSafePathsAndRejectsTraversal() throws Exception {
    File dir = Files.createTempDirectory("tar-gz").toFile();
    File archive = new File(dir, "t.tar.gz");
    writeTarGz(
        archive,
        new Entry("map/fonts/", null),
        new Entry("map/tiles/", null),
        new Entry(
            "map/styles/planet-small/style.json",
            "{\"version\":8}".getBytes(StandardCharsets.UTF_8)));

    File out = new File(dir, "out");
    TarGzExtract.extract(archive, out, () -> false);
    assertTrue(new File(out, "map/styles/planet-small/style.json").isFile());
    assertTrue(OfflineMapServerPlugin.isPackInstalled(out));

    File bad = new File(dir, "bad.tar.gz");
    writeTarGz(bad, new Entry("../secret.txt", "x".getBytes(StandardCharsets.UTF_8)));
    try {
      TarGzExtract.extract(bad, new File(dir, "out2"), () -> false);
      fail("expected unsafe path");
    } catch (Exception expected) {
      assertTrue(expected.getMessage().contains("unsafe") || expected.getMessage().contains("escapes"));
    }
  }

  private static final class Entry {
    final String name;
    final byte[] data; // null => directory

    Entry(String name, byte[] data) {
      this.name = name;
      this.data = data;
    }
  }

  private static void writeTarGz(File file, Entry... entries) throws Exception {
    ByteArrayOutputStream bos = new ByteArrayOutputStream();
    for (Entry e : entries) {
      boolean dir = e.data == null || e.name.endsWith("/");
      byte[] data = dir ? new byte[0] : e.data;
      byte[] header = new byte[512];
      byte[] nameBytes = e.name.getBytes(StandardCharsets.UTF_8);
      System.arraycopy(nameBytes, 0, header, 0, Math.min(100, nameBytes.length));
      String sizeOct = String.format("%11o ", data.length);
      byte[] sizeBytes = sizeOct.getBytes(StandardCharsets.US_ASCII);
      System.arraycopy(sizeBytes, 0, header, 124, sizeBytes.length);
      header[156] = (byte) (dir ? '5' : '0');
      // checksum
      java.util.Arrays.fill(header, 148, 156, (byte) ' ');
      int sum = 0;
      for (byte b : header) sum += b & 0xff;
      String chk = String.format("%6o\0 ", sum);
      System.arraycopy(chk.getBytes(StandardCharsets.US_ASCII), 0, header, 148, 8);
      bos.write(header);
      if (!dir) {
        bos.write(data);
        int pad = (512 - (data.length % 512)) % 512;
        if (pad > 0) bos.write(new byte[pad]);
      }
    }
    bos.write(new byte[1024]); // two zero blocks
    try (GZIPOutputStream gz = new GZIPOutputStream(new FileOutputStream(file))) {
      gz.write(bos.toByteArray());
    }
  }
}
