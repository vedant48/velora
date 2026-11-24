## Faster, safer Must import

- Fixes the Must import failing with "Fetch request has been canceled". The import now waits up to 90 seconds for a batch instead of 15.
- The "Preparing" step checks TMDB seasons six at a time instead of one by one.
- The server (already updated) saves each title in one transaction with bulk writes, so a title is saved fully or not at all.
- Safe to run again after a failed import: titles already in Velora are left unchanged (status, rating, reviews), and missing episodes, season ratings and reviews from Must are added.
- Episode gaps that cannot be matched to TMDB are still listed, not imported.

No change to your account, library, or signing key; update in place, no uninstall needed.
