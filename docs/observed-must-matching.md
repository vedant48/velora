# Observation-grounded UI matching

This branch is review work, not a release or a claim of native parity.
Reference: Must 1.13 on Android 13, two read-only sessions on 21–22 November 2026.

## Observed reference states

- Light library, compact name/avatar header, four stat columns, Want/Watched/Series/Insights tabs.
- Two-column poster-only library with small corner radius and narrow gaps.
- Filter controls expand below the tabs, with a scrim over the grid.
- Long-press on a Want poster opens a bottom sheet with Move to Watched.
- Movie details lead with a portrait poster, title/date, selected status, stats and providers.
- Want options contain Move to Watched / Remove from Want; outside tap dismisses them.
- Detail scroll reveals overview, genre pills and horizontal cast/crew.
- Dedicated search has suggestions, three-column title/year results and Movies/Series controls, without a bottom bar.
- Settings is a separate screen with a back arrow and profile fields.

## User-directed additions

- Keep both themes. Default to System, with persisted System / Light / Dark choices in Settings. System follows live OS appearance.
- Use one loading visual/animation, not mixed skeletons and spinners.
- Build reusable native components and one design language. Do not migrate to web shadcn/ui or another styling framework as part of this branch.
- Use bottom sheets for the corresponding contextual actions. Keep settings and search as screens rather than turning every destination into a sheet.

## Shared implementation

`ThemeProvider` supplies semantic colors. `ui` supplies spacing, radius and type tokens. `AppButton`, `AppTextField`, `ScreenHeader`, `AppLoader` and `BottomSheet` are app-owned native components. Existing destination screens and shared content components now read the same theme. Colors vary between modes; geometry does not.

BottomSheet provides the same backdrop, Android-back hook and downward-dismiss gesture for action and rating sheets. A short drag returns to rest. Static action sheets can drag from their surface; text-entry sheets drag from the handle to avoid competing with input/scroll gestures. Thresholds and timings are Velora implementation choices, not measurements of Must.

All active content, pagination and action-loading branches use AppLoader's circular native animation. On filled accent controls the spinner uses white for contrast. Native pull-to-refresh keeps the platform's circular indicator, tinted to the same accent. Retained inactive skeleton source files for reversibility; no active screen imports them. Loading, empty and failure/retry states are distinct in the changed library, search, collection and genre flows.

## Preserved behavior

Want remains the unified watchlist. Direct Watched and move-to-Watched still open the review/rating flow. Removal followed by re-add starts fresh. Season ratings remain independent, and whole-series actions remain distinct from selected-season actions. No backend/API contract, authentication model or tracking endpoints are replaced.

Real Velora settings, privacy, export, updates, activity and logout remain reachable. No fake phone, gender, social connections, rank formulas or Must data are added. No Must screenshots, proprietary implementation or assets are embedded in the app. Search retains Velora's All and People modes. The existing three destination tabs are retained.

## Checks performed

- TypeScript type check.
- Sixteen tests: six updater safety cases, five theme/configuration cases, five library/review semantic cases.
- Expo native-config introspection confirms automatic Android appearance, uiMode change handling and iOS Automatic appearance.
- Successful web export and Android Hermes bundle export. The latter is not an APK install or device UI test.
- Actual exported app rendered with generated poster fixtures and intercepted network requests, not a real account.
- Light/dark library at 320 and 390 pixels; details and Settings at 320 and 390 pixels; filters, action sheet, review sheet, search suggestions/results, loading and error states.
- Fixture interactions: filter draft cancellation and Apply, long-press to review, short-drag snap-back and downward-dismiss, detail action dismissal, search clear/back, theme override, live System changes and persisted choice after reload.
- Fixed a filter-induced grid jump found by the fixture and prevented stale paginated search responses from entering a different query.
- No real account writes during these fixtures.

## Remaining native and product checks

No claim of exact parity, timing, measured FPS, haptics, Android back execution or actual-phone smoothness. Native keyboard/drag interaction and installed Android rendering still need device inspection. Exporting a bundle does not establish these.

Must's other bottom tabs, account-changing actions and full swipe behavior were not inspected. Long-press behavior for Velora statuses other than Want movies remains the existing removal confirmation instead of an invented Must equivalent. The streaming filter is omitted because provider data is not present in library items. Provider availability and aggregate title stats use actual existing APIs when available; fixtures do not prove their real-world values.

App-wide shared foundations are implemented, but specialized screens still need installed-device cross-screen review before any claim that the whole app matches Must. Merge/release is a separate approval.

## Component-library compatibility

Velora uses Expo SDK57 / React Native0.86.3 and StyleSheet. Direct shadcn/ui components use HTML/web primitives and are not drop-in Android components. React Native Reusables is a separate native project that uses Nativewind/Uniwind. No styling framework migration was introduced here. Added SDK-compatible expo-system-ui and automatic appearance config so Android can follow OS appearance; a new native binary is required for that config.

Sources checked 22 November 2026:
- https://ui.shadcn.com/docs/components/base/button
- https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
- https://github.com/founded-labs/react-native-reusables/
- https://www.nativewind.dev/docs/getting-started/installation
