package si.stenar.smsloc.core;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import si.stenar.smsloc.MainActivity;

public class PackageReplaceReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
            Intent serviceIntent = new Intent(context, MainActivity.class);
            serviceIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(serviceIntent);
        }
    }
}


