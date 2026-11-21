const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../src/services/updates.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const cert = 'AB'.repeat(32), checksum = '12'.repeat(32);
function app({ releaseCert = cert, current = '1.4.1', checksumText = checksum + '  velora-v1.4.2.apk', certAsset = true } = {}) {
 const assets = [{ name: 'velora-v1.4.2.apk', browser_download_url: 'https://test.invalid/apk', size: 123 }, { name: 'velora-v1.4.2-checksums.txt', browser_download_url: 'https://test.invalid/checksum' }];
 if (certAsset) assets.push({ name: 'cert-fingerprint.txt', browser_download_url: 'https://test.invalid/cert' });
 const modules = { 'react-native': { Platform: { OS: 'android' } }, 'expo-application': { nativeApplicationVersion: current }, 'expo-constants': { __esModule: true, default: { expoConfig: { extra: { certSha256: cert } } } } };
 const context = { exports: {}, require: name => modules[name] || {}, fetch: async url => ({ ok: true, json: async () => ({ tag_name: 'v1.4.2', body: 'Update', html_url: 'https://test.invalid/release', assets }), text: async () => url.endsWith('/cert') ? 'SHA256: ' + releaseCert : checksumText }) };
 vm.runInNewContext(compiled, context);return context.exports;
}
test('production1.4.1 discovers1.4.2 with matching certificate and APK checksum', async () => {
 const info = await app().checkForUpdate();assert.equal(info.isNewer,true);assert.equal(info.expectedSha256,checksum);assert.equal(info.apkName,'velora-v1.4.2.apk');
});
test('current1.4.2 does not offer itself as a newer update', async () => { assert.equal((await app({current:'1.4.2'}).checkForUpdate()).isNewer,false); });
test('mismatched or missing signing certificate fails closed', async () => {
 assert.equal(await app({releaseCert:'CD'.repeat(32)}).checkForUpdate(),null);assert.equal(await app({certAsset:false}).checkForUpdate(),null);
});
test('checksum for another APK cannot authorize this APK', async () => {
 assert.equal((await app({checksumText:checksum+'  another.apk'}).checkForUpdate()).expectedSha256,null);
});
