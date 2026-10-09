package si.stenar.smsloc.core;

import androidx.annotation.Nullable;

import java.util.List;

import si.stenar.smsloc.data.ContactData;

/** Exact match on stored ContactData.address. Null or empty never matches. */
final class LocationReplyPolicy {
    private LocationReplyPolicy() {}

    static boolean mayReply(@Nullable String address, @Nullable List<ContactData> contacts) {
        return matchingContact(address, contacts) != null;
    }

    /** First exact address match. A null row is skipped, not a crash. */
    @Nullable
    static ContactData matchingContact(@Nullable String address, @Nullable List<ContactData> contacts) {
        if (address == null || address.isEmpty() || contacts == null) {
            return null;
        }
        for (ContactData item : contacts) {
            if (item != null && address.equals(item.address)) {
                return item;
            }
        }
        return null;
    }

    /** Loc: plus GPS text for an exact whitelist match. Otherwise nothing to send. */
    @Nullable
    static String locationSms(
            @Nullable String address, @Nullable List<ContactData> contacts, @Nullable String gpsText) {
        if (gpsText == null || matchingContact(address, contacts) == null) {
            return null;
        }
        return Constants.RESPONSE_CODE + gpsText;
    }

    /** A sent row is recorded only after Utils.sendSms accepted the message. */
    static boolean shouldRecordSent(
            @Nullable String smsBody, @Nullable ContactData contact, boolean sent) {
        return sent && smsBody != null && contact != null;
    }

    /** A whitelisted request is still waiting for its GPS fix. */
    static boolean requestPending(@Nullable String currentAddress, boolean finished) {
        return currentAddress != null && !finished;
    }

    /** No SMS body replaces the current status with the blocked label. */
    static String finishStatus(
            @Nullable String smsBody, String currentStatus, String blockedStatus) {
        return smsBody == null ? blockedStatus : currentStatus;
    }
}
