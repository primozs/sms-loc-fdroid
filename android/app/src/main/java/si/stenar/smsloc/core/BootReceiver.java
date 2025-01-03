package si.stenar.smsloc.core;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import si.stenar.smsloc.MainActivity;

// https://stackoverflow.com/questions/6391902/how-do-i-start-my-app-when-the-phone-starts-on-android
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Intent serviceIntent = new Intent(context, MainActivity.class);
            serviceIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(serviceIntent);
        }
    }
}

