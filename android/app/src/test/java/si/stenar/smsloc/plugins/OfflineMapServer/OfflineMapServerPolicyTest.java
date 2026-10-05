package si.stenar.smsloc.plugins.OfflineMapServer;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import org.junit.Test;

public class OfflineMapServerPolicyTest {
  @Test
  public void allowlistedServeRootsOnly() throws IOException {
    File tmp = Files.createTempDirectory("oms-policy").toFile();
    File pack = new File(tmp, "offline-map");
    File fixture = new File(tmp, "offline-map-fixture");
    assertTrue(pack.mkdirs());
    assertTrue(fixture.mkdirs());

    assertTrue(OfflineMapServerPolicy.isAllowedServeRoot(pack, pack, fixture));
    assertTrue(OfflineMapServerPolicy.isAllowedServeRoot(fixture, pack, fixture));
    assertFalse(
        OfflineMapServerPolicy.isAllowedServeRoot(new File(tmp, "other"), pack, fixture));
    assertFalse(
        OfflineMapServerPolicy.isAllowedServeRoot(new File(pack, "map"), pack, fixture));
  }

  @Test
  public void packDownloadUrlAllowlist() {
    assertTrue(
        OfflineMapServerPolicy.isAllowedPackDownloadUrl(
            "https://github.com/primozs/small-planet/raw/master/public/map.tar.gz"));
    assertTrue(
        OfflineMapServerPolicy.isAllowedPackDownloadUrl(
            "https://raw.githubusercontent.com/primozs/small-planet/master/public/map.tar.gz"));
    assertFalse(
        OfflineMapServerPolicy.isAllowedPackDownloadUrl(
            "http://github.com/primozs/small-planet/raw/master/public/map.tar.gz"));
    assertFalse(
        OfflineMapServerPolicy.isAllowedPackDownloadUrl(
            "https://evil.example/primozs/small-planet/raw/master/public/map.tar.gz"));
    assertFalse(
        OfflineMapServerPolicy.isAllowedPackDownloadUrl(
            "https://raw.githubusercontent.com/attacker/primozs/small-planet/map.tar.gz"));
    assertFalse(
        OfflineMapServerPolicy.isAllowedPackDownloadUrl(
            "https://github.com/attacker/x/raw/main/primozs/small-planet/map.tar.gz"));
    assertFalse(
        OfflineMapServerPolicy.isAllowedPackDownloadUrl(
            "https://github.com/primozs/small-planet/raw/master/public/evil.zip"));
    assertFalse(OfflineMapServerPolicy.isAllowedPackDownloadUrl(""));
  }
}
