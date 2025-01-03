# info

## settings

## extra dependencies in build.gradle

```txt
    to work without google services
    implementation 'com.mapbox.mapboxsdk:mapbox-android-core:3.1.0'
    implementation 'androidx.localbroadcastmanager:localbroadcastmanager:1.0.0'
```

## permissions manifest

```txt
for normal location access:
  getCurrentPosition,
  watchPosition
  https://capacitorjs.com/docs/apis/geolocation

  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-feature android:name="android.hardware.location.gps" />

to use background api's:
  addBackgroundWatcher
  removeBackgroundWatcher
  https://github.com/capacitor-community/background-geolocation

    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-feature android:name="android.hardware.location.gps" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

<service
    android:name="si.stenar.smsloc.plugins.GeoLocation.GeoLocationBackgroundService"
    android:enabled="true"
    android:exported="true"
    android:foregroundServiceType="location"
    />

string.xml
    <string name="capacitor_background_geolocation_notification_channel_name">
        SMSLoc background gps
    </string>
    <string name="capacitor_background_geolocation_notification_icon">drawable/notification_icon</string>
```
