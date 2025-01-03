package si.stenar.smsloc.core;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;

public class SmsWatcher {
    private final Context mContext;
    private BroadcastReceiver mReceiver;

    public SmsWatcher(Context context) {
        mContext = context;
    }

    public void registerReceiver(SmsWatcherResultCallback resultCallback) {
        mReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                resultCallback.action(intent.getAction());
            }
        };

        IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(Constants.INTENT_ACTION_NEW_LOCATION);
        intentFilter.addAction(Constants.INTENT_ACTION_RESPONSE_RECEIVED);
        intentFilter.addAction(Constants.INTENT_ACTION_REQUEST_RECEIVED);
        intentFilter.addAction(Constants.INTENT_ACTION_NOT_WHITELISTED);

        mContext.registerReceiver(mReceiver, intentFilter);
    }

    public void unregisterReceiver() {
        mContext.unregisterReceiver(mReceiver);
        mReceiver = null;
    }
}
