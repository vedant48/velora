const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

function run(command, options = {}) {
  console.log(`\x1b[36m> ${command}\x1b[0m`);
  return execSync(command, { cwd: rootDir, stdio: 'inherit', ...options });
}

function runCapture(command) {
  return execSync(command, { cwd: rootDir, stdio: 'pipe', encoding: 'utf-8' }).trim();
}

function parseSemVer(v) {
  const clean = v.replace(/^v/, '');
  const parts = clean.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid semver version: ${v}`);
  }
  return parts;
}

function bumpVersion(current, type) {
  const [major, minor, patch] = parseSemVer(current);
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      if (/^\d+\.\d+\.\d+$/.test(type)) {
        return type;
      }
      throw new Error(`Unknown bump type or invalid version: ${type}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const bumpType = args[0] || 'patch';
  const skipBuild = args.includes('--skip-build');
  const skipGh = args.includes('--skip-gh');

  console.log(`\x1b[32m=== Velora Release Automation ===\x1b[0m\n`);

  // 1. Read existing versions
  const pkgPath = path.join(rootDir, 'package.json');
  const appJsonPath = path.join(rootDir, 'app.json');
  const buildGradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version;
  const newVersion = bumpType === 'current' ? currentVersion : bumpVersion(currentVersion, bumpType);

  console.log(`Current Version: \x1b[33m${currentVersion}\x1b[0m`);
  console.log(`New Version:     \x1b[32m${newVersion}\x1b[0m\n`);

  // 2. Read and bump Android versionCode in build.gradle
  let currentCode = 1;
  if (fs.existsSync(buildGradlePath)) {
    let gradleContent = fs.readFileSync(buildGradlePath, 'utf8');
    const codeMatch = gradleContent.match(/versionCode\s+(\d+)/);
    if (codeMatch) {
      currentCode = parseInt(codeMatch[1], 10);
    }
    const newCode = bumpType === 'current' ? currentCode : currentCode + 1;

    gradleContent = gradleContent.replace(/versionCode\s+\d+/, `versionCode ${newCode}`);
    gradleContent = gradleContent.replace(/versionName\s+"[^"]+"/, `versionName "${newVersion}"`);
    fs.writeFileSync(buildGradlePath, gradleContent, 'utf8');
    console.log(`Updated android/app/build.gradle -> versionCode ${newCode}, versionName "${newVersion}"`);
  }

  // 3. Update package.json
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`Updated package.json -> version ${newVersion}`);

  // 4. Update app.json
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    if (appJson.expo) {
      appJson.expo.version = newVersion;
      if (!appJson.expo.android) appJson.expo.android = {};
      appJson.expo.android.versionCode = (appJson.expo.android.versionCode || 1) + (bumpType === 'current' ? 0 : 1);
    }
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
    console.log(`Updated app.json -> version ${newVersion}`);
  }

  // 5. Build APK if needed
  const apkDest = path.join(rootDir, `velora-v${newVersion}.apk`);
  const apkSource = path.join(rootDir, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');

  if (!skipBuild) {
    console.log(`\n\x1b[34mBuilding optimized Release APK (arm64-v8a)...\x1b[0m`);
    const isWindows = process.platform === 'win32';
    const gradlewCmd = isWindows ? 'cmd.exe /c "gradlew.bat assembleRelease"' : './gradlew assembleRelease';
    run(gradlewCmd, { cwd: path.join(rootDir, 'android') });

    if (fs.existsSync(apkSource)) {
      fs.copyFileSync(apkSource, apkDest);
      const stat = fs.statSync(apkDest);
      console.log(`\x1b[32mAPK compiled successfully: ${apkDest} (${(stat.size / 1024 / 1024).toFixed(2)} MB)\x1b[0m`);
    } else {
      console.warn(`APK source not found at ${apkSource}`);
    }
  } else {
    console.log(`Skipping APK build (--skip-build).`);
    if (!fs.existsSync(apkDest) && fs.existsSync(apkSource)) {
      fs.copyFileSync(apkSource, apkDest);
    }
  }

  // 6. Git commit and tag
  const tagName = `v${newVersion}`;
  try {
    run('git add package.json app.json RELEASE_NOTES.md README.md');
    if (fs.existsSync(buildGradlePath)) {
      run('git add android/app/build.gradle');
    }
    try {
      run(`git commit -m "chore(release): ${tagName}"`);
    } catch (e) {
      console.log('No new files to commit or commit already made.');
    }

    // Check if tag already exists
    const existingTags = runCapture('git tag -l').split('\n');
    if (existingTags.includes(tagName)) {
      console.log(`Tag ${tagName} already exists.`);
    } else {
      run(`git tag -a ${tagName} -m "Release ${tagName}"`);
      console.log(`Created git tag: \x1b[32m${tagName}\x1b[0m`);
    }

    // Push to origin
    console.log(`\n\x1b[34mPushing commit and tags to GitHub...\x1b[0m`);
    run('git push origin main');
    run(`git push origin ${tagName}`);
  } catch (err) {
    console.error('Git operation failed:', err.message);
  }

  // 7. GitHub Release via gh CLI if available
  if (!skipGh) {
    try {
      const ghCheck = runCapture('where gh || which gh');
      if (ghCheck) {
        console.log(`\n\x1b[34mPublishing GitHub Release using GitHub CLI...\x1b[0m`);
        const notesFile = path.join(rootDir, 'RELEASE_NOTES.md');
        let ghCmd = `gh release create ${tagName} "${apkDest}" --title "Velora ${tagName}"`;
        if (fs.existsSync(notesFile)) {
          ghCmd += ` --notes-file "${notesFile}"`;
        } else {
          ghCmd += ` --generate-notes`;
        }
        run(ghCmd);
        console.log(`\x1b[32mSuccessfully published ${tagName} to GitHub Releases!\x1b[0m`);
      }
    } catch (ghErr) {
      console.warn(`Could not run GitHub CLI (${ghErr.message}). You can also rely on GitHub Actions.`);
    }
  }

  console.log(`\n\x1b[32m🎉 Release automation complete for ${tagName}!\x1b[0m`);
}

main().catch(err => {
  console.error('\x1b[31mRelease failed:\x1b[0m', err);
  process.exit(1);
});
