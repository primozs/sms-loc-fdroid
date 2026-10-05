package si.stenar.smsloc.plugins.OfflineMapServer;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;

/**
 * Trust-boundary checks for OfflineMapServer Capacitor calls (JVM-testable).
 */
final class OfflineMapServerPolicy {
  private OfflineMapServerPolicy() {}

  /**
   * Product / Dev fixture trees only — never serve an arbitrary caller path.
   * Canonical paths must equal one of the allowlisted roots.
   */
  static boolean isAllowedServeRoot(File candidate, File packRoot, File fixtureRoot) {
    if (candidate == null || packRoot == null || fixtureRoot == null) return false;
    try {
      String path = candidate.getCanonicalPath();
      return path.equals(packRoot.getCanonicalPath())
          || path.equals(fixtureRoot.getCanonicalPath());
    } catch (IOException e) {
      return false;
    }
  }

  /**
   * HTTPS pack download from the known small-planet GitHub paths only.
   * Callers must re-check every redirect hop.
   */
  static boolean isAllowedPackDownloadUrl(String url) {
    if (url == null || url.isEmpty()) return false;
    final URI uri;
    try {
      uri = new URI(url);
    } catch (URISyntaxException e) {
      return false;
    }
    if (!"https".equalsIgnoreCase(uri.getScheme())) return false;
    String host = uri.getHost();
    if (host == null) return false;
    host = host.toLowerCase(Locale.ROOT);
    if (!"github.com".equals(host) && !"raw.githubusercontent.com".equals(host)) {
      return false;
    }
    String path = uri.getPath();
    if (path == null) return false;
    // Exact repo prefix only — do not allow substring smuggling in other paths.
    return path.startsWith("/primozs/small-planet/") && path.endsWith("/map.tar.gz");
  }
}
