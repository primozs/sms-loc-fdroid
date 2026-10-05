package si.stenar.smsloc.plugins.Contacts;

import static org.junit.Assert.assertEquals;

import android.provider.ContactsContract.CommonDataKinds.Phone;
import org.junit.Test;

public class ContactPhoneTypesTest {
  @Test
  public void mapsMobileType() {
    assertEquals("mobile", ContactPhoneTypes.label(Phone.TYPE_MOBILE));
  }

  @Test
  public void mapsUnknownTypeToOther() {
    assertEquals("other", ContactPhoneTypes.label(Phone.TYPE_CUSTOM));
  }
}
