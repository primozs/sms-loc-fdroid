package si.stenar.smsloc.core;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import org.junit.Test;

public class LocationRetrieverServiceExportTest {
  private static final String SERVICE = "si.stenar.smsloc.core.LocationRetrieverService";

  @Test
  public void locationRetrieverServiceIsNotExported() throws Exception {
    String block = serviceBlock(readManifest(), SERVICE);
    assertTrue(block.contains("android:exported=\"false\""));
    assertFalse(block.contains("android:exported=\"true\""));
  }

  @Test
  public void smsReceiverOnlyAcceptsBroadcastsFromTelephony() throws Exception {
    String xml = readManifest();
    int at = xml.indexOf("si.stenar.smsloc.core.SmsReceiver");
    int start = xml.lastIndexOf("<receiver", at);
    String openTag = xml.substring(start, xml.indexOf(">", at));
    assertTrue(openTag.contains("android:permission=\"android.permission.BROADCAST_SMS\""));
  }

  private static String readManifest() throws Exception {
    File[] candidates = {
      new File("src/main/AndroidManifest.xml"),
      new File("app/src/main/AndroidManifest.xml"),
      new File("android/app/src/main/AndroidManifest.xml"),
    };
    for (File candidate : candidates) {
      if (candidate.isFile()) {
        return new String(Files.readAllBytes(candidate.toPath()), StandardCharsets.UTF_8);
      }
    }
    throw new AssertionError("AndroidManifest.xml not found from " + new File(".").getAbsolutePath());
  }

  private static String serviceBlock(String xml, String name) {
    int at = xml.indexOf(name);
    if (at < 0) {
      throw new AssertionError("missing " + name);
    }
    int start = xml.lastIndexOf("<service", at);
    int end = xml.indexOf("/>", at);
    if (start < 0 || end < 0) {
      throw new AssertionError("service block not found for " + name);
    }
    return xml.substring(start, end);
  }
}
