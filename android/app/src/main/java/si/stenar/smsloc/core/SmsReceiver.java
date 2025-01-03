package si.stenar.smsloc.core;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import android.util.Log;

import java.util.List;

import si.stenar.smsloc.R;
import si.stenar.smsloc.data.ContactData;
import si.stenar.smsloc.data.ContactStore;
import si.stenar.smsloc.data.GpsData;
import si.stenar.smsloc.data.LogData;
import si.stenar.smsloc.data.LogStore;
import si.stenar.smsloc.data.RequestData;
import si.stenar.smsloc.data.RequestStore;
import si.stenar.smsloc.data.ResponseData;
import si.stenar.smsloc.data.ResponseStore;

public class SmsReceiver extends BroadcastReceiver {
    private final String LOG_TAG = "AppSmsReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) {
            return;
        }

        SmsMessage[] msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent);
        for (SmsMessage msg : msgs) {
            try {
                if (msg == null) continue;
                String address = Utils.convertToE164PhoneNumFormat(msg.getOriginatingAddress(), context);
                String smsCodeMaybe = msg.getDisplayMessageBody().substring(0, Constants.REQUEST_CODE.length());
                String smsGeoDataMaybe = msg.getDisplayMessageBody().substring(Constants.RESPONSE_CODE.length());

                String action;
                switch (smsCodeMaybe) {
                    case Constants.REQUEST_CODE:
                        action = handleRequest(context, address);
                        break;
                    case Constants.RESPONSE_CODE:
                        action = handleResponse(context, address, smsGeoDataMaybe);
                        break;
                    default:
                        continue;
                }
                Intent bIntent = new Intent(action);
                bIntent.putExtra("address", address);
                context.sendBroadcast(bIntent);
            } catch (Exception e) {
                Log.e(LOG_TAG, e.toString());
                LogStore.addLog(context, new LogData(0L, System.currentTimeMillis(), LOG_TAG, e.toString()));
            }
        }
    }

    protected String handleResponse(Context context, final String address, final String smsGeoDataMaybe) {
        GpsData location = GpsData.fromSmsText(smsGeoDataMaybe);
        List<ContactData> contacts = ContactStore.getContacts(context);
        ContactData contactFound = contacts.stream().filter(item -> address.equals(item.address)).findAny().orElse(null);

        Resources resources = Utils.getLocalizedResources(context);

        String location_valid_msg = resources.getString(R.string.location_valid);
        String location_invalid_msg = resources.getString(R.string.location_invalid);
        String response_from_msg = resources.getString(R.string.response_from);
        String response_from_unlisted_msg = resources.getString(R.string.response_from_unlisted);
        String location_msg = resources.getString(R.string.location);
        String location_from_time_msg = resources.getString(R.string.location_from_time);

        String summary;

        if (contactFound != null) {
            summary = String.format(response_from_msg, contactFound.name);
        } else {
            summary = String.format(response_from_unlisted_msg, address);
        }

        final String status = location_msg + " " + (location.dataValid() ? location_valid_msg : location_invalid_msg);

        final String details = location.dataValid() ? String.format(location_from_time_msg, Utils.timeToNowHoursStr(location.ts)) : smsGeoDataMaybe;

        NotificationHandler.getInstance(context).createAndPostNotification(summary, status, details);

        String action;
        if (location.dataValid()) {
            if (contactFound != null) {
                ResponseData response = new ResponseData(0L, Constants.RESPONSE_TYPE_RECEIVED, contactFound.contactId, contactFound.address, location.lat, location.lon, location.ts, location.alt_m, location.v_kmh, location.acc_m, location.bat_p, location.message);
                ResponseStore.addResponse(context, response);
            }
            action = Constants.INTENT_ACTION_NEW_LOCATION;
        } else {
            action = Constants.INTENT_ACTION_RESPONSE_RECEIVED;
        }

        return action;
    }

    protected String handleRequest(Context context, final String address) {
        List<ContactData> contacts = ContactStore.getContacts(context);
        ContactData contactFound = contacts.stream().filter(item -> address.equals(item.address)).findAny().orElse(null);

        Resources resources = Utils.getLocalizedResources(context);
        String missing_send_sms_permission_msg = resources.getString(R.string.missing_send_sms_permission);
        String not_whitelisted_msg = resources.getString(R.string.not_whitelisted);
        String request_from_unlisted_msg = resources.getString(R.string.request_from_unlisted);
        String response_error_msg = resources.getString(R.string.response_error);

        String action;
        RequestData requestData;
        if (contactFound != null) {
            Intent intent = new Intent(context.getApplicationContext(), LocationRetrieverService.class);
            intent.putExtra("address", address);
            context.getApplicationContext().startForegroundService(intent);

            action = Constants.INTENT_ACTION_REQUEST_RECEIVED;
            requestData = new RequestData(0L, Constants.REQUEST_TYPE_RECEIVED, System.currentTimeMillis(), contactFound.contactId, address);
        } else {
            requestData = new RequestData(0L, Constants.REQUEST_TYPE_RECEIVED, System.currentTimeMillis(), "", address);
            final String smsText = Constants.RESPONSE_CODE + not_whitelisted_msg;
            final String summary = String.format(request_from_unlisted_msg, address);
            final String status = response_error_msg;

            String errStr = not_whitelisted_msg;

            if (!Utils.sendSms(context, address, smsText)) {
                errStr += ", " + missing_send_sms_permission_msg;
            }
            NotificationHandler.getInstance(context).createAndPostNotification(summary, status, errStr);
            action = Constants.INTENT_ACTION_NOT_WHITELISTED;
        }
        RequestStore.addRequest(context, requestData);

        return action;
    }
}

