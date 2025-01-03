package si.stenar.smsloc.data;

import android.content.ContentValues;
import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

public class ResponseStore {
    public static final String TABLE_NAME = "responses";
    public static final String COLUMN_NAME_TYPE = "type";
    public static final String COLUMN_NAME_CONTACT_ID = "contactId";
    public static final String COLUMN_NAME_ADDRESS = "address";
    public static final String COLUMN_NAME_LAT = "lat";
    public static final String COLUMN_NAME_LON = "lon";
    public static final String COLUMN_NAME_TS = "ts";
    public static final String COLUMN_NAME_ALT = "alt_m";
    public static final String COLUMN_NAME_V_KMH = "v_kmh";
    public static final String COLUMN_NAME_V_ACC_M = "acc_m";
    public static final String COLUMN_NAME_V_BAT_P = "bat_p";
    public static final String COLUMN_NAME_MESSAGE = "message";
    private static final String LOG_TAG = RequestStore.class.getSimpleName();

    public static Long addResponse(Context context, ResponseData data) {
        try {
            Sqlite sqlite = new Sqlite(context);
            SQLiteDatabase db = sqlite.getWritableDatabase();

            ContentValues values = new ContentValues();
            values.put(COLUMN_NAME_TYPE, data.type);
            values.put(COLUMN_NAME_CONTACT_ID, data.contactId);
            values.put(COLUMN_NAME_ADDRESS, data.address);
            values.put(COLUMN_NAME_LAT, data.lat);
            values.put(COLUMN_NAME_LON, data.lon);
            values.put(COLUMN_NAME_TS, data.ts);
            values.put(COLUMN_NAME_ALT, data.alt_m);
            values.put(COLUMN_NAME_V_KMH, data.v_kmh);
            values.put(COLUMN_NAME_V_ACC_M, data.acc_m);
            values.put(COLUMN_NAME_V_BAT_P, data.bat_p);
            values.put(COLUMN_NAME_MESSAGE, data.message);

            Long rowId = db.insert(TABLE_NAME, null, values);
            return rowId;
        } catch (Exception e) {
            Log.e(LOG_TAG, e.toString());
            return -1L;
        }
    }
}
