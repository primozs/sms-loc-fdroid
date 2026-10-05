package si.stenar.smsloc.plugins.Contacts;

import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import android.provider.ContactsContract.CommonDataKinds.Phone;
import android.provider.ContactsContract.CommonDataKinds.Photo;
import android.provider.ContactsContract.CommonDataKinds.StructuredName;
import android.util.Base64;

import androidx.annotation.Nullable;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URLConnection;
import java.util.ArrayList;

/** Reads name / phones / image for a contact id (whitelist pick payload). */
final class ContactReader {
  private ContactReader() {}

  /** Max contact photo bytes kept for the bridge / SQLite row. */
  static final int MAX_PHOTO_BYTES = 512 * 1024;

  @Nullable
  static String idFromUri(@Nullable Uri uri) {
    if (uri == null || !ContactsContract.AUTHORITY.equals(uri.getAuthority())) {
      return null;
    }
    try {
      long id = ContentUris.parseId(uri);
      return id >= 0 ? Long.toString(id) : null;
    } catch (Exception e) {
      return null;
    }
  }

  @Nullable
  static JSObject read(
      Context context,
      String contactId,
      boolean wantName,
      boolean wantPhones,
      boolean wantImage) {
    ArrayList<String> projection = new ArrayList<>();
    projection.add(ContactsContract.Data.MIMETYPE);
    projection.add(ContactsContract.Data.CONTACT_ID);
    if (wantName) {
      projection.add(StructuredName.DISPLAY_NAME);
    }
    if (wantPhones) {
      projection.add(Phone.NUMBER);
      projection.add(Phone.TYPE);
    }
    if (wantImage) {
      projection.add(Photo.PHOTO);
    }

    ContentResolver cr = context.getContentResolver();
    Cursor cursor =
        cr.query(
            ContactsContract.Data.CONTENT_URI,
            projection.toArray(new String[0]),
            ContactsContract.Data.CONTACT_ID + " = ?",
            new String[] {contactId},
            null);

    if (cursor == null) {
      return null;
    }

    JSObject name = new JSObject();
    JSArray phones = new JSArray();
    JSObject image = new JSObject();

    try {
      if (cursor.getCount() == 0) {
        return null;
      }
      while (cursor.moveToNext()) {
        String mime = getString(cursor, ContactsContract.Data.MIMETYPE);
        if (mime == null) {
          continue;
        }
        switch (mime) {
          case StructuredName.CONTENT_ITEM_TYPE:
            if (wantName) {
              String display = getString(cursor, StructuredName.DISPLAY_NAME);
              if (display != null) {
                name.put("display", display);
              }
            }
            break;
          case Phone.CONTENT_ITEM_TYPE:
            if (wantPhones) {
              String number = getString(cursor, Phone.NUMBER);
              Integer type = getInt(cursor, Phone.TYPE);
              if (number != null && type != null) {
                JSObject phone = new JSObject();
                phone.put("type", ContactPhoneTypes.label(type));
                phone.put("number", number);
                phones.put(phone);
              }
            }
            break;
          case Photo.CONTENT_ITEM_TYPE:
            if (wantImage) {
              String base64 = getPhotoDataUri(cursor);
              if (base64 != null) {
                image.put("base64String", base64);
              }
            }
            break;
          default:
            break;
        }
      }
    } finally {
      cursor.close();
    }

    JSObject contact = new JSObject();
    contact.put("contactId", contactId);
    if (wantName && name.length() > 0) {
      contact.put("name", name);
    }
    if (wantPhones && phones.length() > 0) {
      contact.put("phones", phones);
    }
    if (wantImage && image.length() > 0) {
      contact.put("image", image);
    }
    return contact;
  }

  @Nullable
  private static String getString(Cursor cursor, String column) {
    int index = cursor.getColumnIndex(column);
    return index >= 0 ? cursor.getString(index) : null;
  }

  @Nullable
  private static Integer getInt(Cursor cursor, String column) {
    int index = cursor.getColumnIndex(column);
    return index >= 0 ? cursor.getInt(index) : null;
  }

  @Nullable
  private static String getPhotoDataUri(Cursor cursor) {
    int index = cursor.getColumnIndex(Photo.PHOTO);
    if (index < 0) {
      return null;
    }
    byte[] blob = cursor.getBlob(index);
    if (blob == null || blob.length > MAX_PHOTO_BYTES) {
      return null;
    }
    String mimeType = "image/png";
    try {
      InputStream is = new BufferedInputStream(new ByteArrayInputStream(blob));
      String guessed = URLConnection.guessContentTypeFromStream(is);
      if (guessed != null) {
        mimeType = guessed;
      }
    } catch (Exception ignored) {
      // keep default
    }
    return "data:" + mimeType + ";base64," + Base64.encodeToString(blob, Base64.NO_WRAP);
  }
}
