## Permission cleanup

- Removed unused Android microphone, camera and screen-overlay permission declarations.
- Profile photo selection, crop, upload and removal remain available. Native gallery checks passed on Android 12 and Android 15 using isolated synthetic test data.
- Existing in-app updater installation permission and Android 12-and-earlier photo storage permissions are retained.

No changes to your account, library, ratings, reviews, episode progress or profile photos. Same app package and signing key, no uninstall needed for existing release-key installations.

The final signed APK was checked for the removed permissions and successfully installed over v1.4.5 on Android 12. The complete in-app download-to-installer flow was not re-run in this verification; updater code is unchanged and its integrity tests pass.
