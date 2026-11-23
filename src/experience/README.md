# Shared interaction layer

Use existing native primitives, not timers or React updates on every drag.

- `motion`: spring/layout/press values shared by paging, sheets, cards and stack transitions. Respect the device's reduced-motion setting.
- `ContentPager`: UI-thread translation, finger-left advances, resisted edges, release distance/velocity policy, persistent visited pages plus one adjacent page. Keep screen identity/header outside it. Page contents use virtualized lists.
- `Expandable`: measure natural panel height and animate height/opacity. No instant filter insertion.
- `CachedImage`: native memory/disk caching, bounded loaded-identity registry, first-load fade only, URI-aware recycling and explicit retry after error. This is for public catalog images. Authenticated avatars keep their existing header/revision/cache rules.
- `LazySection`: defer lower Explore sections until near the viewport, retain once visited. Reserve section geometry while deferred. Horizontal rails use native virtualized lists and small windows. Avoid mounting every catalog image or prefetching a whole library.
- `pagerPolicy`, `ratingDistribution`: pure tested interaction/data rules.

Adopted by profile pager/filter, catalog/search/detail/person/activity images, Explore sections, trailer/watch-next rails, shared action sheets, card presses and native stack timing. Native navigation remains React Navigation; lists remain FlashList/FlatList; image decoding/cache remains expo-image.

Quality gates: finger-left/right and interrupted/cancelled/edge drags; both neighboring pages visible mid-drag with fixed header; no gray flash on return to loaded pages; filter expansion/collapse; vertical scrolling/refresh without accidental tab switch; slow/offline image fallback and retry; light/dark; reduced motion; rotation and safe area; no production-data changes from tests. Measure/render actual native recordings, including intermediate frames. A green build or successful tab selection is not motion evidence. No universal FPS, zero-drop or speedup promise.
