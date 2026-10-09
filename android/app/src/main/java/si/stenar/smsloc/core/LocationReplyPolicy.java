package si.stenar.smsloc.core;

import androidx.annotation.Nullable;

import java.util.List;

import si.stenar.smsloc.data.ContactData;

/** Exact match on stored ContactData.address. Null or empty never matches. */
final class LocationReplyPolicy {
    private LocationReplyPolicy() {}

    static boolean mayReply(@Nullable String address, @Nullable List<ContactData> contacts) {
        if (address == null || address.isEmpty() || contacts == null) {
            return false;
        }
        return contacts.stream().anyMatch(item -> address.equals(item.address));
    }
}
