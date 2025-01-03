package si.stenar.smsloc.data;

public class RequestData {
    public final Long id;
    public final String type; // 'sent' | 'received'
    public final Long ts;
    public final String contactId;
    public final String address;

    public RequestData(Long id, String type, Long ts, String contactId, String address) {
        this.id = id;
        this.type = type;
        this.ts = ts;
        this.contactId = contactId;
        this.address = address;
    }
}
