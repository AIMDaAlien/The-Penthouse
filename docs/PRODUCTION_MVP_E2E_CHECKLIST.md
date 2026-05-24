# Production MVP E2E Checklist

Use this checklist against the live public PWA:

- App: `https://penthouse.blog`
- API health: `https://api.penthouse.blog/api/v1/health`
- Date created: 2026-05-24

This is for real-world tester behavior, not automated QA. Prefer real phones and normal networks.

## Tester Setup

Each test round needs at least two accounts. Aim should provide invite codes or pre-created accounts privately.

Record for every run:

- tester name
- device model
- operating system version
- browser
- installed PWA or browser tab
- network type: Wi-Fi, mobile data, VPN, weak signal
- time and timezone

Do not put passwords, invite codes, private messages, or real personal information in screenshots.

## Pass Criteria

The release is acceptable when:

- new users can register with invite-only flow
- returning users can log in and stay logged in after normal close/reopen
- General, DM, and group chat flows work for two real users
- messages send once, arrive live, preserve order, and survive refresh
- media and GIF flows do not break chat
- offline/reconnect behavior is understandable and does not duplicate messages
- settings/profile updates do not break identity, avatars, or chat display
- no tester can see another user's private DM or protected media without permission

## 1. Install And First Open

- [ ] Open `https://penthouse.blog` on desktop browser.
- [ ] Open `https://penthouse.blog` on iPhone Safari.
- [ ] Open `https://penthouse.blog` on Android Chrome.
- [ ] Install the PWA to the home screen on at least one iPhone or Android device.
- [ ] Launch from the home-screen icon.
- [ ] Close the app fully and reopen it.

Expected:

- app loads without a blank screen
- no obvious broken layout on mobile
- installed PWA opens to the same product, not an old cached shell
- refresh/reopen does not throw the user into a permanent loading state

## 2. Registration And Login

- [ ] Register tester A with an invite code.
- [ ] Register tester B with an invite code.
- [ ] Try an invalid invite code.
- [ ] Try a too-short password.
- [ ] Log out tester A.
- [ ] Log tester A back in.
- [ ] Close and reopen the app while logged in.
- [ ] Open the app in a second browser and log in as the same user.

Expected:

- valid invite registration works
- invalid invite and weak password fail with readable errors
- login works after logout
- session survives ordinary close/reopen
- second browser session does not corrupt the first session

## 3. Core Chat

- [ ] Tester A opens General.
- [ ] Tester B opens General.
- [ ] A sends a short message.
- [ ] B receives it without refreshing.
- [ ] B replies.
- [ ] A receives it without refreshing.
- [ ] Send messages quickly from both users for 30 seconds.
- [ ] Refresh both clients.

Expected:

- messages appear once
- order is sensible
- no long delay on a healthy connection
- messages remain after refresh
- no sender names or avatars swap between users

## 4. Direct Messages

- [ ] A starts or opens a DM with B.
- [ ] A sends a DM.
- [ ] B receives it.
- [ ] B replies.
- [ ] Confirm the DM does not appear in General.
- [ ] Open another account if available and confirm it cannot see the DM.

Expected:

- DM membership is private
- live delivery works both ways
- chat list shows the DM clearly
- unread state changes when the chat is opened

## 5. Groups And Members

- [ ] Create a group chat.
- [ ] Add at least one member.
- [ ] Send a group message.
- [ ] Rename the group if the UI exposes that action.
- [ ] Remove a member if the UI exposes that action.
- [ ] Confirm the removed member no longer receives new messages.

Expected:

- group membership changes are reflected for affected users
- removed users do not retain live access
- group list and chat header update without a full logout

## 6. Realtime Behavior

- [ ] Keep two clients open side by side.
- [ ] Send messages both directions.
- [ ] Watch typing indicators if present.
- [ ] Watch presence indicators if present.
- [ ] Mark a chat read by opening it.
- [ ] Leave one client in another chat and send it a message elsewhere.

Expected:

- live events arrive without manual refresh
- read state only advances when the user actually opens or views the chat
- presence/typing indicators do not get stuck forever
- unread state is understandable

## 7. Media And GIFs

- [ ] Upload a small image.
- [ ] Upload a larger image from a phone camera roll.
- [ ] Upload an unsupported or too-large file if possible.
- [ ] Open an uploaded image from both sender and receiver.
- [ ] Send a GIF if the GIF picker is visible.
- [ ] Refresh and reopen the media message.

Expected:

- allowed media uploads complete
- blocked uploads show a readable error
- images render for authorized chat members
- private media does not open for non-members
- GIF/media messages survive refresh

## 8. Search, Pins, Polls, And Reactions

- [ ] Search for a word from a recent message.
- [ ] Search for nonsense text.
- [ ] Try a very long search query.
- [ ] Add and remove a reaction.
- [ ] Pin and unpin a message if the UI exposes pins.
- [ ] Create and vote in a poll if the UI exposes polls.

Expected:

- search returns relevant messages or an empty state
- long search does not crash the app
- reactions update for both users
- pins and polls update without duplicate events

## 9. Profile And Settings

- [ ] Change display name.
- [ ] Change avatar if avatar upload is exposed.
- [ ] Change banner if banner upload is exposed.
- [ ] Toggle notification or chat preference settings if exposed.
- [ ] Confirm another user sees the updated identity in chat.
- [ ] Refresh and confirm the profile persists.

Expected:

- updates persist
- chat history still shows the right sender
- no broken avatar or media URL appears
- settings do not silently reset after refresh

## 10. Offline And Reconnect

- [ ] Open a chat on mobile.
- [ ] Turn on airplane mode.
- [ ] Try to send a message.
- [ ] Turn network back on.
- [ ] Retry if the UI offers retry.
- [ ] Repeat by switching from Wi-Fi to mobile data.

Expected:

- offline state is visible or understandable
- app does not lose typed text without warning
- retry sends one copy, not duplicates
- live connection recovers without logging out

## 11. Mobile Real-World Pass

- [ ] Use the app while switching apps.
- [ ] Lock the phone for one minute and reopen.
- [ ] Rotate the phone if rotation is enabled.
- [ ] Scroll a long chat history.
- [ ] Use the app with mobile keyboard open.
- [ ] Test with low battery mode if available.

Expected:

- no input fields are hidden by the keyboard
- app does not lose the active chat after backgrounding
- scrolling remains usable
- no unreadable text or overlapping buttons

## 12. Notification Observation

Browser push may still depend on final frontend subscription UI and deployed browser permission state. Do not fail the release only because push is absent unless Aim marks push as required for that test round.

- [ ] Check whether the app asks for notification permission.
- [ ] If it does, allow notifications.
- [ ] Send a message while the receiver is in another chat.
- [ ] Send a message while the receiver is backgrounded.
- [ ] Tap any notification that appears.

Expected:

- permission prompts are clear if present
- notification tap opens the app or relevant chat if implemented
- absence of notification is recorded as observed behavior, not guessed

## 13. Security And Privacy Checks

- [ ] Log out and confirm protected screens are not accessible by browser back button.
- [ ] Open a protected API/media URL in a logged-out browser if one is available from testing.
- [ ] Confirm user C cannot open A/B private DM.
- [ ] Confirm removed group members stop receiving new group messages.
- [ ] Confirm screenshots/logs do not expose invite codes or secrets.

Expected:

- logged-out users are redirected or blocked
- unauthorized private content does not load
- permissions change immediately or after a clear refresh

## 14. Bug Report Format

For every bug, send:

```text
Title:
Tester:
Device:
Browser/PWA:
Network:
Account role:
Time:

Steps:
1.
2.
3.

Expected:
Actual:
Screenshot/video:
Can reproduce: yes/no
Severity: blocker / high / medium / low
```

Severity guide:

- blocker: cannot register, log in, open chat, or send messages
- high: privacy leak, duplicated/lost messages, media exposed incorrectly, app unusable on a common phone
- medium: confusing but recoverable failure, broken secondary feature, bad layout that still allows use
- low: copy polish, minor visual issue, intermittent annoyance
