# Velora v1.3.0

First production release signed with the new secure upload key.

**Install note:** uninstall any older Velora build before installing this one. The signing key changed, so Android cannot update the old app in place. Your watchlist, ratings and watch progress are tied to your account and come back after sign-in.

## What is in this build
- Cloud sync: watchlist, ratings, reviews and watch progress live in your account
- Email + Google sign-in
- Public profiles, match percentage, follow/unfollow, friends activity feed
- Private account mode (Settings)
- Account settings: edit profile, export library (JSON / SIMKL CSV), delete account
- In-app update checker with checksum + signature verification (fails closed)
- Per-season ratings and reviews for TV shows
- Performance-focused rebuild of the tracking UI

## Files
- `velora-v1.3.0.apk`: the app
- `velora-v1.3.0-checksums.txt`: SHA-256 of the APK (the in-app updater checks this before installing)
- `cert-fingerprint.txt`: signing certificate fingerprints
