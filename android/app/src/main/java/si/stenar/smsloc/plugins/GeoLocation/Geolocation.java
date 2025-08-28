// https://capacitorjs.com/docs/plugins/tutorial/android-implementation
// https://capacitorjs.com/docs/plugins/android
package si.stenar.smsloc.plugins.GeoLocation;

import android.content.Context;
import android.location.Location;
import android.location.LocationManager;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.location.LocationManagerCompat;

import java.util.function.Consumer;
import android.location.LocationListener;

public class Geolocation {
    private static final String CLASS_TAG = Geolocation.class.getSimpleName();
    private final Context context;
    private LocationManager locationManager;
    private LocationListener locationListener;

    public Geolocation(Context context) {
        this.context = context.getApplicationContext();
    }

    public Boolean isLocationServicesEnabled() {
        LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        return LocationManagerCompat.isLocationEnabled(lm);
    }

    @SuppressWarnings("MissingPermission")
    public void sendLocation(boolean enableHighAccuracy, final LocationResultCallback resultCallback) {
        clearLocationUpdates();
        LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);

        if (this.isLocationServicesEnabled()) {
            lm.getCurrentLocation(
                LocationManager.GPS_PROVIDER,
            null,
                this.context.getMainExecutor(),
                new Consumer<Location>() {
                    @Override
                    public void accept(Location location) {
                        if (location != null) {
                            resultCallback.success(location);
                        } else {
                            Log.e(CLASS_TAG, "location unavailable");
                            resultCallback.error("location unavailable");
                        }
                        clearLocationUpdates();
                    }
                });
        } else {
            resultCallback.error("location disabled");
        }
    }

    @SuppressWarnings("MissingPermission")
    public void requestLocationUpdates(boolean enableHighAccuracy, long timeout, final LocationResultCallback resultCallback) {
        clearLocationUpdates();

        locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);

        locationListener = new LocationListener() {
            @Override
            public void onLocationChanged(@NonNull Location location) {
                resultCallback.success(location);
            }
        };

        if (this.isLocationServicesEnabled()) {
            locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    timeout,
                    1,
                    locationListener
            );
        } else {
            resultCallback.error("location disabled");
        }
    }

    public void clearLocationUpdates() {

        if (locationManager != null && locationListener != null) {
            locationManager.removeUpdates(locationListener);
            locationListener = null;
            locationManager = null;
        }
    }
}
