package si.stenar.smsloc.data;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class Sqlite extends SQLiteOpenHelper {
    public static final int DATABASE_VERSION = 6;
    public static final String DATABASE_NAME = "smslocSQLite.db";

    public Sqlite(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }


    @Override
    public void onCreate(SQLiteDatabase db) {

    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {

    }
}
