package si.stenar.smsloc.data;

import android.content.ContentValues;
import android.content.Context;
import android.database.sqlite.SQLiteDatabase;

public class LogStore {
    public static final String TABLE_NAME = "logs";
    public static final String COLUMN_NAME_ID = "id";
    public static final String COLUMN_NAME_TS = "ts";
    public static final String COLUMN_NAME_MESSAGE = "message";
    public static final String COLUMN_NAME_DATA = "data";

    public static Long addLog(Context context, LogData data) {
        try {
            Sqlite sqlite = new Sqlite(context);
            SQLiteDatabase db = sqlite.getWritableDatabase();

            ContentValues values = new ContentValues();
            values.put(COLUMN_NAME_TS, data.ts);
            values.put(COLUMN_NAME_MESSAGE, data.message);
            values.put(COLUMN_NAME_DATA, data.data);

            Long rowId = db.insert(TABLE_NAME, null, values);
            return rowId;
        } catch (Exception e) {
            return -1L;
        }
    }
}
