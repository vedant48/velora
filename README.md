# 🎬 Velora — Cinematic Streaming Experience

<p align="center">
  <img src="https://img.shields.io/badge/Velora-Streaming%20App-E50914?style=for-the-badge&logo=netflix&logoColor=white" alt="Velora Banner" />
</p>

<p align="center">
  <a href="https://github.com/vedant48/velora/releases/latest">
    <img src="https://img.shields.io/badge/Download-Android%20APK-E50914?style=for-the-badge&logo=android&logoColor=white" alt="Download APK" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React%20Native-0.86-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-SDK%2057-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo SDK 57" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Reanimated-3.16-FF6154?style=flat-square" alt="Reanimated" />
  <img src="https://img.shields.io/badge/FlashList-2.0-blue?style=flat-square" alt="FlashList" />
  <img src="https://img.shields.io/badge/TanStack%20Query-v5-FF4154?style=flat-square&logo=reactquery&logoColor=white" alt="TanStack Query" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License MIT" />
</p>

---

## 📱 Download Android APK

Get the latest production-ready Android APK directly from GitHub Releases:

📦 **[Download Latest Velora APK (v1.0.0)](https://github.com/vedant48/velora/releases/latest)**

> Alternatively, visit the [Releases Page](https://github.com/vedant48/velora/releases) to view all release notes and build assets.

---

## ✨ Overview

**Velora** is a production-grade React Native streaming application inspired by the interaction polish and performance of **Netflix** and **Disney+**. Built from the ground up prioritizing **buttery-smooth 60/120 FPS UI performance**, hardware-accelerated animations, intelligent image caching, and zero layout shifts.

All TMDB requests are routed through a dedicated edge proxy with an edge-optimized WebP CDN cache, ensuring ultra-low latency and global reliability.

---

## 🚀 Key Features

### 🌟 Netflix-Inspired Animated Space Splash
- Cinematic Netflix-style zoom & glowing logo animation on app launch.
- Dynamic starfield particle effects and smooth cross-dissolve entry.

### 🏠 Dynamic Home Feed & Category Filters
- **Filter Pills**: One-tap switching between `All`, `TV Shows`, and `Movies` with instant reactive feeds.
- **Hero Carousel**: High-impact backdrop spotlight with smooth swiping, rating badges, and quick actions.
- **Continue Watching**: Persistent local storage tracking user playback position and duration.
- **Curated Sections**: Trending, Popular Blockbusters, Top Rated Masterpieces, Now in Theaters, and thematic collections (e.g., Marvel Avengers Saga).

### 📺 Full TV Series & Season/Episode Support
- Interactive **Season Selector** pills.
- Episode cards with 16:9 still captures, runtimes, synopses, and ratings.
- Integrated mock **4K HDR Dolby Vision** player modal with progress tracking.

### 🌐 Official Streaming Providers ("Where to Watch")
- Real-time provider integration showing where titles are available to **Stream**, **Rent**, or **Buy**.
- Displays official streaming logos (Netflix, Disney+ Hotstar, Prime Video, Apple TV, YouTube, etc.) fetched via edge CDN.

### 🎭 Cast & Key Creative Crew
- **Top Cast**: Horizontal carousel with actor portraits and character roles.
- **Key Crew**: Dedicated carousel highlighting Directors, Writers, Producers, Cinematographers, and Composers.

### 👤 Interactive Person Profile Modal
- Tap any actor or crew member to open a sleek bottom-sheet modal.
- Detailed biography, department, place of birth, and birthday.
- **Known For Filmography**: Deduplicated, rating-sorted media carousel with one-tap navigation to any title.

### 📂 3-Column Category / Genre Browser
- Tap any genre badge on Details (or "See All" on Home carousels) to open the category browser.
- Virtualized 3-column grid powered by `@shopify/flash-list`.
- Movies / TV series toggle switch with infinite-scroll pagination.

### 🔍 Instant Search & 3-Column Grid
- Real-time debounced query search across movies, TV series, and actors.
- Filter chips (`All`, `Movies`, `TV Series`).
- Guaranteed 3-column skeleton loading (3 rows of 3 columns) with seamless lazy-loading pagination.
- Instant fallback states when no matches are found.

---

## 🛠️ Architecture & Tech Stack

| Component | Technology |
|---|---|
| **Framework** | [React Native 0.86](https://reactnative.dev/) with [Expo SDK 57](https://expo.dev/) (New Architecture) |
| **Language** | [TypeScript 5.9](https://www.typescriptlang.org/) (Strict Mode) |
| **State & Cache** | [@tanstack/react-query v5](https://tanstack.com/query) with 10-min stale time & 1-hour GC |
| **List Virtualization** | [@shopify/flash-list v2](https://shopify.github.io/flash-list/) for ultra-high FPS list rendering |
| **Animations** | [React Native Reanimated 3](https://docs.swmansion.com/react-native-reanimated/) with UI-thread worklets |
| **Image Pipeline** | [expo-image](https://docs.expo.dev/versions/latest/sdk/image/) + Edge CDN proxy with WebP compression |
| **Navigation** | [@react-navigation/native-stack](https://reactnavigation.org/) with fluid transitions |
| **Persistent Storage** | [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) |

---

## 📁 Project Structure

```
e:/Velora/
├── assets/                    # App icons, splash screens, and static media
├── src/
│   ├── api/                   # API clients, endpoints, and TanStack queries
│   │   ├── client.ts          # Proxied fetch client with timeout & retry
│   │   ├── movies.ts          # Movie discover, trending, details & providers
│   │   ├── tv.ts              # TV series, seasons, episodes & providers
│   │   ├── person.ts          # Person details & combined filmography
│   │   ├── search.ts          # Multi-search, movie & TV search endpoints
│   │   ├── queries.ts         # Query hooks & infinite query pagination
│   │   └── types.ts           # Comprehensive TypeScript domain interfaces
│   ├── components/
│   │   ├── common/            # Header, Badge, Glassmorphic containers
│   │   ├── Details/           # WatchProviders (Where to Watch) component
│   │   ├── HeroCarousel/      # Spotlight hero banner with Reanimated
│   │   ├── MovieCard/         # Reusable card (carousels & 3-column grids)
│   │   ├── MovieCarousel/     # Horizontal FlashList carousel with prefetching
│   │   ├── Person/            # PersonModal sheet with bio & filmography
│   │   ├── ProgressBar/       # Continue watching progress indicators
│   │   ├── Skeleton/          # Shimmer skeleton loaders & placeholders
│   │   └── Splash/            # Netflix-inspired animated space splash
│   ├── hooks/                 # Custom React hooks (watchlist, continue watching)
│   ├── navigation/            # Root stack & bottom tab navigators
│   ├── screens/
│   │   ├── Details/           # Movie & TV show details screen
│   │   ├── Genre/             # 3-column category browser with infinite scroll
│   │   ├── Home/              # Primary feed with filter pills & carousels
│   │   ├── Search/            # Instant 3-column search screen
│   │   ├── Watchlist/         # User saved titles
│   │   ├── Profile/           # User profile & preferences
│   │   └── Debug/             # Performance metrics & proxy diagnostics
│   ├── storage/               # Local persistence layer (AsyncStorage)
│   ├── theme/                 # Design tokens (colors, typography, metrics)
│   └── utils/                 # Image edge URL generator & formatters
├── App.tsx                    # Root application entry point
├── app.json                   # Expo application configuration
└── package.json               # Dependencies and scripts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm or yarn
- Expo Go app (on your iOS/Android device) or an Android/iOS emulator

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/vedant48/velora.git
   cd velora
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on your desired platform:
   - Press `a` for Android emulator / connected device.
   - Press `i` for iOS simulator.
   - Press `w` for Web browser.
   - Scan the QR code with the **Expo Go** app on your physical phone.

---

## 📦 Building the APK (Android)

### Using EAS Build (Recommended)
1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your Expo account:
   ```bash
   eas login
   ```
3. Build the standalone APK:
   ```bash
   eas build -p android --profile preview
   ```
4. Once completed, EAS will provide a direct download link for the `.apk` file.

### Local APK Build
To generate an APK locally using Expo Prebuild:
```bash
npx expo run:android --variant release
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Crafted with ❤️ for cinema enthusiasts and performance purists.
</p>
