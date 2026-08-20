package si.stenar.smsloc.core;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.content.res.Resources;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.core.location.LocationManagerCompat;

import java.util.ArrayList;

import si.stenar.smsloc.data.ContactData;
import si.stenar.smsloc.data.ContactStore;
import si.stenar.smsloc.data.GpsData;
import si.stenar.smsloc.data.ResponseData;
import si.stenar.smsloc.data.ResponseStore;
import si.stenar.smsloc.R;

/**
 * Hands-free Loc? reply: GPS-only, never network/cell or last-known cache.
 * Better to send Loc:GPS Data invalid than a stale/wrong position.
 */
public class LocationRetrieverService extends Service {
    private static final String LOG_TAG = LocationRetrieverService.class.getSimpleName();
    // ponytail: fixed 60s window — upgrade path is settings-configurable timeout/accuracy
    private static final long GPS_TIMEOUT_MS = 60_000L;
    /** Reply early once a fix is at least this accurate (meters). */
    private static final float GOOD_ACCURACY_M = 20f;

    protected String mAddress;
    protected String mTitle;
    protected String mResponseStatus;
    protected ArrayList<String> mDetails = new ArrayList<>();
    private LocationManager locationManager;
    private LocationListener locationListener;
    private ContactData mContactFound;
    private final Handler timeoutHandler = new Handler(Looper.getMainLooper());
    private Runnable timeoutRunnable;
    private boolean finished;
    /** Best GPS fix received during this request (by accuracy, then recency). */
    @Nullable
    private Location bestGpsFix;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        super.onStartCommand(intent, flags, startId);
        mAddress = intent.getStringExtra("address");
        mDetails.clear();
        finished = false;
        bestGpsFix = null;

        mContactFound = ContactStore.getContacts(getApplication()).stream()
                .filter(item -> mAddress.equals(item.address))
                .findAny()
                .orElse(null);

        Resources resources = Utils.getLocalizedResources(this);
        String request_from_msg = resources.getString(R.string.request_from);
        String unlisted_msg = resources.getString(R.string.unlisted);
        String waiting_for_gps_fix = resources.getString(R.string.waiting_for_gps_fix);
        String could_not_get_gps_fix = resources.getString(R.string.could_not_get_gps_fix);

        mTitle = String.format(request_from_msg,
                mContactFound != null ?
                        mContactFound.name :
                        " " + unlisted_msg + " " + mAddress);
        mResponseStatus = "ok";

        Notification notification = NotificationHandler.getInstance(this)
                .createNotification(mTitle, waiting_for_gps_fix, null, true);
        startForeground(startId, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);

        if (!hasFineLocationPermission()) {
            Log.w(LOG_TAG, "ACCESS_FINE_LOCATION not granted");
            mDetails.add(could_not_get_gps_fix);
            finishOnce(null);
            return START_NOT_STICKY;
        }
        if (!hasSendSmsPermission()) {
            Log.w(LOG_TAG, "SEND_SMS not granted");
            finishOnce(null);
            return START_NOT_STICKY;
        }
        if (!isLocationServicesEnabled()) {
            Log.w(LOG_TAG, "location services disabled");
            mDetails.add(could_not_get_gps_fix);
            finishOnce(null);
            return START_NOT_STICKY;
        }

        Log.i(LOG_TAG, "Waiting for GPS fix (no network/last-known)");
        try {
            startGpsUpdates();
            scheduleTimeout(could_not_get_gps_fix);
        } catch (Exception e) {
            Log.e(LOG_TAG, e.toString());
            mDetails.add(e.getMessage());
            finishOnce(null);
        }
        return START_NOT_STICKY;
    }

    private void scheduleTimeout(String couldNotGetGpsFix) {
        cancelTimeout();
        timeoutRunnable = () -> {
            if (finished) {
                return;
            }
            clearLocationUpdates();
            if (bestGpsFix != null) {
                Log.i(LOG_TAG, "GPS timeout — sending best fix acc=" + bestGpsFix.getAccuracy());
                finishOnce(bestGpsFix);
            } else {
                Log.w(LOG_TAG, "GPS timeout — no fix, sending invalid");
                mDetails.add(couldNotGetGpsFix);
                finishOnce(null);
            }
        };
        timeoutHandler.postDelayed(timeoutRunnable, GPS_TIMEOUT_MS);
    }

    private void cancelTimeout() {
        if (timeoutRunnable != null) {
            timeoutHandler.removeCallbacks(timeoutRunnable);
            timeoutRunnable = null;
        }
    }

    private synchronized void finishOnce(@Nullable Location loc) {
        if (finished) {
            return;
        }
        finished = true;
        cancelTimeout();
        clearLocationUpdates();
        taskFinished(loc, mContactFound);
    }

    protected void taskFinished(@Nullable Location loc, @Nullable ContactData contactFound) {
        Resources resources = Utils.getLocalizedResources(this);
        String response_msg = resources.getString(R.string.response);
        String invalid_msg = resources.getString(R.string.invalid);
        String gps_data_invalid_msg = resources.getString(R.string.gps_data_invalid);
        String error_msg = resources.getString(R.string.error);
        String missing_send_sms_permission_msg = resources.getString(R.string.missing_send_sms_permission);

        GpsData gpsData = GpsData.fromLocation(loc, Utils.getBatteryPercent(this));
        if (!gpsData.dataValid()) {
            mResponseStatus = invalid_msg;
            mDetails.add(gps_data_invalid_msg);
        }

        if (!Utils.sendSms(this, mAddress, Constants.RESPONSE_CODE + gpsData.toSmsText())) {
            mResponseStatus = error_msg;
            mDetails.add(missing_send_sms_permission_msg);
        }

        if (contactFound != null) {
            ResponseData response = new ResponseData(0L, Constants.RESPONSE_TYPE_SENT,
                    contactFound.contactId, contactFound.address,
                    gpsData.lat, gpsData.lon, gpsData.ts, gpsData.alt_m,
                    gpsData.v_kmh, gpsData.acc_m, gpsData.bat_p, gpsData.message);
            ResponseStore.addResponse(this, response);
        }

        stopForeground(true);
        NotificationHandler.getInstance(this).createAndPostNotification(
                mTitle, response_msg + " " + mResponseStatus, mDetails.toString());
        stopSelf();
    }

    private boolean hasFineLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasSendSmsPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS)
                == PackageManager.PERMISSION_GRANTED;
    }

    private void considerGpsFix(@NonNull Location location) {
        if (!LocationManager.GPS_PROVIDER.equals(location.getProvider())
                && location.getProvider() != null) {
            // Ignore non-GPS providers if the platform tags them.
            Log.d(LOG_TAG, "Ignoring non-GPS provider: " + location.getProvider());
            return;
        }
        if (!isBetterFix(location, bestGpsFix)) {
            return;
        }
        bestGpsFix = location;
        Log.i(LOG_TAG, "Best GPS so far acc=" + location.getAccuracy() + "m");
        if (location.hasAccuracy() && location.getAccuracy() <= GOOD_ACCURACY_M) {
            Log.i(LOG_TAG, "Good accuracy reached — replying");
            finishOnce(location);
        }
    }

    /** Prefer lower accuracy radius; if equal/unknown, prefer newer. */
    private static boolean isBetterFix(@NonNull Location candidate, @Nullable Location current) {
        if (current == null) {
            return true;
        }
        boolean candHas = candidate.hasAccuracy();
        boolean curHas = current.hasAccuracy();
        if (candHas && curHas) {
            if (candidate.getAccuracy() < current.getAccuracy()) {
                return true;
            }
            if (candidate.getAccuracy() > current.getAccuracy()) {
                return false;
            }
        } else if (candHas) {
            return true;
        } else if (curHas) {
            return false;
        }
        return candidate.getTime() > current.getTime();
    }

    public void clearLocationUpdates() {
        if (locationManager != null && locationListener != null) {
            locationManager.removeUpdates(locationListener);
            locationListener = null;
            locationManager = null;
        }
    }

    public Boolean isLocationServicesEnabled() {
        LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        return LocationManagerCompat.isLocationEnabled(lm);
    }

    @SuppressLint("MissingPermission")
    private void startGpsUpdates() {
        clearLocationUpdates();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);

        locationListener = new LocationListener() {
            @Override
            public void onLocationChanged(@NonNull Location location) {
                considerGpsFix(location);
            }
        };

        // GPS only — never NETWORK / fused / last-known.
        locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                1000L,
                0,
                locationListener
        );
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        cancelTimeout();
        clearLocationUpdates();
        super.onDestroy();
    }
}
