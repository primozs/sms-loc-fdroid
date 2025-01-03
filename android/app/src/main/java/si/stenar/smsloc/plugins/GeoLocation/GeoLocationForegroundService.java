// https://github.com/capacitor-community/background-geolocation
package si.stenar.smsloc.plugins.GeoLocation;

import android.app.Notification;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.location.Location;
import android.location.LocationManager;
import android.os.Binder;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.location.LocationManagerCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.getcapacitor.Logger;
import com.mapbox.android.core.location.LocationEngine;
import com.mapbox.android.core.location.LocationEngineCallback;
import com.mapbox.android.core.location.LocationEngineProvider;
import com.mapbox.android.core.location.LocationEngineRequest;
import com.mapbox.android.core.location.LocationEngineResult;;

import java.util.HashSet;

public class GeoLocationForegroundService extends Service {
    static final String ACTION_BROADCAST = GeoLocationForegroundService.class.getPackage().getName()+ ".broadcast";
    private static final String CLASS_TAG = GeoLocationForegroundService.class.getSimpleName();
    private final IBinder binder = new LocalBinder();

    // Must be unique for this application.
    private static final int NOTIFICATION_ID = 28351;

    private class Watcher {
        public String id;
        public LocationEngine client;
        public LocationEngineRequest locationRequest;
        public LocationEngineCallback<LocationEngineResult> locationCallback;
        public Notification backgroundNotification;
    }
    private HashSet<Watcher> watchers = new HashSet<Watcher>();

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public boolean onUnbind(Intent intent) {
        for (Watcher watcher : watchers) {
            watcher.client.removeLocationUpdates(watcher.locationCallback);
        }
        watchers = new HashSet<Watcher>();
        stopSelf();
        return false;
    }

    Notification getNotification() {
        for (Watcher watcher : watchers) {
            if (watcher.backgroundNotification != null) {
                return watcher.backgroundNotification;
            }
        }
        return null;
    }

    public Boolean isLocationServicesEnabled() {
        LocationManager lm = (LocationManager) getApplicationContext().getSystemService(Context.LOCATION_SERVICE);
        return LocationManagerCompat.isLocationEnabled(lm);
    }

    public class LocalBinder extends Binder {
        void addWatcher(
                final String id,
                Notification backgroundNotification,
                boolean enableHighAccuracy
        ) {
            long DEFAULT_INTERVAL_IN_MILLISECONDS = 1000L;
            long DEFAULT_MAX_WAIT_TIME = DEFAULT_INTERVAL_IN_MILLISECONDS * 5;

            LocationEngine client = LocationEngineProvider.getBestLocationEngine(GeoLocationForegroundService.this);
            LocationManager lm = (LocationManager) getApplicationContext().getSystemService(Context.LOCATION_SERVICE);

            if (isLocationServicesEnabled()) {
                boolean networkEnabled = false;
                try {
                    networkEnabled = lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
                } catch (Exception ex) {}

                int lowPriority = networkEnabled ? LocationEngineRequest.PRIORITY_BALANCED_POWER_ACCURACY : LocationEngineRequest.PRIORITY_LOW_POWER;
                int priority = enableHighAccuracy ? LocationEngineRequest.PRIORITY_HIGH_ACCURACY : lowPriority;

                LocationEngineRequest request = new LocationEngineRequest.Builder(DEFAULT_INTERVAL_IN_MILLISECONDS)
                        .setPriority(priority)
                        .setMaxWaitTime(DEFAULT_MAX_WAIT_TIME)
                        .build();
                LocationEngineCallback<LocationEngineResult> callback = new LocationEngineCallback<LocationEngineResult>(){
                    @Override
                    public void onSuccess(LocationEngineResult result) {
                        Location location = result.getLastLocation();

                        if (location != null) {
                            Intent intent = new Intent(ACTION_BROADCAST);
                            intent.putExtra("location", location);
                            intent.putExtra("id", id);

                            LocalBroadcastManager.getInstance(
                                    getApplicationContext()
                            ).sendBroadcast(intent);
                        }
                    }

                    @Override
                    public void onFailure(@NonNull Exception exception) {
                        Log.e(CLASS_TAG, "onFailure: " + exception.getMessage());
                    }
                };

                Watcher watcher = new Watcher();
                watcher.id = id;
                watcher.client = client;
                watcher.locationRequest = request;
                watcher.locationCallback = callback;
                watcher.backgroundNotification = backgroundNotification;
                watchers.add(watcher);

                try {
                    watcher.client.requestLocationUpdates(
                        watcher.locationRequest,
                        watcher.locationCallback,
                        Looper.getMainLooper()
                    );
                } catch (SecurityException ignore) {}
            }
        }

        void removeWatcher(String id) {
            for (Watcher watcher : watchers) {
                if (watcher.id.equals(id)) {
                    watcher.client.removeLocationUpdates(watcher.locationCallback);
                    watcher.locationCallback = null;
                    watcher.client = null;

                    watchers.remove(watcher);
                    if (getNotification() == null) {
                        stopForeground(true);
                    }
                    return;
                }
            }
        }

        @SuppressWarnings("MissingPermission")
        void onPermissionsGranted() {
            // If permissions were granted while the app was in the background, for example in
            // the Settings app, the watchers need restarting.
            for (Watcher watcher : watchers) {
                watcher.client.removeLocationUpdates(watcher.locationCallback);
                try {
                    watcher.client.requestLocationUpdates(
                        watcher.locationRequest,
                        watcher.locationCallback,
                        Looper.getMainLooper()
                    );
                } catch (SecurityException ignore) {}
            }
        }

        void onActivityStarted() {
            stopForeground(true);
        }

        void onActivityStopped() {
            Notification notification = getNotification();
            if (notification != null) {
                try {
                    startForeground(NOTIFICATION_ID, notification);
                } catch (Exception e) {
                    Logger.error("Failed to start service", e);
                }
            }
        }

        void stopService() {
            GeoLocationForegroundService.this.stopSelf();
        }
    }
}
