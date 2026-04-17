# The Penthouse — Feature Roadmap

**Current Status**: MVP alpha (v2.1.0-alpha.0)  
**Target**: Full standalone social messaging app (no external dependency on Instagram, YouTube, etc.)

---

## TIER 1: MVP Core Features ✅ COMPLETE

These are the **minimum required** for the app to function as a messaging platform:

- ✅ **Authentication**: Login, Register, Logout
- ✅ **Chat list**: View all conversations (DMs + groups)
- ✅ **Read messages**: Open a chat and view message history
- ✅ **Send text messages**: Real-time messaging via Socket.IO
- ✅ **User profiles**: Display name, avatar, username
- ✅ **User discovery**: Search and find people to message
- ✅ **Direct messages**: Create 1-on-1 chats from user picker
- ✅ **PWA install**: Add to home screen on Android/iOS
- ✅ **Connection status**: Visual indicator (connected/reconnecting/offline)

**Why this is enough for alpha**: Users can message each other in real-time, find people, and see who's online.

---

## TIER 2: Essential UX & Content (Q2 2026)

These make the app **feel complete** and prevent users from leaving to external services:

### Messages & Content
- **Text formatting**: Bold, italic, code blocks, lists (Markdown support)
- **Link previews**: Show title, description, thumbnail for pasted links (not embedded yet)
- **Reactions**: Like, heart, emoji reactions to messages
- **Message search**: Find old messages by keyword
- **Pinned messages**: Mark important messages for easy reference
- **Message editing**: Edit sent messages (tombstone or version marker)
- **Message deletion**: Remove messages (show "deleted" placeholder or hide)
- **Threads/replies**: Quote or reply to specific message

### User Presence & Activity
- **Typing indicators**: "Alice is typing..." feedback
- **Read receipts**: See who has read your message (optional privacy toggle)
- **Presence status**: Online, away, do not disturb, offline
- **Last seen**: When was user last active
- **Status updates**: Users can set a status message ("at lunch", "in a meeting")

### Media (Basic)
- **Image uploads**: Share photos (JPEG, PNG)
- **File sharing**: Share documents (PDF, DOC, etc.)
- **GIF picker**: Search and share GIFs (without Giphy—use open API like Tenor)
- **Avatar upload**: Users can upload custom avatars

### Social Discovery
- **Member directory**: See all users in the community, filter by role/status
- **User profiles expanded**: Bio, timezone, location (optional), join date
- **User tags/roles**: Community members can have badges (e.g., "Admin", "Moderator", "Community Manager")
- **Mutual connections**: See shared friends/connections with other users

### Accessibility & UX
- **Dark/light theme toggle**: Currently dark-only, add light mode option
- **Notification settings**: Mute chats, sound on/off, vibration settings
- **Font size adjustment**: Accessibility for low vision users
- **Keyboard shortcuts**: Cmd+K search, arrow keys to navigate, Cmd+Enter to send

---

## TIER 3: Advanced Features (Post-MVP, Q3+ 2026)

Features that transform the app from "messaging" → "social platform":

### Media & Rich Content

#### **EMBEDDED MEDIA (Your Request)**
The feature you want: **Paste a link, see it rendered inline without leaving the app**

```
User pastes: https://www.youtube.com/watch?v=dQw4w9WgXcQ
App renders: [YouTube player thumbnail + play button inline in chat]

User pastes: https://www.instagram.com/p/CxYz...
App renders: [Instagram embed—image + caption, no redirect needed]
```

**Implementation**:
- Use oEmbed API (YouTube, Vimeo, Instagram, Twitter, etc. all support it)
- Parse link, fetch metadata, render preview
- For videos: embed HTML5 video player or iframe
- For Instagram/Twitter: fetch embed HTML and inject safely
- Cache embeds for performance

**Benefits**:
- Users stay in the app—no context switching
- Lightweight alternative to TikTok, Instagram, YouTube apps
- Self-hosted = no external tracking

#### **Video & Audio**
- **Voice messages**: Record and send audio clips
- **Video messages**: Record and send video clips
- **Screen sharing**: Share your screen during chat (would need WebRTC)
- **Call audio**: Voice calls between two users
- **Call video**: Video calls (1-on-1, optional group calls)

#### **Rich Editor**
- **Drag-and-drop file upload**: Drag images/files into chat
- **Inline code highlighting**: Pretty-print code blocks with syntax highlighting
- **Embeds from any source**: Generic fallback for links not in oEmbed list
- **Paste as image**: Clipboard image upload

### Community & Moderation

- **Group channels**: Create public or private channels (not just DMs)
- **Channel roles**: Owner, admin, moderator, member (tiered permissions)
- **Permissions system**: Who can post, edit, delete, invite, manage roles
- **Message moderation**: Flag content, delete by mods, mute users
- **Invite links**: Generate shareable links to join community
- **Request to join**: Closed communities require approval to join
- **Bans & blocks**: Block users, prevent them from messaging you
- **Community guidelines**: Enforceable codes of conduct

### Notifications & Alerts

- **Push notifications**: Web Push API (requires browser permission)
- **Notification batching**: "5 new messages" instead of 5 notifications
- **Do Not Disturb mode**: Pause notifications for a time period
- **Custom notification sounds**: Different sounds for different chat types
- **Desktop notifications**: Use browser notification API when app not focused

### Analytics & Admin

- **Message statistics**: Total messages, active users, chat volume
- **User analytics**: Most active members, retention, churn
- **Activity logs**: Audit trail of who did what (for moderation)
- **Export chat**: Download conversation history
- **Backup/restore**: Backup community data, restore from backup

### Advanced Search

- **Full-text search**: Search across all messages
- **Search filters**: By user, date range, media type
- **Saved searches**: Save common queries
- **Search shortcuts**: `from:alice` `after:2026-01-01` `has:image`

### Profile & Privacy

- **Private/public profiles**: Control who can see your profile
- **Follower system**: Follow users to see their updates (optional)
- **Custom profile fields**: Let users add custom profile data
- **Profile privacy controls**: Hide last seen, activity status, etc.

### Integrations

- **Webhook integrations**: Post notifications from external services
- **Bot API**: Let third-party bots post messages
- **Custom integrations**: Zapier, Make, etc.

---

## NOT IN SCOPE (Post-v3.0)

These are out of scope for at least the next year:

- ❌ End-to-end encryption (E2EE) - adds complexity, server-side searches break
- ❌ Blockchain/Web3 - unnecessary for a private community app
- ❌ NFTs - not relevant for messaging
- ❌ AI features - could be added later (summarize, suggest responses, moderation)
- ❌ Monetization - this is community-focused, not for-profit

---

## ROADMAP TIMELINE

| Phase | Features | Timeline | Effort |
|-------|----------|----------|--------|
| **MVP** (✅ Done) | Core messaging, discovery, PWA | Feb–Mar 2026 | 6 weeks |
| **T2** | Text formatting, link previews, reactions, typing, read receipts | Apr–May 2026 | 4 weeks |
| **T3a** | **Embedded media (oEmbed)**, file uploads, voice messages | Jun 2026 | 2 weeks |
| **T3b** | Channels, roles, moderation, community features | Jul–Aug 2026 | 4 weeks |
| **T3c** | Video calls, screen sharing, push notifications | Sep–Oct 2026 | 3 weeks |
| **v3.0** | Admin suite, analytics, advanced search, API | Nov+ 2026 | Ongoing |

---

## EMBEDDED MEDIA (YOUR REQUEST) — DETAILED SPEC

### Why It Matters
Right now, when you paste a YouTube or Instagram link, users either:
1. Click the link and leave the app → context loss → bad UX
2. Ignore it and don't watch → lower engagement

**With embedded media**: Link renders inline, user stays in app, no app install needed.

### Implementation (High Level)

```typescript
// User pastes: "Check this out: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
// App detects link, fetches metadata via oEmbed
// Renders:
<div class="message-embed">
  <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" ...></iframe>
  <p>RickRoll Video · YouTube</p>
</div>
```

### oEmbed Providers (Built-in)
- **YouTube**: Video embeds with player
- **Vimeo**: Video embeds
- **Instagram**: Photo/carousel embeds
- **Twitter/X**: Tweet embeds
- **Spotify**: Song/playlist embeds
- **Figma**: Design file previews
- **Codepen**: Code previews
- **Giphy**: GIF embeds

### Fallback Strategy
For links without oEmbed support, show:
- **Link card**: Title + description + thumbnail
- **Click to expand**: User opts-in before loading external content
- **Lazy load**: Don't load all embeds at once (performance)

### Privacy & Security
- **Content Security Policy**: Sandbox iframes to prevent XSS
- **No tracking pixel loading**: Block external trackers
- **User consent**: Show "Load external embed?" prompt for privacy-minded users
- **Self-hosted cache**: Cache thumbnails locally, don't proxy external images in URL

---

## WHAT MAKES THIS A "FULL APP"?

By the end of Tier 3, The Penthouse becomes a **standalone alternative** to:
- **Discord**: For community messaging (via channels + roles)
- **Slack**: For team communication (via channels + threads)
- **Instagram**: For sharing media (via embedded feeds + video uploads)
- **YouTube**: For watching video (via embedded players)
- **WhatsApp**: For private messaging (via DMs + voice calls)

**You won't need to:**
- Install Instagram to watch friends' Stories (embed in Penthouse)
- Open YouTube in another tab (play videos in Penthouse)
- Switch to Discord for group chat (native channels in Penthouse)
- Use Slack for work updates (Penthouse can do this)

---

## DECISION: WHO BUILDS TIER 2 & 3?

| Feature | Owner | Notes |
|---------|-------|-------|
| Text formatting | Claude (frontend) | Markdown → HTML |
| Link previews | Claude (frontend) + Codex (backend API) | oEmbed fetching |
| Reactions | Claude (frontend) + Codex (backend) | New DB table |
| Typing indicators | Claude (frontend) + Codex (WebSocket) | Use existing Socket.IO |
| Channels | Codex (backend, complex) | New chat type, permissions |
| Embedded media | Claude (frontend) + Codex (oEmbed service) | High impact, medium effort |
| Calls (WebRTC) | Both (complex coordination) | New infrastructure |

---

## Questions for You

1. **Embedded media**: Do you want to start with Tier 3a (oEmbed support) before Tier 2? It's relatively low effort and high impact.
2. **Channels vs DMs only**: Should groups stay DM-based or add first-class "channels"?
3. **E2EE**: Do you want end-to-end encryption eventually? (Requires architectural change)
4. **Monetization**: This is for a private community—do you need billing/subscription features?

---

**Next step**: Pick which Tier 2 feature to tackle first. I'd recommend:
1. Text formatting (used in every message)
2. Embedded media (makes sharing content stay in-app)
3. Reactions (low effort, high engagement)

Let me know what excites you most!
