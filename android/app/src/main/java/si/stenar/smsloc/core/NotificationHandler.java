package si.stenar.smsloc.core;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import java.util.Random;

import si.stenar.smsloc.MainActivity;
import si.stenar.smsloc.R;
import si.stenar.smsloc.data.LogData;
import si.stenar.smsloc.data.LogStore;

public class NotificationHandler {
    public static final String NOTIFICATION_GROUP_CHANNEL_NAME = "smsloc";
    private static NotificationHandler mInstance;
    private final Context mContext;
    private final NotificationManager mNotificationManager;

    private NotificationHandler(Context context) {
        mContext = context.getApplicationContext();

        mNotificationManager = context.getSystemService(NotificationManager.class);
        if (mNotificationManager.getNotificationChannel(NOTIFICATION_GROUP_CHANNEL_NAME) == null) {
            mNotificationManager.createNotificationChannel(new NotificationChannel(NOTIFICATION_GROUP_CHANNEL_NAME, NOTIFICATION_GROUP_CHANNEL_NAME, NotificationManager.IMPORTANCE_DEFAULT));
        }

    }

    public static final synchronized NotificationHandler getInstance(Context context) {
        if (mInstance == null) {
            mInstance = new NotificationHandler(context);
        }
        return mInstance;
    }

    private final int postNotification(Notification notification) {
        int id = new Random().nextInt();
        mNotificationManager.notify(id, notification);
        return id;
    }

    public final int createAndPostNotification(String displayName, String status, String detail) {
        return postNotification(createNotification(displayName, status, detail, false));
    }

    public final Notification createNotification(@NonNull String title, @NonNull String content, String details, boolean isOngoing) {
        StringBuilder logText = new StringBuilder(title).append(", ").append(content);


        NotificationCompat.Builder builder = new NotificationCompat.Builder(mContext, NOTIFICATION_GROUP_CHANNEL_NAME).setGroup(NOTIFICATION_GROUP_CHANNEL_NAME).setContentTitle(title).setContentText(content).setAutoCancel(true).setOngoing(isOngoing).setSmallIcon(R.drawable.notification_icon);

        if (details != null && !details.isEmpty()) {
            builder.setStyle(new NotificationCompat.BigTextStyle().bigText(String.format("%s\n%s", content, details)));
            // logText.append(", details: ").append(details);
        }

        Intent notificationIntent = new Intent(mContext, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(mContext, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        builder.setContentIntent(pendingIntent);


        LogData logData = new LogData(0L, System.currentTimeMillis(), logText.toString(), "");
        LogStore.addLog(mContext, logData);
        return builder.build();
    }
}
