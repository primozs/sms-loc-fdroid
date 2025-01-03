// https://github.com/cordova-sms/cordova-sms-plugin
package si.stenar.smsloc.plugins.Sms;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.telephony.SmsManager;

import java.util.ArrayList;

public class SmsSender {
    private final Context context;

    public SmsSender(Context context) {
        this.context = context;
    }

    public Boolean isSendSmsSupported() {
        return context.getPackageManager().hasSystemFeature(PackageManager.FEATURE_TELEPHONY);
    }

    public void invokeSmsIntent(String address, String message) {
        Intent sendIntent;
        sendIntent = new Intent(Intent.ACTION_VIEW);
        sendIntent.putExtra("sms_body", message);
        sendIntent.putExtra("address", address);
        sendIntent.setData(Uri.parse("smsto:" + Uri.encode(address)));
        context.startActivity(sendIntent);
    }

    public void send(String address, String message, SmsSenderResultCallback resultCallback) {
        SmsManager manager = SmsManager.getDefault();
        final ArrayList<String> parts = manager.divideMessage(message);

        final BroadcastReceiver broadcastReceiver = new BroadcastReceiver() {

            boolean anyError = false; //use to detect if one of the parts failed
            int partsCount = parts.size(); //number of parts to send

            @Override
            public void onReceive(Context context, Intent intent) {
                switch (getResultCode()) {
                    case SmsManager.STATUS_ON_ICC_SENT:
                    case Activity.RESULT_OK:
                        break;
                    case SmsManager.RESULT_ERROR_GENERIC_FAILURE:
                    case SmsManager.RESULT_ERROR_NO_SERVICE:
                    case SmsManager.RESULT_ERROR_NULL_PDU:
                    case SmsManager.RESULT_ERROR_RADIO_OFF:
                        anyError = true;
                        break;
                }
                // trigger the callback only when all the parts have been sent
                partsCount--;
                if (partsCount == 0) {
                    if (anyError) {
                        resultCallback.error("broadcast receiver error");
                    } else {
                        resultCallback.success("ok");
                    }
                    context.unregisterReceiver(this);
                }
            }
        };

        String intentFilterAction = "SMS_SENT" + java.util.UUID.randomUUID().toString();
        context.registerReceiver(broadcastReceiver, new IntentFilter(intentFilterAction));

        PendingIntent sentIntent = PendingIntent.getBroadcast(context, 0, new Intent(intentFilterAction), PendingIntent.FLAG_IMMUTABLE);
        if (parts.size() > 1) {
            ArrayList<PendingIntent> sentIntents = new ArrayList<>();
            for (int i = 0; i < parts.size(); i++) {
                sentIntents.add(sentIntent);
            }
            manager.sendMultipartTextMessage(address, null, parts, sentIntents, null);
        } else {
            manager.sendTextMessage(address, null, message, sentIntent, null);
        }
    }
}
