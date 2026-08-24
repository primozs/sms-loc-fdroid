package si.stenar.smsloc.data;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import si.stenar.smsloc.core.Constants;

public class GpsDataTest {
  @Test
  public void toSmsText_omitsMessageWhenEmpty() {
    GpsData data =
        new GpsData(46.0511, 14.5051, 300, 1_700_000_000_000L, 0, 15, 80, "");
    String sms = data.toSmsText();
    assertFalse(sms.contains(",LAST_KNOWN"));
    assertEquals(7, sms.split(",", -1).length);
  }

  @Test
  public void toSmsText_appendsLastKnownMessage() {
    GpsData data =
        new GpsData(
            46.0511,
            14.5051,
            300,
            1_700_000_000_000L,
            0,
            15,
            80,
            Constants.MSG_LAST_KNOWN);
    String sms = data.toSmsText();
    assertTrue(sms.endsWith("," + Constants.MSG_LAST_KNOWN));
    assertEquals(Constants.MSG_LAST_KNOWN, sms.split(",", 8)[7]);
  }

  @Test
  public void fromSmsText_roundTripsLastKnown() {
    GpsData original =
        new GpsData(
            46.0511,
            14.5051,
            300,
            1_700_000_000_000L,
            0,
            15,
            80,
            Constants.MSG_LAST_KNOWN);
    GpsData parsed = GpsData.fromSmsText(original.toSmsText());
    assertTrue(parsed.dataValid());
    assertEquals(Constants.MSG_LAST_KNOWN, parsed.message);
  }
}
