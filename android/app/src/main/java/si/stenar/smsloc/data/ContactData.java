package si.stenar.smsloc.data;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

public class ContactData {
    public final Long id;
    public final String contactId;
    public final String name;
    public final String address;
    @Nullable
    public final String image;

    public ContactData(Long id, String contactId, String name, String address, @Nullable String image) {
        this.id = id;
        this.contactId = contactId;
        this.name = name;
        this.address = address;
        this.image = image;
    }

    @NonNull
    @Override
    public String toString() {
        String separator = ", ";
        String ret = "{ " + id + separator + contactId + separator + name + separator + address + " }";
        return ret;
    }
}
