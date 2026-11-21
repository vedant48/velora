# Velora v1.2.0-bridge — Migration Bridge (one-time update)

**This is a one-time migration bridge, not the final release.** It is signed with the same key as v1.1.0 so it installs as a normal update — **do not uninstall the app**.

## Why this build exists

v1.3.0 will switch Velora to a proper secure signing key. Android requires an uninstall/reinstall for that switch, which would erase the watchlist stored on your phone. This bridge moves your data to your Velora account first, so nothing is lost.

## Steps

1. Install this update over your current Velora (same signature, installs normally).
2. Open the app and sign in (email or Google).
3. When asked, accept the watchlist import. Note the number of titles shown before confirming.
4. Wait for confirmation that your data is verified on the server.
5. Only then install v1.3.0 (the final secure build) — it will restore everything after sign-in.

## What is in this build

- Cloud sync: watchlist, ratings, reviews and watch progress now live in your account
- Google sign-in
- Public profiles, match percentage, follow/unfollow, friends activity feed
- Private account mode (Settings)
- Account settings: edit profile, export library (JSON / SIMKL CSV), delete account
- In-app update checker with checksum + signature verification (fails closed)
- Per-season ratings and reviews for TV shows

Signed with the debug/legacy certificate (same as v1.1.0). The final v1.3.0 will be signed with the new secure upload key.
