package si.stenar.smsloc.core;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.Resources;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.IBinder;
import android.util.Log;
import java.util.function.Consumer;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.location.LocationManagerCompat;

import java.util.ArrayList;
import java.util.List;

import si.stenar.smsloc.data.ContactData;
import si.stenar.smsloc.data.ContactStore;
import si.stenar.smsloc.data.GpsData;
import si.stenar.smsloc.data.ResponseData;
import si.stenar.smsloc.data.ResponseStore;
import si.stenar.smsloc.plugins.GeoLocation.LocationResultCallback;
import si.stenar.smsloc.R;

public class LocationRetrieverService extends Service {
    private static final String LOG_TAG = LocationRetrieverService.class.getSimpleName();
    protected String mAddress;
    protected String mTitle;
    protected String mResponseStatus;
    protected ArrayList<String> mDetails = new ArrayList<>();
    private LocationManager locationManager;
    private LocationListener locationListener;


    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        int returnValue = super.onStartCommand(intent, flags, startId);
        mAddress = intent.getStringExtra("address");

        List<ContactData> contacts = ContactStore.getContacts(getApplication());
        ContactData contactFound = contacts.stream()
                .filter(item -> mAddress.equals(item.address))
                .findAny()
                .orElse(null);

        Resources resources = Utils.getLocalizedResources(this);
        String request_from_msg = resources.getString(R.string.request_from);
        String unlisted_msg = resources.getString(R.string.unlisted);

        mTitle = String.format(request_from_msg,
                contactFound != null ?
                        contactFound.name :
                        " " +unlisted_msg + " " + mAddress);
        mResponseStatus = "ok";

        Log.i(LOG_TAG, "Start waiting for gps fix");
        String waiting_for_gps_fix = resources.getString(R.string.waiting_for_gps_fix);
        String could_not_get_gps_fix = resources.getString(R.string.could_not_get_gps_fix);

        Notification notification = NotificationHandler.getInstance(this)
                .createNotification(mTitle, waiting_for_gps_fix, null, true);
        startForeground(startId, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);

        try {
            sendLocation(false, new LocationResultCallback() {
                @Override
                public void success(Location location) {
                    taskFinished(location, contactFound);
                }

                @Override
                public void error(String message) {
                    mDetails.add(could_not_get_gps_fix);
                }
            });
        } catch (Exception e) {
            mDetails.add(e.getMessage());
            return returnValue;
        }
        return returnValue;
    }

    protected void taskFinished(Location loc, ContactData contactFound) {
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

        ResponseData response = new ResponseData(0L, Constants.RESPONSE_TYPE_SENT, contactFound.contactId, contactFound.address, gpsData.lat, gpsData.lon, gpsData.ts, gpsData.alt_m, gpsData.v_kmh, gpsData.acc_m, gpsData.bat_p, gpsData.message);
        ResponseStore.addResponse(this, response);

        this.stopForeground(true);

        NotificationHandler.getInstance(this).createAndPostNotification(
                mTitle, response_msg + " " + mResponseStatus, mDetails.toString());

        this.stopSelf();
    }

    public void clearLocationUpdates() {
        if (locationManager != null && locationListener != null) {
            locationManager.removeUpdates(locationListener);
            locationListener = null;
            locationManager = null;
        }
    }

    public Boolean isLocationServicesEnabled() {
        LocationManager lm = (LocationManager) this.getSystemService(Context.LOCATION_SERVICE);
        return LocationManagerCompat.isLocationEnabled(lm);
    }

    @SuppressLint("MissingPermission")
    public void sendLocation(boolean enableHighAccuracy, final LocationResultCallback resultCallback) {
        clearLocationUpdates();
        locationManager = (LocationManager) this.getSystemService(Context.LOCATION_SERVICE);

        locationListener = new LocationListener() {
            @Override
            public void onLocationChanged(@NonNull Location location) {
                resultCallback.success(location);
                clearLocationUpdates();
            }
        };

        if (this.isLocationServicesEnabled()) {
            locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    5000L,
                    1,
                    locationListener
            );
        } else {
            resultCallback.error("location disabled");
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
