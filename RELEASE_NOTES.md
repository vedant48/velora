# 🎬 Velora v1.0.0 — Initial Production Release

Welcome to the initial production release of **Velora**, a cinematic streaming application inspired by the interaction quality, polish, and performance of Netflix and Disney+.

Built from the ground up on **React Native (New Architecture)** and **Expo SDK 57**, Velora is engineered for **buttery-smooth 60/120 FPS UI performance**, instant navigation, hardware-accelerated animations, and zero layout shifts.

---

## 📦 Downloads

| Asset | Architecture | Target | Size |
|---|---|---|---|
| 🚀 **`velora-v1.0.0.apk`** | `arm64-v8a` (Optimized) | Physical Android Phones (Android 9–15+) | **17.25 MB** |

> **Installation Note**: If prompted with *"Install unknown apps"*, tap **Settings** and toggle **Allow from this source** to proceed with installation.
> 
> ⚡ **Size Optimization Note**: Through R8 bytecode minification, resource shrinking, and native 64-bit ARM architecture targeting, the final binary size was reduced from **94.3 MB down to 17.25 MB** (>81% size reduction) for instant downloads and peak runtime performance.

---

## ✨ What's New in v1.0.0

### 🌟 Netflix-Inspired Cinematic Space Splash
- Animated glowing Velora logo with smooth cinematic zoom and starfield particle effects.
- Seamless cross-dissolve transition into the home feed.

### 🏠 Dynamic Content Filtering & Curated Feeds
- **Filter Pills**: Switch between **All**, **TV Shows**, and **Movies** with instant client-side feed re-renders.
- **Hero Carousel**: High-impact backdrop spotlight with smooth swiping, rating badges, and quick actions.
- **Continue Watching**: Persistent local storage tracking user playback position and duration.
- **Curated Collections**: Trending titles, Popular Blockbusters, Top Rated Masterpieces, Now in Theaters, and thematic sagas (e.g., Marvel Avengers Collection).

### 📺 Complete TV Series & Episode Player
- Interactive **Season Selector** pills.
- Detailed episode cards with 16:9 still frames, runtimes, synopses, and ratings.
- Integrated **4K HDR Dolby Vision** player simulation with automatic watch progress tracking.

### 🌐 Official Streaming Providers ("Where to Watch")
- Real-time TMDB watch provider integration showing where titles are available to **Stream**, **Rent**, or **Buy**.
- Official streaming logos (Netflix, Disney+ Hotstar, Prime Video, Apple TV, YouTube, etc.) loaded via edge CDN.

### 🎭 Cast & Key Creative Crew
- **Top Cast**: Horizontal carousel with actor portraits and character roles.
- **Key Crew**: Dedicated carousel highlighting Directors, Writers, Producers, Cinematographers, and Composers.

### 👤 Interactive Person Profile Modal
- Tap any actor or crew member to open a bottom-sheet modal.
- Detailed biography, department badge, birthday, and birthplace.
- **Known For Filmography**: Deduplicated, rating-sorted media carousel with one-tap navigation to any title.

### 📂 3-Column Category & Genre Browser
- Dedicated category screen accessible from genre badges on Details or "See All" on Home carousels.
- High-performance 3-column virtualized grid powered by `@shopify/flash-list`.
- Movies / TV series toggle switch with infinite-scroll pagination.

### 🔍 Instant Search with 3x3 Skeletons
- Debounced search across movies, TV series, and actors.
- Filter chips (`All`, `Movies`, `TV Series`).
- Guaranteed 3-column skeleton loading (3 rows of 3 columns) with smooth lazy-loading pagination.
- Instant fallback states when no matches are found.

---

## 🛠️ Architecture & Under the Hood

- **Framework**: React Native 0.86 with Expo SDK 57 (New Architecture enabled)
- **Engine**: Hermes JavaScript Engine with bytecode pre-compilation
- **Caching**: TanStack Query v5 with 10-minute stale time & 1-hour garbage collection
- **List Virtualization**: `@shopify/flash-list` v2 for native view recycling at 60/120 FPS
- **Animations**: React Native Reanimated 3 with UI-thread worklets
- **Image Pipeline**: Edge CDN proxy (`wsrv.nl`) with automatic WebP compression and dimension-matched prefetching

---

## 📄 Checksums

- **Package**: `com.vedant.velora`
- **Build Type**: `Release` (Signed)
- **Min Android SDK**: `24` (Android 7.0+)
- **Target Android SDK**: `35` (Android 15)
