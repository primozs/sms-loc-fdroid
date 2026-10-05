package si.stenar.smsloc.plugins.Contacts;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.ContactsContract;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;

@CapacitorPlugin(
        name = "Contacts",
        permissions = {
                @Permission(
                        strings = {Manifest.permission.READ_CONTACTS},
                        alias = ContactsPlugin.CONTACTS)
        })
public class ContactsPlugin extends Plugin {
  static final String CONTACTS = "contacts";
  /** Rejected when the user dismisses the system picker without selecting. */
  static final String ERROR_PICK_CANCELLED = "PICK_CANCELLED";

  @PluginMethod
  public void pickContact(PluginCall call) {
    if (getPermissionState(CONTACTS) != PermissionState.GRANTED) {
      requestPermissionForAlias(CONTACTS, call, "permissionCallback");
      return;
    }
    openPicker(call);
  }

  @PermissionCallback
  private void permissionCallback(PluginCall call) {
    if (getPermissionState(CONTACTS) != PermissionState.GRANTED) {
      call.reject("Permission is required to access contacts.");
      return;
    }
    if ("pickContact".equals(call.getMethodName())) {
      openPicker(call);
    }
  }

  private void openPicker(PluginCall call) {
    Intent intent = new Intent(Intent.ACTION_PICK, ContactsContract.Contacts.CONTENT_URI);
    startActivityForResult(call, intent, "pickContactResult");
  }

  @ActivityCallback
  private void pickContactResult(PluginCall call, ActivityResult activityResult) {
    if (call == null) {
      return;
    }
    if (activityResult.getResultCode() != Activity.RESULT_OK || activityResult.getData() == null) {
      call.reject("Contact pick cancelled.", ERROR_PICK_CANCELLED);
      return;
    }

    Uri uri = activityResult.getData().getData();
    String contactId = ContactReader.idFromUri(uri);
    if (contactId == null) {
      call.reject("Invalid contact URI from pick.");
      return;
    }

    JSONObject projection =
        call.getObject("projection") != null ? call.getObject("projection") : new JSONObject();
    boolean wantName = projection.optBoolean("name", true);
    boolean wantPhones = projection.optBoolean("phones", true);
    boolean wantImage = projection.optBoolean("image", false);

    JSObject contact =
        ContactReader.read(getContext(), contactId, wantName, wantPhones, wantImage);
    if (contact == null) {
      call.reject("Contact not found.");
      return;
    }

    JSObject result = new JSObject();
    result.put("contact", contact);
    call.resolve(result);
  }
}
