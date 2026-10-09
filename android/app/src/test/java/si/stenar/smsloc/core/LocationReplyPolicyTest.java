package si.stenar.smsloc.core;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
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

  @Test
  public void deniesNullContactEntry() {
    List<ContactData> contacts = new ArrayList<>();
    contacts.add(null);
    assertFalse(LocationReplyPolicy.mayReply("+38640111222", contacts));
  }

  @Test
  public void allowsMatchAfterNullContactEntry() {
    List<ContactData> contacts = Arrays.asList(null, contact("+38640111222"));
    assertTrue(LocationReplyPolicy.mayReply("+38640111222", contacts));
  }

  @Test
  public void locationSmsIsNullWhenAddressIsNotWhitelisted() {
    List<ContactData> contacts = Collections.singletonList(contact("+38640111222"));
    assertNull(LocationReplyPolicy.locationSms("+38640999888", contacts, "46,14"));
  }

  @Test
  public void locationSmsPrefixesWhitelistedGpsText() {
    List<ContactData> contacts = Collections.singletonList(contact("+38640111222"));
    assertEquals("Loc:46,14", LocationReplyPolicy.locationSms("+38640111222", contacts, "46,14"));
  }

  @Test
  public void sentResponseIsNotRecordedWhenSmsWasNotSent() {
    assertFalse(LocationReplyPolicy.shouldRecordSent(null, contact("+38640111222"), false));
  }

  @Test
  public void sentResponseIsRecordedWhenSmsWasSent() {
    assertTrue(LocationReplyPolicy.shouldRecordSent("Loc:46,14", contact("+38640111222"), true));
  }

  @Test
  public void sentResponseIsNotRecordedWhenSendFails() {
    assertFalse(LocationReplyPolicy.shouldRecordSent("Loc:46,14", contact("+38640111222"), false));
  }

  @Test
  public void sentResponseIsNotRecordedWithoutContact() {
    assertFalse(LocationReplyPolicy.shouldRecordSent("Loc:46,14", null, true));
  }

  @Test
  public void sentResponseIsNotRecordedWithoutBody() {
    assertFalse(LocationReplyPolicy.shouldRecordSent(null, contact("+38640111222"), true));
  }

  @Test
  public void blockedFinishStatusReplacesOk() {
    assertEquals(
        "Not whitelisted", LocationReplyPolicy.finishStatus(null, "ok", "Not whitelisted"));
  }

  @Test
  public void sentFinishStatusKeepsCurrentStatus() {
    assertEquals("ok", LocationReplyPolicy.finishStatus("Loc:46,14", "ok", "Not whitelisted"));
  }
}
