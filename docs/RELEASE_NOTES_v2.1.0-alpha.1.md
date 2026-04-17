# Release Notes — v2.1.0-alpha.1

This release marks a fundamental shift in how The Penthouse is built and delivered. We’ve moved away from the native Android APK (v2.0.0) in favor of a Progressive Web App (PWA) built from the ground up with SvelteKit. 

This isn't just a rewrite; it's a commitment to a simpler, more private way of staying in touch without the friction of app stores.

### The Big Change: APK → PWA
You no longer need to download or side-load an APK file. The Penthouse now lives directly in your mobile browser but behaves like a native app once you "Add to Home Screen." This ensures everyone gets the same experience on both Android and iOS, with instant updates and no platform gatekeepers.

### New in this Release
*   **The Welcome Page:** A new, editorial landing page at `penthouse.blog` that explains what this is and how to get started.
*   **Refined Auth Flow:** Visitors now land on the welcome page first, providing a warmer entrance to the building.
*   **Rebuilt Core:** Chat lists, real-time messaging, and user profiles have all been rebuilt for better performance and reliability.
*   **Offline Shell:** The app loads even without a connection—API calls fail gracefully rather than crashing.
*   **Connection Status:** A new status indicator (the colored dot in the corner) keeps you aware of your sync status.
*   **Dark-Mode Default:** The interface now defaults to our signature dark periwinkle theme.

### Known Limitations
We’re still in the early stages of this alpha. A few things aren't here yet:
*   **Text Only:** Media uploads (images/files) are currently disabled.
*   **No Push Notifications:** You’ll need to have the app open to see new messages as they arrive.
*   **No Admin UI:** Community management still happens in the background for now.

### Reporting Bugs
If things look out of place, please report them to the feedback channel [Owner to insert link]. Be specific about what you were doing and what happened. Screenshots are always helpful.
