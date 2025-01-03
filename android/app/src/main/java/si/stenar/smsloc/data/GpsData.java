package si.stenar.smsloc.data;

import android.location.Location;
import android.util.Log;

import androidx.annotation.Nullable;

import si.stenar.smsloc.core.Constants;

public class GpsData {
    public final Double lat;   //   = -Double.MAX_VALUE;
    public final Double lon;   //   = -Double.MAX_VALUE;
    public final Integer alt_m;    //    = -Integer.MAX_VALUE;
    public final Long ts;     // = -Long.MAX_VALUE;
    public final Integer v_kmh;    //   = -Integer.MAX_VALUE;
    public final Integer acc_m;    //   = -Integer.MAX_VALUE;
    public final Integer bat_p; // = -Integer.MAX_VALUE;
    public final String message;

    private GpsData() {
        lat = lon = null;
        ts = null;
        alt_m = null;
        v_kmh = acc_m = bat_p = null;
        message = "";

        Log.e("GpsData", "invalid data unit");
    }

    public GpsData(Double lat, Double lon, Integer alt_m, Long ts, Integer v_kmh, Integer acc_m, Integer bat_p, String message) {
        this.lat = lat;
        this.lon = lon;
        this.alt_m = alt_m;
        this.ts = ts;
        this.v_kmh = v_kmh;
        this.acc_m = acc_m;
        this.bat_p = bat_p;
        this.message = message;
    }

    @Nullable
    public static GpsData fromLocation(final Location loc, final Integer bat_p) {
        if (loc == null) {
            return new GpsData();
        }
        return new GpsData(loc.getLatitude(), loc.getLongitude(), (int) loc.getAltitude(), loc.getTime(), (int) loc.getSpeed(), (int) loc.getAccuracy(), bat_p, "");
    }

    public static GpsData fromSmsText(String str) {
        String[] params = str.split(",", 8);
        try {
            String message = params.length == 8 ? params[7] : "";
            return new GpsData(
                    /*retval.lat      = */Double.valueOf(params[0]),
                    /*retval.lon      = */Double.valueOf(params[1]),
                    /*retval.alt_m    = */Integer.valueOf(params[2]),
                    /*retval.ts_s    = */Long.valueOf(params[3]) * 1000,
                    /*retval.v_kmh    = */Integer.valueOf(params[4]),
                    /*retval.acc_m    = */Integer.valueOf(params[5]),
                    /*retval.bat_p = */Integer.valueOf(params[6]), message);
        } catch (NumberFormatException e) {
            return new GpsData();
        } catch (ArrayIndexOutOfBoundsException e) {
            return new GpsData();
        }
    }

    @Nullable
    public String toSmsText() {
        if (!dataValid()) {
            return Constants.GPS_DATA_INVALID_ERR_STR;
        }

        Double tmp;
        /* A value in decimal degrees to an accuracy of
           4 decimal places is accurate to 11.1 meters (+/- 5.55 m) at the equator.

           the accuracy of the longitude increases the further from the equator you get.
           The accuracy of the latitude part does not increase.

           range: lat +-90, lon +-180
         */
        tmp = lat * 10000;
        double printLat = tmp.intValue() / 10000.0;

        tmp = lon * 10000;
        double printLon = tmp.intValue() / 10000.0;

        long printTs = ts / 1000;

        try {
            return printLat + "," + printLon + "," + alt_m + "," + printTs + "," + v_kmh + "," + acc_m + "," + bat_p;
        } catch (NullPointerException e) {
            return Constants.GPS_DATA_INVALID_ERR_STR;
        }
    }

    public boolean dataValid() {
        if (lat == null || lon == null || ts == null) {
            return false;
        }
        if (lat > 90.0 || lat < -90.0) {
            return false;
        }
        return !(lon > 180.0) && !(lon < -180.0);
    }
}
