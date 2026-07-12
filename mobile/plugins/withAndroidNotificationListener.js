const {
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');

/**
 * Ensures Asset Tracker NotificationListenerService is declared after prebuild.
 * The Expo module also merges its AndroidManifest; this plugin hardens the label.
 */
function withAndroidNotificationListener(config) {
  return withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    if (!app.service) app.service = [];

    const serviceName =
      'expo.modules.androidnotificationlistener.AssetTrackerNotificationListener';
    const exists = app.service.some(
      (s) => s.$?.['android:name'] === serviceName
    );

    if (!exists) {
      app.service.push({
        $: {
          'android:name': serviceName,
          'android:label': 'Asset Tracker',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name':
                    'android.service.notification.NotificationListenerService',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
}

module.exports = withAndroidNotificationListener;
