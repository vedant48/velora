## Import from Must (file import)

- Settings > Account > Import from Must. Choose your Must export files (JSON); Velora does not connect to or fetch anything from Must.
- Titles are matched to TMDB by poster, then title and year. Anything unsure is shown for you to pick or skip. Nothing ambiguous is imported on its own.
- Episode progress is only imported when a season's episode count and air dates match TMDB; otherwise it is left out and listed.
- Imports Want, Watched movies and series with ratings, reviews, season ratings and per-episode progress where the file has them. Want series stay in Want.
- Existing Velora titles, ratings and reviews are never overwritten. Re-running only adds missing episodes, season ratings and reviews.
- Must does not store original add or watch dates. New titles use Must's last-modified date as their added date (recorded as a fallback, not the original), or the import date if it is missing.
- At the end you get a list of what was added, kept, failed, not matched, and every data gap (for example series without episode detail in the file, or seasons whose episode counts differ from TMDB).

Requires the matching backend update (new import endpoint and table), already applied before this release. No change to your account, library, or signing key; no uninstall needed.

