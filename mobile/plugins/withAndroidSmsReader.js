const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/**
 * Ensures READ_SMS / RECEIVE_SMS are declared for bank SMS ingest.
 */
function withAndroidSmsReader(config) {
  config = AndroidConfig.Permissions.withPermissions(config, [
    'android.permission.READ_SMS',
    'android.permission.RECEIVE_SMS',
  ]);

  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }
    const perms = new Set(
      (manifest['uses-permission'] || []).map((p) => p.$?.['android:name']).filter(Boolean)
    );
    for (const name of [
      'android.permission.READ_SMS',
      'android.permission.RECEIVE_SMS',
    ]) {
      if (!perms.has(name)) {
        manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    }
    return config;
  });
}

module.exports = withAndroidSmsReader;
