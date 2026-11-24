## Must import fixes, Want series, TMDB score

- Fixes the Must import failing with "Fetch request has been canceled": batches now wait up to 90 seconds, and the "Preparing" step checks TMDB seasons six at a time. The server (already updated) saves each title in bulk and in one transaction.
- Series you only want now stay in Want. The Series tab lists only series you are tracking (watching or watched).
- The title screen now shows the TMDB community score for titles opened from your library. It is TMDB's score, labelled TMDB, not IMDb's. Titles with no TMDB score show none.
- Safe to run the Must import again after a failed run: titles already in Velora keep their status, rating and reviews, and missing titles, episodes and reviews are added. Pick both export files together.
- Episode gaps that cannot be matched to TMDB are still listed, not imported.

No change to your account, library, or signing key; update in place, no uninstall needed.
