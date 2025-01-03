package si.stenar.smsloc.plugins.GeoLocation;

import android.location.Location;
public interface LocationResultCallback {
    void success(Location location);
    void error(String message);
}
