const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

function getGitHubToken() {
  try {
    const res = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n',
      encoding: 'utf-8'
    });
    const passLine = res.split('\n').find(l => l.startsWith('password='));
    if (passLine) {
      return passLine.split('=')[1].trim();
    }
  } catch (e) {
    console.error('Failed to get token from git credential manager:', e.message);
  }
  return process.env.GITHUB_TOKEN;
}

async function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      if (Buffer.isBuffer(postData)) {
        req.write(postData);
      } else {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }
    }
    req.end();
  });
}

async function uploadAsset(uploadUrlTemplate, token, filePath, assetName) {
  const uploadUrlClean = uploadUrlTemplate.replace(/\{.*?\}$/, '');
  const url = new URL(uploadUrlClean);
  url.searchParams.set('name', assetName);

  const fileBuffer = fs.readFileSync(filePath);
  const fileSize = fileBuffer.length;

  console.log(`Uploading ${assetName} (${(fileSize / 1024 / 1024).toFixed(2)} MB) to GitHub Releases...`);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Node.js/Velora-Release-Bot',
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': fileSize
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`Successfully uploaded ${assetName}!`);
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`Failed to upload asset (HTTP ${res.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
}

async function main() {
  const tag = process.argv[2] || 'v1.1.0';
  const rootDir = path.resolve(__dirname, '..');
  const apkPath = path.join(rootDir, `velora-${tag}.apk`);
  const notesPath = path.join(rootDir, 'RELEASE_NOTES.md');

  if (!fs.existsSync(apkPath)) {
    throw new Error(`APK file not found at ${apkPath}`);
  }

  const token = getGitHubToken();
  if (!token) {
    throw new Error('No GitHub token found in git credential helper or GITHUB_TOKEN environment variable.');
  }

  let body = `Release ${tag}`;
  if (fs.existsSync(notesPath)) {
    body = fs.readFileSync(notesPath, 'utf8');
  }

  console.log(`Creating GitHub Release for ${tag}...`);

  // 1. Create release
  const releasePayload = JSON.stringify({
    tag_name: tag,
    name: `Velora ${tag}`,
    body: body,
    draft: false,
    prerelease: false
  });

  const release = await request({
    hostname: 'api.github.com',
    path: '/repos/vedant48/velora/releases',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'Node.js/Velora-Release-Bot',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(releasePayload)
    }
  }, releasePayload);

  console.log(`Release created: ${release.html_url}`);

  // 2. Upload APK asset
  await uploadAsset(release.upload_url, token, apkPath, `velora-${tag}.apk`);

  console.log(`\n🎉 RELEASE PUBLISHED SUCCESSFULLY!`);
  console.log(`View your release at: ${release.html_url}`);
}

main().catch(err => {
  console.error('\nRelease creation failed:', err.message);
  process.exit(1);
});
