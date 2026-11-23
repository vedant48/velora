## Smoother navigation and poster loading

- Profile pages follow your finger: swipe right-to-left from Want to Watched, Series and Insights. The profile header stays in place, and short drags settle back.
- Already-loaded library pages and posters stay visible when switching pages or returning from Search, Details or Settings. Background refresh no longer replaces them with a spinner.
- Shared image loading uses memory/disk caching, a first-load placeholder and fade, and a retry state if an image cannot load. Lower Explore sections and horizontal rails load near the viewport instead of mounting every poster at once.
- Filter and sort controls expand and close with an animated transition. Cards, sheets and navigation share motion settings.
- Rating distribution bars render correctly, including half-star ratings. Profile pull-to-refresh uses the white native indicator with a dark spinner.

No library, ratings, reviews, episode progress or profile-photo migration. No Must or other platform importer in this update.

Native Android motion was checked with a synthetic test account. Catalog loading still depends on network availability. This is not a measured10x speedup or a guarantee of identical performance on every device. Existing Android splash-theme limitations remain unchanged.
