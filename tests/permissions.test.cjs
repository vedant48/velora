const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../app.json').expo;
test('unused native permissions are blocked while photo storage and updater remain', () => {
  for (const name of ['CAMERA','RECORD_AUDIO','SYSTEM_ALERT_WINDOW']) assert.ok(config.android.blockedPermissions.includes(`android.permission.${name}`));
  assert.ok(config.android.permissions.includes('android.permission.REQUEST_INSTALL_PACKAGES'));
  const picker = config.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-image-picker')[1];
  assert.equal(picker.cameraPermission,false);
  assert.equal(picker.microphonePermission,false);
  assert.ok(picker.photosPermission);
});
