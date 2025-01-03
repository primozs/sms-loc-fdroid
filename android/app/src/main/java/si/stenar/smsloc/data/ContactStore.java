package si.stenar.smsloc.data;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

import java.util.ArrayList;
import java.util.List;

public class ContactStore {
    public static final String TABLE_NAME = "contacts";
    public static final String COLUMN_NAME_ID = "id";
    public static final String COLUMN_NAME_CONTACT_ID = "contactId";
    public static final String COLUMN_NAME_NAME = "name";
    public static final String COLUMN_NAME_ADDRESS = "address";
    private static final String LOG_TAG = ContactStore.class.getSimpleName();

    public static List<ContactData> getContacts(Context context) {
        List<ContactData> contacts = new ArrayList<ContactData>();
        try {
            String[] projection = {COLUMN_NAME_ID, COLUMN_NAME_CONTACT_ID, COLUMN_NAME_NAME, COLUMN_NAME_ADDRESS};
            String selection = "";
            String[] selectionArgs = {};
            Sqlite sqlite = new Sqlite(context);
            SQLiteDatabase db = sqlite.getReadableDatabase();
            Cursor cursor = db.query(TABLE_NAME, projection, selection, selectionArgs, null, null, "");

            while (cursor.moveToNext()) {
                long id = cursor.getLong(cursor.getColumnIndexOrThrow(COLUMN_NAME_ID));
                String contactId = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_NAME_CONTACT_ID));
                String name = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_NAME_NAME));
                String address = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_NAME_ADDRESS));
                ContactData contact = new ContactData(id, contactId, name, address, null);
                contacts.add(contact);
            }
            cursor.close();
            return contacts;
        } catch (Exception e) {
            Log.e(LOG_TAG, e.toString());
            return contacts;
        }
    }
}
