const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/services/updates.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
// Binary values include NUL and invalid UTF-8, which must not be hashed as text.
const fixture = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0xff, 0x80, 0x0a]);

function updater(bytes = fixture, { readError = false, noResult = false } = {}) {
  const calls = { downloads: 0, deleted: [], installs: [] };
  const modules = {
    'react-native': { Platform: { OS: 'android' } },
    'expo-application': {},
    'expo-constants': { default: {} },
    'expo-file-system/legacy': {
      cacheDirectory: 'file:///cache/',
      createDownloadResumable: () => ({ downloadAsync: async () => {
        calls.downloads++;
        return noResult ? undefined : { uri: 'file:///cache/update.apk' };
      } }),
      deleteAsync: async (uri) => calls.deleted.push(uri),
      getContentUriAsync: async () => 'content://update.apk',
      readAsStringAsync: () => { throw new Error('APK must not be read as text'); },
    },
    'expo-file-system': { File: class {
      async bytes() {
        if (readError) throw new Error('Read failed');
        return new Uint8Array(bytes);
      }
    } },
    'expo-crypto': {
      CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
      digest: async (algorithm, data) => {
        assert.equal(algorithm, 'SHA-256');
        assert.ok(data instanceof Uint8Array);
        return crypto.webcrypto.subtle.digest(algorithm, data);
      },
      digestStringAsync: () => { throw new Error('APK must not be hashed as text'); },
    },
    'expo-intent-launcher': { startActivityAsync: async (...args) => calls.installs.push(args) },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, require: (name) => {
      assert.ok(name in modules, `Unexpected module ${name}`);
      return modules[name];
    }, Uint8Array, Array,
  });
  const info = { apkUrl: 'https://example.invalid/update.apk', apkName: 'update.apk', expectedSha256: sha256(fixture) };
  return { download: (overrides) => exports.downloadAndInstall({ ...info, ...overrides }), calls };
}

test('valid binary checksum opens installer without deleting APK', async () => {
  const app = updater();
  assert.equal((await app.download()).ok, true);
  assert.equal(app.calls.installs.length, 1);
  assert.equal(app.calls.installs[0][1].data, 'content://update.apk');
  assert.equal(app.calls.deleted.length, 0);
});

test('corrupted bytes fail closed, delete download, never open installer', async () => {
  const corrupted = Buffer.from(fixture);
  corrupted[0] ^= 1;
  const app = updater(corrupted);
  assert.equal((await app.download()).ok, false);
  assert.deepEqual(app.calls.deleted, ['file:///cache/update.apk']);
  assert.equal(app.calls.installs.length, 0);
});

test('a truncated download fails verification', async () => {
  const app = updater(fixture.subarray(0, 4));
  assert.equal((await app.download()).ok, false);
  assert.equal(app.calls.deleted.length, 1);
  assert.equal(app.calls.installs.length, 0);
});

test('missing checksum refuses download and install', async () => {
  const app = updater();
  assert.equal((await app.download({ expectedSha256: null })).ok, false);
  assert.equal(app.calls.downloads, 0);
  assert.equal(app.calls.installs.length, 0);
});

test('read failure and missing download never open installer', async () => {
  for (const options of [{ readError: true }, { noResult: true }]) {
    const app = updater(fixture, options);
    assert.equal((await app.download()).ok, false);
    assert.equal(app.calls.installs.length, 0);
  }
});

test('Base64 text hash is not accepted as the APK checksum', async () => {
  const app = updater();
  assert.equal((await app.download({ expectedSha256: sha256(fixture.toString('base64')) })).ok, false);
  assert.equal(app.calls.installs.length, 0);
});

// Optional integration fixture: run against the independently downloaded release APK.
if (process.env.VELORA_TEST_APK) {
  test('published APK passes its published raw-byte SHA-256', async () => {
    const bytes = fs.readFileSync(process.env.VELORA_TEST_APK);
    const app = updater(bytes);
    assert.equal((await app.download({ expectedSha256: process.env.VELORA_TEST_SHA256 })).ok, true);
    assert.equal(app.calls.installs.length, 1);
  });
}
