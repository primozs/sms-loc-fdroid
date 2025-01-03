package si.stenar.smsloc;

import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import android.os.PowerManager;
import android.provider.Settings;
import android.content.Intent;
import android.content.ActivityNotFoundException;

import si.stenar.smsloc.core.CorePlugin;
import si.stenar.smsloc.plugins.Locale.LocalePlugin;
import si.stenar.smsloc.plugins.GeoLocation.GeoLocationPlugin;
import si.stenar.smsloc.plugins.Sms.SmsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LocalePlugin.class);
        registerPlugin(SmsPlugin.class);
        registerPlugin(GeoLocationPlugin.class);
        registerPlugin(CorePlugin.class);
        super.onCreate(savedInstanceState);
        _checkBatteryOptimization();
    }

    private void _checkBatteryOptimization() {
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !powerManager.isIgnoringBatteryOptimizations(getPackageName())) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setPackage(getPackageName());
                startActivity(intent);
            } catch (ActivityNotFoundException e) {
            }
        }
    }

}

