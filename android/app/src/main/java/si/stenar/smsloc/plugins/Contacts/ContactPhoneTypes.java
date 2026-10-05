package si.stenar.smsloc.plugins.Contacts;

import android.provider.ContactsContract.CommonDataKinds.Phone;

/** Maps Android phone type ints to the string labels ContactStore.addContact expects. */
final class ContactPhoneTypes {
  private ContactPhoneTypes() {}

  static String label(int type) {
    if (type == Phone.TYPE_MOBILE) {
      return "mobile";
    }
    if (type == Phone.TYPE_HOME) {
      return "home";
    }
    if (type == Phone.TYPE_WORK) {
      return "work";
    }
    if (type == Phone.TYPE_MAIN) {
      return "main";
    }
    if (type == Phone.TYPE_WORK_MOBILE) {
      return "work_mobile";
    }
    if (type == Phone.TYPE_CUSTOM) {
      return "custom";
    }
    return "other";
  }
}
