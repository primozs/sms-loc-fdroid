package si.stenar.smsloc.data;

public class ResponseData {
    public final Long id;
    public final String type; // 'sent' | 'received'
    public final String contactId;
    public final String address;
    public final Double lat;
    public final Double lon;
    public final Long ts;
    public final Integer alt_m;
    public final Integer v_kmh;
    public final Integer acc_m;
    public final Integer bat_p;
    public final String message;

    public ResponseData(Long id, String type, String contactId, String address, Double lat, Double lon, Long ts, Integer alt_m, Integer v_kmh, Integer acc_m, Integer bat_p, String message) {
        this.id = id;
        this.type = type;
        this.contactId = contactId;
        this.address = address;
        this.lat = lat;
        this.lon = lon;
        this.ts = ts;
        this.alt_m = alt_m;
        this.v_kmh = v_kmh;
        this.acc_m = acc_m;
        this.bat_p = bat_p;
        this.message = message;
    }
}