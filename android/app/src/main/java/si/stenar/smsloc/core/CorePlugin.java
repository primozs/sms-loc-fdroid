package si.stenar.smsloc.core;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.location.LocationManager;
import android.net.Uri;
import android.provider.Settings;

import androidx.core.location.LocationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "Core",
        permissions = {
                @Permission(
                        strings = {
                                Manifest.permission.SEND_SMS,
                                Manifest.permission.RECEIVE_SMS,
                        },
                        alias = CorePlugin.SMS
                ),
                @Permission(
                        strings = {
                                Manifest.permission.ACCESS_COARSE_LOCATION,
                                Manifest.permission.ACCESS_FINE_LOCATION,

                        },
                        alias = CorePlugin.LOCATION
                ),
                @Permission(
                        strings = {
                                Manifest.permission.ACCESS_BACKGROUND_LOCATION,
                                Manifest.permission.FOREGROUND_SERVICE,
                        },
                        alias = CorePlugin.BACKGROUND
                ),
                @Permission(
                        strings = {
                                Manifest.permission.INTERNET,
                        },
                        alias = CorePlugin.INTERNET
                )
        })
public class CorePlugin extends Plugin {
    static final String SMS = "sms";
    static final String LOCATION = "location";
    static final String INTERNET = "internet";
    static final String BACKGROUND = "background";

    private final Map<String, PluginCall> watchingCalls = new HashMap<>();

    private SmsWatcher smsWatcher;

    @Override
    public void load() {
        smsWatcher = new SmsWatcher(getContext());
    }

    @PluginMethod
    public void checkLocationService(PluginCall call) {
        boolean isEnabled = isLocationServicesEnabled();
        JSObject ret = new JSObject();
        ret.put("isEnabled", isEnabled);
        call.resolve(ret);
    }

    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void watchSmsReceiver(PluginCall call) {
        call.setKeepAlive(true);
        if (!checkAllPermissions()) {
            requestAllPermissions(call, "completeWatchSmsReceiver");
        } else {
            startWatch(call);
        }
    }

    @PermissionCallback
    private void completeWatchSmsReceiver(PluginCall call) {
        if (checkAllPermissions()) {
            startWatch(call);
        } else {
            call.reject("Not all permissions were granted.");
        }
    }

    private void startWatch(PluginCall call) {
        smsWatcher.registerReceiver(new SmsWatcherResultCallback() {
            @Override
            public void action(String action) {
                JSObject ret = new JSObject();
                ret.put("action", action);
                call.resolve(ret);
            }
        });
        watchingCalls.put(call.getCallbackId(), call);
    }

    @PluginMethod
    public void clearSmsReceiverWatch(PluginCall call) {
        String callbackId = call.getString("id");
        if (callbackId != null) {
            smsWatcher.unregisterReceiver();
            PluginCall removed = watchingCalls.remove(callbackId);
            if (removed != null) {
                removed.release(bridge);
            }
            call.resolve();
        } else {
            call.reject("Watch call id must be provided");
        }
    }

    private boolean checkAllPermissions() {
        Map<String, PermissionState> permissions = getPermissionStates();

        boolean allGranted = true;
        for (Map.Entry<String, PermissionState> permission : permissions.entrySet()) {
            boolean isGranted = permission.getValue().equals(PermissionState.GRANTED);
            if (!isGranted) {
                allGranted = false;
                break;
            }
        }
        return allGranted;
    }

    @PluginMethod()
    public void openApplicationSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
        intent.setData(uri);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod()
    public void openLocationSettings(PluginCall call) {
        final String action = Settings.ACTION_LOCATION_SOURCE_SETTINGS;
        getActivity().startActivity(new Intent(action));
        call.resolve();
    }

    public Boolean isLocationServicesEnabled() {
        LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        return LocationManagerCompat.isLocationEnabled(lm);
    }

    @PluginMethod
    public void convertToE164PhoneNumFormat(PluginCall call) {
        String address = call.getString("address");
        try {
            String e164Address = Utils.convertToE164PhoneNumFormat(address, getContext());

            JSObject ret = new JSObject();
            ret.put("address", e164Address);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.toString());
        }
    }
}

