package si.stenar.smsloc.plugins.GeoLocation;

import android.app.AlertDialog;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.location.Location;
import android.net.Uri;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.Manifest;
import android.os.IBinder;
import android.provider.Settings;

import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(
        name = "GeoLocation",
        permissions = {
                @Permission(
                        strings = { Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION },
                        alias = GeoLocationPlugin.LOCATION
                ),
                @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION }, alias = GeoLocationPlugin.FINE_LOCATION)
        }
)
public class GeoLocationPlugin extends Plugin{
    static final String LOCATION = "location";
    static final String FINE_LOCATION = "fineLocation";
    private Geolocation geolocation;
    private Map<String, PluginCall> watchingCalls = new HashMap<>();
    private Map<String, PluginCall> bgWatchingCalls = new HashMap<>();
    private Boolean stoppedWithoutPermissions = false;

    @Override
    public void load() {
        geolocation = new Geolocation(getContext());
        // background / foreground service
        loadBackgroundService();
    }

     @Override
     protected void handleOnPause() {
         // super.handleOnPause();
         // Clear all location updates on pause to avoid possible background location calls
         geolocation.clearLocationUpdates();

         // foreground service
         if (service != null) {
             service.onActivityStopped();
         }
         boolean hasPermissions = getPermissionState(GeoLocationPlugin.FINE_LOCATION) == PermissionState.GRANTED;
         stoppedWithoutPermissions = !hasPermissions;
         super.handleOnPause();
     }

     @Override
     protected void handleOnResume() {
         // super.handleOnResume();
         for (PluginCall call : watchingCalls.values()) {
             startWatch(call);
         }

         // foreground service
         if (service != null) {
             service.onActivityStarted();
             boolean hasPermissions = getPermissionState(GeoLocationPlugin.FINE_LOCATION) == PermissionState.GRANTED;
             if (stoppedWithoutPermissions && hasPermissions) {
                 service.onPermissionsGranted();
             }
         }
         super.handleOnResume();
     }

     @Override
    protected void handleOnDestroy() {
        if (service != null) {
            service.stopService();
        }
        super.handleOnDestroy();
    }

    @Override
    @PluginMethod
    public void checkPermissions(PluginCall call) {
        if (geolocation.isLocationServicesEnabled()) {
            super.checkPermissions(call);
        } else {
            call.reject("Location services are not enabled");
        }
    }

    @Override
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (geolocation.isLocationServicesEnabled()) {
            super.requestPermissions(call);
        } else {
            call.reject("Location services are not enabled");
        }
    }

    @PluginMethod
    public void getCurrentPosition(final PluginCall call) {
        String alias = getAlias(call);
        if (getPermissionState(alias) != PermissionState.GRANTED) {
            requestPermissionForAlias(alias, call, "completeCurrentPosition");
        } else {
            getPosition(call);
        }
    }

    /**
     * Completes the getCurrentPosition plugin call after a permission request
     * @see #getCurrentPosition(PluginCall)
     * @param call the plugin call
     */
    @PermissionCallback
    private void completeCurrentPosition(PluginCall call) {
        if (getPermissionState(GeoLocationPlugin.FINE_LOCATION) == PermissionState.GRANTED) {
            geolocation.sendLocation(
                    isHighAccuracy(call),
                new LocationResultCallback() {
                    @Override
                    public void success(Location location) {
                        call.resolve(getJSObjectForLocation(location));
                    }

                    @Override
                    public void error(String message) {
                        call.reject(message);
                    }
                }
            );
        } else {
            call.reject("Location permission was denied");
        }
    }

    /**
     * Begins watching for live location changes if permission is granted. The call continues
     * in the {@link #completeWatchPosition(PluginCall)} method if a permission request is required.
     *
     * @param call the plugin call
     */
    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void watchPosition(PluginCall call) {
        call.setKeepAlive(true);
        String alias = getAlias(call);
        if (getPermissionState(alias) != PermissionState.GRANTED) {
            requestPermissionForAlias(alias, call, "completeWatchPosition");
        } else {
            startWatch(call);
        }
    }

    /**
     * Completes the watchPosition plugin call after a permission request
     * @see #watchPosition(PluginCall)
     * @param call the plugin call
     */
    @PermissionCallback
    private void completeWatchPosition(PluginCall call) {
        if (getPermissionState(GeoLocationPlugin.FINE_LOCATION) == PermissionState.GRANTED) {
            startWatch(call);
        } else {
            call.reject("Location permission was denied");
        }
    }

    @SuppressWarnings("MissingPermission")
    private void startWatch(final PluginCall call) {
        long timeout = call.getLong("timeout", 5 * 1000L);

        geolocation.requestLocationUpdates(
            isHighAccuracy(call),
            timeout,
            new LocationResultCallback() {
                @Override
                public void success(Location location) {
                    call.resolve(getJSObjectForLocation(location));
                }

                @Override
                public void error(String message) {
                    call.reject(message);
                }
            }
        );

        watchingCalls.put(call.getCallbackId(), call);
    }

    /**
     * Removes an active geolocation watch.
     *
     * @param call Plugin call
     */
    @SuppressWarnings("MissingPermission")
    @PluginMethod
    public void clearWatch(PluginCall call) {
        String callbackId = call.getString("id");

        if (callbackId != null) {
            PluginCall removed = watchingCalls.remove(callbackId);
            if (removed != null) {
                removed.release(bridge);
            }

            if (watchingCalls.size() == 0) {
                geolocation.clearLocationUpdates();
            }

            call.resolve();
        } else {
            call.reject("Watch call id must be provided");
        }
    }

    @SuppressWarnings("MissingPermission")
    private void getPosition(PluginCall call) {
        geolocation.sendLocation(
                isHighAccuracy(call),
            new LocationResultCallback() {
                @Override
                public void success(Location location) {
                    call.resolve(getJSObjectForLocation(location));
                }

                @Override
                public void error(String message) {
                    call.reject(message);
                }
            }
        );
    }

    private JSObject getJSObjectForLocation(Location location) {
        JSObject ret = new JSObject();
        JSObject coords = new JSObject();
        ret.put("coords", coords);
        ret.put("timestamp", location.getTime());
        coords.put("latitude", location.getLatitude());
        coords.put("longitude", location.getLongitude());
        coords.put("accuracy", location.getAccuracy());
        coords.put("altitude", location.getAltitude());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            coords.put("altitudeAccuracy", location.getVerticalAccuracyMeters());
        }
        coords.put("speed", location.getSpeed());
        coords.put("heading", location.getBearing());
        return ret;
    }

    private String getAlias(PluginCall call) {
        String alias = GeoLocationPlugin.LOCATION;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            boolean enableHighAccuracy = call.getBoolean("enableHighAccuracy", false);
            if (!enableHighAccuracy) {
                alias = GeoLocationPlugin.FINE_LOCATION;
            }
        }
        return alias;
    }

    private boolean isHighAccuracy(PluginCall call) {
        boolean enableHighAccuracy = call.getBoolean("enableHighAccuracy", false);
        return enableHighAccuracy && getPermissionState(GeoLocationPlugin.LOCATION) == PermissionState.GRANTED;
    }

    @PluginMethod()
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
        intent.setData(uri);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod()
    public void openLocationSettings(PluginCall call) {
        final AlertDialog.Builder builder =  new AlertDialog.Builder(getActivity());
        final String action = Settings.ACTION_LOCATION_SOURCE_SETTINGS;
        final String message = call.getString("message", "Do you want to open GPS setting?");

        builder.setMessage(message)
            .setPositiveButton("OK",
                new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface d, int id) {
                        getActivity().startActivity(new Intent(action));
                        d.dismiss();
                    }
                })
            .setNegativeButton("Cancel",
                new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface d, int id) {
                        d.cancel();
                    }
                });
        builder.create().show();
    }

    // background service
    private GeoLocationForegroundService.LocalBinder service = null;

    private class ServiceReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            String id = intent.getStringExtra("id");
            PluginCall call = bgWatchingCalls.get(id);
            if (call == null) {
                return;
            }
            Location location = intent.getParcelableExtra("location");
            if (location != null) {
                call.resolve(getJSObjectForLocation(location));
            } else {
                Logger.debug("No location received");
            }
        }
    }

    // Gets the identifier of the app's resource by name, returning 0 if not found.
    private int getAppResourceIdentifier(String name, String defType) {
        return getContext().getResources().getIdentifier(
                name,
                defType,
                getContext().getPackageName()
        );
    }

    // Gets a string from the app's strings.xml file, resorting to a fallback if it is not defined.
    private String getAppString(String name, String fallback) {
        int id = getAppResourceIdentifier(name, "string");
        return id == 0 ? fallback : getContext().getString(id);
    }

    private void loadBackgroundService() {
        // Android O requires a Notification Channel.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getContext().getSystemService(
                    Context.NOTIFICATION_SERVICE
            );
            NotificationChannel channel = new NotificationChannel(
                    GeoLocationForegroundService.class.getPackage().getName(),
                    getAppString(
                            "capacitor_background_geolocation_notification_channel_name",
                            "Background Tracking"
                    ),
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.enableLights(false);
            channel.enableVibration(false);
            channel.setSound(null, null);
            manager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(getContext(), GeoLocationForegroundService.class);

        ServiceConnection sc = new ServiceConnection() {
            @Override
            public void onServiceConnected(ComponentName name, IBinder binder) {
                GeoLocationPlugin.this.service = (GeoLocationForegroundService.LocalBinder) binder;
            }

            @Override
            public void onServiceDisconnected(ComponentName name) {
            }
        };

        getContext().bindService(intent, sc, Context.BIND_AUTO_CREATE);

        LocalBroadcastManager.getInstance(this.getContext()).registerReceiver(
                new ServiceReceiver(),
                new IntentFilter(GeoLocationForegroundService.ACTION_BROADCAST)
        );
    }

    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void addBackgroundWatcher(PluginCall call) {
        if (service == null) {
            call.reject("Service not running.");
            return;
        }

        call.setKeepAlive(true);

        String alias = getAlias(call);
        if (getPermissionState(alias) != PermissionState.GRANTED) {
            requestPermissionForAlias(alias, call, "completeAddBackgroundWatcher");
        } else {
            addWatcher(call);
        }
    }

    @PermissionCallback
    private void completeAddBackgroundWatcher(PluginCall call) {
        if (getPermissionState(GeoLocationPlugin.FINE_LOCATION) == PermissionState.GRANTED) {
            addWatcher(call);
        } else {
            call.reject("Location permission was denied");
        }
    }

    @SuppressWarnings("MissingPermission")
    private void addWatcher(final PluginCall call) {
        Notification backgroundNotification = null;
        String backgroundMessage = call.getString("backgroundMessage", "Cancel to prevent battery drain.");

        if (backgroundMessage != null) {
            Notification.Builder builder = new Notification.Builder(getContext())
                .setContentTitle(
                    call.getString(
                "backgroundTitle", "Using your location"
                    )
                )
                .setContentText(backgroundMessage)
                .setOngoing(true)
                .setPriority(Notification.PRIORITY_HIGH)
                .setWhen(System.currentTimeMillis());

            try {
                String name = getAppString(
            "capacitor_background_geolocation_notification_icon", "mipmap/ic_launcher"
                );
                String[] parts = name.split("/");
                // It is actually necessary to set a valid icon for the notification to behave
                // correctly when tapped. If there is no icon specified, tapping it will open the
                // app's settings, rather than bringing the application to the foreground.
                builder.setSmallIcon(
                        getAppResourceIdentifier(parts[1], parts[0])
                );
            } catch (Exception e) {
                Logger.error("Could not set notification icon", e);
            }

            Intent launchIntent = getContext().getPackageManager().getLaunchIntentForPackage(
                getContext().getPackageName()
            );
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                builder.setContentIntent(
                    PendingIntent.getActivity(
                        getContext(),
                        0,
                        launchIntent,
                        PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    )
                );
            }

            // Set the Channel ID for Android O.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                builder.setChannelId(GeoLocationForegroundService.class.getPackage().getName());
            }

            backgroundNotification = builder.build();
        }

        service.addWatcher(
            call.getCallbackId(),
            backgroundNotification,
            isHighAccuracy(call)
        );

        bgWatchingCalls.put(call.getCallbackId(), call);
    }

    @SuppressWarnings("MissingPermission")
    @PluginMethod
    public void removeBackgroundWatcher(PluginCall call) {
        String callbackId = call.getString("id");

        if (callbackId != null) {
            service.removeWatcher(callbackId);

            PluginCall removed = bgWatchingCalls.remove(callbackId);
            if (removed != null) {
                removed.release(bridge);
            }

            call.resolve();
        } else {
            call.reject("Watch call id must be provided");
        }
    }
}
