package si.stenar.smsloc.plugins.Sms;

import android.Manifest;
import android.telephony.SmsMessage;

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
import java.util.Objects;

@CapacitorPlugin(
        name= "Sms",
        permissions = {
                @Permission(
                        strings = {Manifest.permission.SEND_SMS, Manifest.permission.RECEIVE_SMS},
                        alias = SmsPlugin.SMS
                )
        }
)
public class SmsPlugin extends Plugin {
    static final String SMS = "SMS";
    private SmsReceiver smsReceiver;
    private SmsSender smsSender;
    private final Map<String, PluginCall> watchingCalls = new HashMap<>();

    @Override
    public void load() {
        smsReceiver = new SmsReceiver(getContext());
        smsSender = new SmsSender(getContext());
    }

    @PluginMethod
    public void sendSms(PluginCall call) {
        if (!smsSender.isSendSmsSupported()) {
            call.reject("Sms send is not supported.");
            return;
        }

        String alias = getAlias(call);
        if (getPermissionState(alias) != PermissionState.GRANTED) {
            requestPermissionForAlias(alias, call, "completeSendSms");
        } else {
            sendSmsPrivate(call);
        }
    }

    @PluginMethod
    public void completeSendSms(PluginCall call) {
        if (getPermissionState(SmsPlugin.SMS) == PermissionState.GRANTED) {
            sendSmsPrivate(call);
        } else {
            call.reject("Sms permissions were denied");
        }
    }

    private void sendSmsPrivate(PluginCall call) {
        try {
            String delimiter = ";";
            if (android.os.Build.MANUFACTURER.equalsIgnoreCase("Samsung")) {
                delimiter = ",";
            }
            String address = call.getString("address", "");
            String message = call.getString("message", "");
            boolean isIntent = call.getBoolean("androidIntent", false);
            boolean replaceLineBreaks = call.getBoolean("replaceLineBreaks", false);

            if (replaceLineBreaks && message != null) {
                message = message.replace("\\n", Objects.requireNonNull(System.getProperty("line.separator")));
            }
            if (address != null) {
                address =  String.join(delimiter, address.split(";"));
            }

            if (isIntent) {
                smsSender.invokeSmsIntent(address, message);
                JSObject ret = new JSObject();
                ret.put("status", "ok");
                call.resolve(ret);
            } else {
                smsSender.send(address, message, new SmsSenderResultCallback() {
                    @Override
                    public void success(String message) {
                        JSObject ret = new JSObject();
                        ret.put("status", message);
                        call.resolve(ret);
                    }

                    @Override
                    public void error(String message) {
                        call.reject("Sending sms error: " + message);
                    }
                });
            }
        } catch (Exception e) {
            call.reject("Error parsing params");
        }
    }

    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void watchSms(PluginCall call) {
        call.setKeepAlive(true);
        String alias = getAlias(call);
        if (getPermissionState(alias) != PermissionState.GRANTED) {
            requestPermissionForAlias(alias, call, "completeWatchSms");
        } else {
            startWatch(call);
        }
    }

    @PermissionCallback
    public void completeWatchSms(PluginCall call) {
        if (getPermissionState(SmsPlugin.SMS) == PermissionState.GRANTED) {
            startWatch(call);
        } else {
            call.reject("Sms permissions were denied");
        }
    }

    private void startWatch(PluginCall call) {
        smsReceiver.requestSmsUpdates(new SmsReceiverResultCallback() {
            @Override
            public void success(SmsMessage[] sms) {
                call.resolve(smsToJsObject(sms));
            }

            @Override
            public void error(String message) {
                call.reject(message);
            }
        });

        watchingCalls.put(call.getCallbackId(), call);
    }

    @PluginMethod
    public void clearSmsWatch(PluginCall call) {
        String callbackId = call.getString("id");

        if (callbackId != null) {
            PluginCall removed = watchingCalls.remove(callbackId);
            if (removed != null) {
                removed.release(bridge);
            }

            smsReceiver.clearSmsUpdates();

            call.resolve();
        } else {
            call.reject("Watch call id must be provided");
        }
    }

    private JSObject smsToJsObject (SmsMessage[] smsMessages) {
        JSObject ret = new JSObject();
        String messageBody = "";
        ret.put("address", smsMessages[0].getOriginatingAddress());
        for (int i = 0; i < smsMessages.length; i++) {
            messageBody += smsMessages[i].getMessageBody().toString();
        }
        ret.put("body", messageBody);
        ret.put("date_sent", smsMessages[0].getTimestampMillis());
        ret.put("date", System.currentTimeMillis());
        return ret;
    }


    private String getAlias(PluginCall call) {
        String alias = SmsPlugin.SMS;
        return  alias;
    }
}
