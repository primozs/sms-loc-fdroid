package si.stenar.smsloc.plugins.Sms;

import android.telephony.SmsMessage;

public interface SmsReceiverResultCallback {
    void success(SmsMessage[] sms);
    void error(String message);
}
