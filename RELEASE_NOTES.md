## Import from Must (file import)

- Settings > Account > Import from Must. Choose your Must export files (JSON); Velora does not connect to or fetch anything from Must.
- Titles are matched to TMDB by poster, then title and year. Anything unsure is shown for you to pick or skip. Nothing ambiguous is imported on its own.
- Imports Want, Watched movies and series with ratings, reviews, season ratings and per-episode progress where the file has them. Want series stay in Want.
- Existing Velora titles, ratings and reviews are never overwritten. Re-running only adds missing episodes, season ratings and reviews.
- Must does not store original add or watch dates. Imported titles get the import date. Must's own last-modified time is kept only as source information.
- At the end you get a list of what was added, kept, failed, not matched, and every data gap (for example series without episode detail in the file, or seasons whose episode counts differ from TMDB).

Requires the matching backend update (new import endpoint and table), already applied before this release. No change to your account, library, or signing key; no uninstall needed.

Tested with synthetic data: parser, matching and merge rules (unit and database tests). A native emulator pass of the import screen is listed in the release verification, not claimed here beyond what it shows.
