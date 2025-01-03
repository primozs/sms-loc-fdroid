package si.stenar.smsloc.core;

import static android.content.Context.BATTERY_SERVICE;
import static android.content.pm.PackageManager.PERMISSION_GRANTED;

import android.Manifest;
import android.content.Context;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.os.BatteryManager;
import android.telephony.SmsManager;
import android.telephony.TelephonyManager;
import androidx.core.app.ActivityCompat;
import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;

import java.util.Locale;

public class Utils {
    public static final boolean sendSms(Context context, final String address, final String msg) {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS)
                != PERMISSION_GRANTED) {
            return false;
        }

        SmsManager.getDefault().sendTextMessage(address, null, msg, null, null);

        return true;
    }

    public static final String timeToNowHoursStr(long start) {
        long dt_s = System.currentTimeMillis() - start;
        dt_s /= 1000;

        int seconds = (int) (dt_s % 60);
        int minutes = (int) ((dt_s / 60) % 60);
        int hours = (int) ((dt_s / (60 * 60)) % 24);
        int days = (int) (dt_s / (60 * 60 * 24));

        if (days > 0) {
            return "> 1 day";
        }
        return String.format("%d h %d min", hours, minutes);
    }

    public static int getBatteryPercent(Context context) {
        return
                ((BatteryManager) context.getApplicationContext().getSystemService(BATTERY_SERVICE))
                        .getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
    }

    public static String convertToE164PhoneNumFormat(final String phoneNumStr, Context context)
            throws NumberParseException {
        TelephonyManager telephonyService
                = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);

        PhoneNumberUtil PhoneNumUtilInstance
                = PhoneNumberUtil.getInstance();

        Phonenumber.PhoneNumber phoneNumber
                = PhoneNumUtilInstance.parse(phoneNumStr, telephonyService.getSimCountryIso().toUpperCase());

        //check if it is a mobile number, because we need to be able to send SMS
        if (PhoneNumUtilInstance.getNumberType(phoneNumber) != PhoneNumberUtil.PhoneNumberType.MOBILE) {
            throw new NumberParseException(
                    NumberParseException.ErrorType.NOT_A_NUMBER, "Not a mobile number, required for SMS");
        }

        return
                PhoneNumUtilInstance.format(phoneNumber, PhoneNumberUtil.PhoneNumberFormat.E164);
    }

    public static void setLocaleString(Context context, String localeStr) {
        final String SMSLOC_PREF = "smsloc_pref";
        final String SMSLOC_LOCALE = "smsloc_locale";
        context.getSharedPreferences(SMSLOC_PREF, Context.MODE_PRIVATE).edit().putString(SMSLOC_LOCALE, localeStr).apply();
    }

    public static String getLocaleString(Context context) {
        final String SMSLOC_PREF = "smsloc_pref";
        final String SMSLOC_LOCALE = "smsloc_locale";
        return context.getSharedPreferences(SMSLOC_PREF, Context.MODE_PRIVATE).getString(SMSLOC_LOCALE, "en");
    }

    public static String setLocale (Context context, String localeStr) {
        // https://stackoverflow.com/questions/4985805/set-locale-programmatically
        setLocaleString(context, localeStr);
        return getLocaleString(context);
    }

    public static Resources getLocalizedResources(Context context) {
        String localeStr = getLocaleString(context);
        Locale desiredLocale = new Locale(localeStr);
        Configuration conf = context.getResources().getConfiguration();
        conf = new Configuration(conf);
        conf.setLocale(desiredLocale);
        Context localizedContext = context.createConfigurationContext(conf);
        return localizedContext.getResources();
    }
}
