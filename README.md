# Velora

A movie and TV tracker for Android, built with React Native and Expo. Velora uses its own branding and interface assets.

## Features

- Account-backed Want and Watched lists, ratings and reviews.
- TV episode progress and independent season reviews.
- Home/profile with a two-column library, Want/Watched/Series/Insights tabs, horizontal tab gestures and pull-to-refresh.
- Separate Movies, TV Shows, Explore All and Search destinations.
- TMDB title discovery, trailers, cast, genres and provider information. Provider availability depends on region and may change.
- Movie collections from TMDB and Velora-owned TV genre collections, with account progress. No fabricated editorial lists or collection likes.
- Profile photo selection, square crop, compression, replacement and removal. Photos are visible to signed-in members.
- Saved System/Light/Dark appearance, original ribbon-V branding and V to VELORA startup reveal.
- SIMKL-compatible CSV and JSON library exports.
- In-app Android updates from signed GitHub Releases, with checksum and signing-continuity checks before Android's installation prompt.

Velora does not supply full-length films or TV streams. Trailer links and where-to-watch information are separate from playback rights. A retained demo-player interface is not licensed streaming content.

## Install

Use the APK on the [latest GitHub Release](https://github.com/vedant48/velora/releases/latest), or check for an update inside the app. Android asks you to approve installation. Existing releases signed with the same release key can update in place. Do not uninstall to install a normal update.

## Development

React Native 0.86, Expo SDK57, TypeScript, Reanimated4, FlashList2 and TanStack Query5. The account API uses the existing Cloudflare Worker and D1 database. Free-tier capacity is bounded and is not a promise of unlimited users or concurrent usage.

```sh
npm ci
npx tsc --noEmit
node --test tests/*.test.cjs
npx expo start
```

Native gesture, keyboard and appearance checks require an installed Android build. Browser fixtures and static tests do not establish identical timing, measured FPS or complete third-party UI parity.

## Credits

This product uses the TMDB API but is not endorsed or certified by TMDB.

Title metadata and artwork are supplied through [TMDB](https://www.themoviedb.org). The approved logo and notice are available in Settings, About & Credits. TMDB does not claim ownership of all artwork returned by its API; attribution is not a claim of rights to redistribute full-length video.

See the existing LICENSE file for repository licensing. This update does not select a different license.
