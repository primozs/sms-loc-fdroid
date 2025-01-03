package si.stenar.smsloc.data;

public class LogData {
    public final Long id;
    public final Long ts;
    public final String message;
    public final String data;

    public LogData(Long id, Long ts, String message, String data) {
        this.id = id;
        this.ts = ts;
        this.message = message;
        this.data = data;
    }
}