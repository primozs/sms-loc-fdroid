package si.stenar.smsloc.plugins.Locale;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import si.stenar.smsloc.core.Utils;

// https://phrase.com/blog/posts/best-practices-for-android-localization-revisited-and-expanded/
// https://developer.android.com/guide/topics/resources/app-languages#groovy
// https://developer.android.com/guide/topics/resources/runtime-changes
// AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(localeStr));

@CapacitorPlugin(name = "Locale")
public class LocalePlugin extends Plugin {
  @PluginMethod()
  public void setLocale(PluginCall call) {
    String localeStr = call.getString("value", "en");
    String newLocaleStr = Utils.setLocale(getContext(), localeStr);

    JSObject ret = new JSObject();
    ret.put("value", newLocaleStr);
    call.resolve(ret);
  }
}