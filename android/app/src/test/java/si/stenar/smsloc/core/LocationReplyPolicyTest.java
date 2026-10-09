package si.stenar.smsloc.core;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.Collections;
import java.util.List;
import org.junit.Test;
import si.stenar.smsloc.data.ContactData;

public class LocationReplyPolicyTest {
  private static ContactData contact(String address) {
    return new ContactData(1L, "c1", "Ada", address, null);
  }

  @Test
  public void allowsExactStoredAddress() {
    List<ContactData> contacts = Collections.singletonList(contact("+38640111222"));
    assertTrue(LocationReplyPolicy.mayReply("+38640111222", contacts));
  }

  @Test
  public void deniesNullEmptyAndUnknown() {
    List<ContactData> contacts = Collections.singletonList(contact("+38640111222"));
    assertFalse(LocationReplyPolicy.mayReply(null, contacts));
    assertFalse(LocationReplyPolicy.mayReply("", contacts));
    assertFalse(LocationReplyPolicy.mayReply("+38640111222", null));
    assertFalse(LocationReplyPolicy.mayReply("+38640999888", contacts));
    assertFalse(LocationReplyPolicy.mayReply("+38640111222", Collections.emptyList()));
  }

  @Test
  public void deniesDifferentFormatting() {
    List<ContactData> contacts = Collections.singletonList(contact("+38640111222"));
    assertFalse(LocationReplyPolicy.mayReply("+386 40 111 222", contacts));
    assertFalse(LocationReplyPolicy.mayReply("040111222", contacts));
  }
}
