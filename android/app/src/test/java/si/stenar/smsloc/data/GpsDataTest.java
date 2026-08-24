package si.stenar.smsloc.data;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class GpsDataTest {
  private static final String MSG = "LAST_KNOWN";

  @Test
  public void toSmsText_omitsMessageWhenEmpty() {
    GpsData data =
        new GpsData(46.0511, 14.5051, 300, 1_700_000_000_000L, 0, 15, 80, "");
    String sms = data.toSmsText();
    assertFalse(sms.contains("," + MSG));
    assertEquals(7, sms.split(",", -1).length);
  }

  @Test
  public void toSmsText_appendsNonEmptyMessage() {
    GpsData data =
        new GpsData(46.0511, 14.5051, 300, 1_700_000_000_000L, 0, 15, 80, MSG);
    String sms = data.toSmsText();
    assertTrue(sms.endsWith("," + MSG));
    assertEquals(MSG, sms.split(",", 8)[7]);
  }

  @Test
  public void fromSmsText_roundTripsMessage() {
    GpsData original =
        new GpsData(46.0511, 14.5051, 300, 1_700_000_000_000L, 0, 15, 80, MSG);
    GpsData parsed = GpsData.fromSmsText(original.toSmsText());
    assertTrue(parsed.dataValid());
    assertEquals(MSG, parsed.message);
  }
}
