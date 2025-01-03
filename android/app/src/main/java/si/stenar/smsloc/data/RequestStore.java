package si.stenar.smsloc.data;

import android.content.ContentValues;
import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

public class RequestStore {
    public static final String TABLE_NAME = "requests";
    public static final String COLUMN_NAME_TYPE = "type";
    public static final String COLUMN_NAME_TS = "ts";
    public static final String COLUMN_NAME_CONTACT_ID = "contactId";
    public static final String COLUMN_NAME_ADDRESS = "address";
    private static final String LOG_TAG = RequestStore.class.getSimpleName();

    public static Long addRequest(Context context, RequestData data) {
        try {
            Sqlite sqlite = new Sqlite(context);
            SQLiteDatabase db = sqlite.getWritableDatabase();

            ContentValues values = new ContentValues();
            values.put(COLUMN_NAME_TYPE, data.type);
            values.put(COLUMN_NAME_TS, data.ts);
            values.put(COLUMN_NAME_CONTACT_ID, data.contactId);
            values.put(COLUMN_NAME_ADDRESS, data.address);
            Long rowId = db.insert(TABLE_NAME, null, values);
            return rowId;
        } catch (Exception e) {
            Log.e(LOG_TAG, e.toString());
            return -1L;
        }
    }
}
