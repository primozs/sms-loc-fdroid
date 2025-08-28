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
import android.location.LocationListener;

import java.util.HashSet;

public class GeoLocationForegroundService extends Service {
    static final String ACTION_BROADCAST = GeoLocationForegroundService.class.getPackage().getName()+ ".broadcast";
    private static final String CLASS_TAG = GeoLocationForegroundService.class.getSimpleName();
    private final IBinder binder = new LocalBinder();

    // Must be unique for this application.
    private static final int NOTIFICATION_ID = 28351;

    private class Watcher {
        public String id;
        private LocationManager locationManager;
        private LocationListener locationListener;
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
            watcher.locationManager.removeUpdates(watcher.locationListener);
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
            LocationManager locationManager = (LocationManager) getApplicationContext().getSystemService(Context.LOCATION_SERVICE);

            if (isLocationServicesEnabled()) {
                LocationListener locationListener = new LocationListener() {
                    @Override
                    public void onLocationChanged(@NonNull Location location) {
                        Intent intent = new Intent(ACTION_BROADCAST);
                        intent.putExtra("location", location);
                        intent.putExtra("id", id);

                        LocalBroadcastManager.getInstance(
                                getApplicationContext()
                        ).sendBroadcast(intent);
                    }
                };


                Watcher watcher = new Watcher();
                watcher.id = id;
                watcher.locationManager = locationManager;
                watcher.locationListener = locationListener;
                watcher.backgroundNotification = backgroundNotification;
                watchers.add(watcher);

                try {
                    watcher.locationManager.requestLocationUpdates(
                            LocationManager.GPS_PROVIDER,
                        1000,
                        1,
                        watcher.locationListener
                    );
                } catch (SecurityException ignore) {}
            }
        }

        void removeWatcher(String id) {
            for (Watcher watcher : watchers) {
                if (watcher.id.equals(id)) {
                    watcher.locationManager.removeUpdates(watcher.locationListener);
                    watcher.locationListener = null;
                    watcher.locationManager = null;

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
                watcher.locationManager.removeUpdates(watcher.locationListener);
                try {
                    watcher.locationManager.requestLocationUpdates(
                            LocationManager.GPS_PROVIDER,
                            1000,
                            1,
                        watcher.locationListener
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
