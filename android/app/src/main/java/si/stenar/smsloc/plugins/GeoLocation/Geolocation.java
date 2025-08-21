// https://docs.mapbox.com/android/core/guides/
// https://capacitorjs.com/docs/plugins/tutorial/android-implementation
// https://capacitorjs.com/docs/plugins/android
package si.stenar.smsloc.plugins.GeoLocation;

import android.content.Context;
import android.location.Location;
import android.location.LocationManager;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.location.LocationManagerCompat;

import com.mapbox.android.core.location.LocationEngine;
import com.mapbox.android.core.location.LocationEngineCallback;
import com.mapbox.android.core.location.LocationEngineProvider;
import com.mapbox.android.core.location.LocationEngineRequest;
import com.mapbox.android.core.location.LocationEngineResult;

import java.lang.ref.WeakReference;
import java.util.function.Consumer;

public class Geolocation {
    private static final String CLASS_TAG = Geolocation.class.getSimpleName();
    private final Context context;
    private LocationEngine locationEngine;
    private Geolocation.LocationListeningCallback locationCallback;

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

        long DEFAULT_INTERVAL_IN_MILLISECONDS = 1000L;

        locationEngine = LocationEngineProvider.getBestLocationEngine(this.context);

        LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        if (this.isLocationServicesEnabled()) {
            boolean networkEnabled = false;
            try {
                networkEnabled = lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
            } catch (Exception ex) {}

            int lowPriority = networkEnabled ? LocationEngineRequest.PRIORITY_BALANCED_POWER_ACCURACY : LocationEngineRequest.PRIORITY_LOW_POWER;
            int priority = enableHighAccuracy ? LocationEngineRequest.PRIORITY_HIGH_ACCURACY : lowPriority;

            LocationEngineRequest request = new LocationEngineRequest.Builder(DEFAULT_INTERVAL_IN_MILLISECONDS)
                    .setPriority(priority)
                    .setMaxWaitTime(timeout)
                    .build();
            locationCallback = new Geolocation.LocationListeningCallback(resultCallback);
            locationEngine.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
        } else {
            resultCallback.error("location disabled");
        }
    }

    public void clearLocationUpdates() {
        if (locationCallback != null) {
            locationEngine.removeLocationUpdates(locationCallback);
            locationEngine = null;
            locationCallback = null;
        }
    }
    private static class LocationListeningCallback
            implements LocationEngineCallback<LocationEngineResult> {

        private WeakReference<LocationResultCallback> resultCallback;

        public LocationListeningCallback(final LocationResultCallback resultCallback) {
            this.resultCallback = new WeakReference<>(resultCallback);
        }

        @Override
        public void onSuccess(LocationEngineResult result) {
            Location location = result.getLastLocation();
            if (location == null) {
                resultCallback.get().error("location unavailable");
            } else {
                // Log.e(CLASS_TAG, "success: " + location.toString());
                resultCallback.get().success(location);
            }
        }

        @Override
        public void onFailure(@NonNull Exception exception) {
            Log.e(CLASS_TAG, "onFailure: " + exception.getMessage());
            resultCallback.get().error(exception.getMessage());
        }
    }
}
