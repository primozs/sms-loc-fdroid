//https://github.com/andreszs/cordova-plugin-sms-receive
package si.stenar.smsloc.plugins.Sms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import android.util.Log;

public class SmsReceiver {
    private BroadcastReceiver receiver;
    private static final String SMS_RECEIVED_ACTION = "android.provider.Telephony.SMS_RECEIVED";
    private static final String LOG_TAG = "SmsReceiver";
    private final Context context;

    public SmsReceiver (Context context) {
        this.context = context;
    }

    public void requestSmsUpdates(SmsReceiverResultCallback smsResultCallback) {
        IntentFilter filter = new IntentFilter(SmsReceiver.SMS_RECEIVED_ACTION);
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent.getAction().equals(SmsReceiver.SMS_RECEIVED_ACTION)) {
                    Log.d(LOG_TAG, "SMS_RECEIVED_ACTION");
                    SmsMessage[] sms = null;
                    try {
                        sms = Telephony.Sms.Intents.getMessagesFromIntent(intent);
                    } catch (Exception e) {
                        Log.e(LOG_TAG, e.getMessage());
                        smsResultCallback.error("Sms read error");
                    }
                    // Get SMS contents as JSON
                    if (sms == null || sms.length == 0) {
                        Log.e(LOG_TAG, "SMS_EQUALS_NULL");
                    } else {
                        smsResultCallback.success(sms);
                    }
                }
            }
        };

        try {
            this.context.registerReceiver(receiver, filter);
        } catch (Exception e) {
            Log.e(LOG_TAG, e.getMessage());
            smsResultCallback.error("Sms receiver init error: " + e.toString());
        }
    }

    public void clearSmsUpdates() {
        try {
            this.context.unregisterReceiver(receiver);
        } catch (Exception e) {
            Log.e(LOG_TAG, e.getMessage());
        } finally {
            receiver = null;
        }
    }
}
