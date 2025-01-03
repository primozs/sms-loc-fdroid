package si.stenar.smsloc.plugins.Sms;

public interface SmsSenderResultCallback {
    void success(String message);
    void error(String message);
}
