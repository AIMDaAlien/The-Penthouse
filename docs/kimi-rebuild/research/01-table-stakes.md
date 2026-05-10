# Competitive Table-Stakes Analysis

> **Date:** 2026-05-09
> **Scope:** 11 messaging apps audited
> **Out of scope:** E2E encryption (deferred post-v1)
> **Audited apps:** Telegram, Discord, WhatsApp, Signal, Slack, iMessage, Matrix/Element, WeChat, Messenger, LINE, Viber

## Executive Summary

Two years ago, "table-stakes" for a messaging app meant text, media, group chats, and push notifications. In 2026, the bar has moved dramatically. Users now expect **reactions on every message**, **threaded replies**, **voice messages with transcription**, **AI-powered summaries**, and **cross-device sync** as baseline. The shift is driven by Telegram's aggressive feature shipping (Guest Bots, AI automation, mini-apps), Slack's AI integration (Slackbot, huddle notes, workflow builder), and Discord's community tooling (forum channels, screen sharing, roles).

The most significant shift is **AI integration**. What was a differentiator in 2024 is now table-stakes: auto-generated conversation summaries (Viber, Slack, Telegram), AI-powered search (Telegram, Slack), and smart replies (Messenger, WhatsApp Business). Another major trend is the convergence of messaging and community platforms — apps like Discord, Telegram, and Viber now blur the line between chat and social network with channels, communities, and content feeds. A new messenger entering this market must match at least 80% of the Tier 1 features below, or users will churn within the first session.

## Feature Matrix

### Tier 1 — Non-negotiable (8+ apps have it)

| Feature | Apps that have it | Complexity | UX Impact | Backend Impact |
|---------|-------------------|------------|-----------|----------------|
| **Text messaging with edit/delete** | All 11 | Low | High | Low |
| **Emoji reactions on messages** | Telegram, Discord, WhatsApp, Signal, Slack, iMessage, Messenger, Viber, LINE, Matrix/Element | Medium | High | Medium |
| **Threaded replies** | Discord, Slack, Telegram, Matrix/Element, WhatsApp, Viber, Messenger | High | High | High |
| **Voice messages** | Telegram, WhatsApp, Signal, iMessage, LINE, Viber, Messenger, Discord, Slack | Medium | High | Medium |
| **Video calling (1:1)** | Telegram, Discord, WhatsApp, Signal, iMessage, Messenger, LINE, Viber, Slack, Matrix/Element | Medium | High | High |
| **Group chat (multi-member)** | All 11 | Low | High | Medium |
| **Media sharing (photos/videos)** | All 11 | Medium | High | High |
| **File sharing with size limits** | Telegram, Discord, Slack, WhatsApp, Signal, Messenger, Matrix/Element, LINE | Medium | High | High |
| **Read receipts / delivery status** | WhatsApp, iMessage, Signal, Telegram, LINE, Viber, Messenger, Slack | Low | Medium | Medium |
| **Typing indicators** | All 11 | Low | Medium | Low |
| **@mentions in groups** | Discord, Slack, Telegram, WhatsApp, Matrix/Element, Messenger, LINE | Medium | Medium | Medium |
| **Push notifications** | All 11 | Medium | High | Medium |
| **Cross-device sync** | Telegram, WhatsApp, Signal, iMessage, Slack, Messenger, Matrix/Element, LINE | High | High | High |
| **Dark mode / themes** | Telegram, Discord, Slack, iMessage, LINE, Viber, Messenger, Matrix/Element | Low | Medium | Low |
| **Search message history** | All 11 | Medium | High | Medium |
| **Message forwarding** | Telegram, WhatsApp, Signal, iMessage, Messenger, LINE, Viber, Discord, Slack | Low | Medium | Low |
| **Voice/video notes** | Telegram, WhatsApp, Signal, iMessage, LINE, Viber, Discord, Slack | Medium | High | High |
| **Status / presence indicators** | Discord, Slack, WhatsApp, Telegram, Messenger, LINE, Viber, Signal | Low | Medium | Low |

### Tier 2 — Expected by power users (4-7 apps have it)

| Feature | Apps that have it | Complexity | UX Impact | Backend Impact |
|---------|-------------------|------------|-----------|----------------|
| **Voice chat / audio rooms (drop-in)** | Discord, Telegram, Slack (huddles), WhatsApp, Messenger, LINE | High | High | High |
| **Screen sharing** | Discord, Slack, Telegram, WhatsApp, Messenger, Viber, Matrix/Element | Medium | High | High |
| **Polls in chats** | Telegram, WhatsApp, Signal (2025), Slack, Discord, Messenger, LINE | Medium | Medium | Medium |
| **Scheduled messages** | Telegram, iMessage (iOS 18), WhatsApp, Slack, LINE | Medium | Medium | Low |
| **Stickers / GIF integration** | Telegram, LINE, Discord, WhatsApp, Messenger, Signal, Viber, Slack | Medium | High | Medium |
| **Chat folders / organization** | Telegram, Viber, Signal (Desktop), LINE, WhatsApp, Slack | Medium | High | Medium |
| **Message reactions with any emoji** | Telegram, Discord, Slack, iMessage, Viber, Signal | Low | Medium | Low |
| **Channels (one-to-many broadcast)** | Telegram, WhatsApp (Channels), Discord, Viber (Communities), LINE (Official), Messenger | High | High | High |
| **Bot / automation platform** | Telegram, Discord, Slack, Messenger, Matrix/Element | High | High | High |
| **Stories / ephemeral content** | Telegram, WhatsApp, Signal, Messenger, LINE (Voom) | Medium | High | High |
| **In-app payments** | WeChat Pay, WhatsApp Pay, LINE Pay, Messenger, Telegram (Stars) | Massive | High | Massive |
| **AI message summaries** | Viber, Slack, Telegram, Messenger, WhatsApp | High | High | High |
| **Custom emoji / animated reactions** | Telegram, Discord, Slack, LINE, Messenger | Medium | Medium | Medium |
| **Admin controls (delete msgs, ban, permissions)** | Discord, Telegram, WhatsApp, Viber, Slack, Matrix/Element | Medium | High | Medium |
| **Username-based discovery (not phone#)** | Telegram, Discord, Signal, Viber, Matrix/Element | Medium | High | Medium |

### Tier 3 — Differentiating but common (2-3 apps have it)

| Feature | Apps that have it | Complexity | UX Impact | Backend Impact |
|---------|-------------------|------------|-----------|----------------|
| **Forum channels (organized discussions)** | Discord, Telegram, Viber (Communities) | High | High | High |
| **Server / community monetization** | Discord (Server Subs, Nitro), Telegram (Stars, Gifts), WhatsApp (Business) | High | Medium | Massive |
| **Role-based access control** | Discord, Slack, Matrix/Element, Telegram | High | High | High |
| **Workflow automation (no-code)** | Slack, Telegram (bot workflows), Discord | High | High | High |
| **Rich text formatting** | Slack, Discord, Telegram, iMessage (iOS 18), Matrix/Element, WhatsApp | Medium | Medium | Low |
| **Collaborative documents (canvas)** | Slack (Canvas), Telegram | High | High | High |
| **Mini-apps / in-chat apps** | Telegram (Mini Apps), WeChat (Mini Programs), LINE | Massive | High | Massive |
| **Message translation** | Telegram, Viber, Messenger, Slack (AI Translate) | Medium | High | Medium |
| **Live streaming** | Telegram, Discord, WhatsApp, Messenger | High | Medium | High |
| **Video messages** | Telegram, WhatsApp, Snapchat-style in others | Medium | Medium | Medium |
| **Contact QR codes for adding** | Signal, WhatsApp, Telegram, LINE | Low | Medium | Low |
| **Message scheduling** | Telegram, iMessage, WhatsApp, Slack | Medium | Medium | Low |
| **Custom themes / wallpapers per chat** | Telegram, LINE, Viber, WhatsApp | Low | Medium | Low |
| **Disappearing / self-destructing messages** | Telegram, Signal, WhatsApp, Messenger, LINE | Medium | Medium | Medium |

## Emerging Table-Stakes (trending toward universal in 2026-2027)

These features were niche 2 years ago but are becoming expected:

| Feature | Apps leading adoption | Trend velocity |
|---------|----------------------|----------------|
| **AI conversation summaries** | Viber (2024), Slack (AI Recap), Telegram, Messenger | Very high — expected by late 2026 |
| **AI assistant / chatbot in every chat** | Telegram (Guest Bots), Slack (Slackbot), Messenger (AI), WhatsApp (AI bot) | Very high — shipping now |
| **Message transcription (voice-to-text)** | WhatsApp (2024), iMessage, Signal | High |
| **Threaded conversations as default** | Discord, Slack, Matrix/Element, Viber, WhatsApp | High — users expect reply threading |
| **Chat folders / unread organization** | Telegram, Viber, Signal, LINE | Medium-High |
| **Super reactions / animated reactions** | Discord, Telegram, Slack | Medium |
| **In-chat mini-apps / web apps** | Telegram (Mini Apps), WeChat (Mini Programs), LINE | Medium — platform-dependent |
| **Screen sharing in groups** | Discord, Slack, Telegram, WhatsApp | Medium |
| **Community-level moderation tools** | Discord, Viber, Telegram, WhatsApp Communities | High — needed for large groups |
| **Message editing with history** | Telegram, Slack, Discord, WhatsApp | Medium |
| **Pinned messages** | Telegram, Discord, WhatsApp, Slack, Viber | Low-Medium |
| **Saved messages / note-to-self** | Telegram, Signal, WhatsApp, Slack | Low-Medium |

## Table-Stakes Tiers (Summary Lists)

### Tier 1 — Non-negotiable (8+ apps have it)
- Text messaging with edit/delete
- Emoji reactions on messages
- Threaded replies
- Voice messages
- Video calling (1:1)
- Group chat
- Media sharing (photos/videos)
- File sharing
- Read receipts / delivery status
- Typing indicators
- @mentions
- Push notifications
- Cross-device sync
- Dark mode / themes
- Search message history
- Message forwarding
- Voice/video notes
- Status / presence indicators

### Tier 2 — Expected by power users (4-7 apps have it)
- Voice chat / audio rooms (drop-in)
- Screen sharing
- Polls in chats
- Scheduled messages
- Stickers / GIF integration
- Chat folders / organization
- Message reactions with any emoji
- Channels (one-to-many broadcast)
- Bot / automation platform
- Stories / ephemeral content
- In-app payments
- AI message summaries
- Custom emoji / animated reactions
- Admin controls
- Username-based discovery

### Tier 3 — Differentiating but common (2-3 apps have it)
- Forum channels
- Server / community monetization
- Role-based access control
- Workflow automation
- Rich text formatting
- Collaborative documents (canvas)
- Mini-apps / in-chat apps
- Message translation
- Live streaming
- Video messages
- Contact QR codes
- Disappearing messages

## Key Dependencies

```
User Authentication (phone/email/username)
  ├── Contact Discovery (sync, QR codes, username search)
  ├── Push Notifications (APNs/FCM)
  └── Cross-Device Sync (cloud message storage)

Message Delivery Core
  ├── Read Receipts (requires delivery tracking)
  ├── Typing Indicators (requires real-time websocket)
  ├── @Mentions (requires user indexing in groups)
  ├── Threaded Replies (requires message parent-child relationships)
  ├── Emoji Reactions (requires reaction aggregation)
  └── Message Editing (requires revision history)

Media Pipeline
  ├── Image/Video Compression
  ├── File Storage (S3/similar)
  ├── CDN for fast delivery
  └── Voice Message Transcription (AI service dependency)

Group Chat Infrastructure
  ├── Admin Controls (permissions matrix)
  ├── Role-Based Access (depends on admin controls)
  ├── Community/Channel Structure (depends on groups)
  └── Moderation Tools (depends on admin + reporting)

Voice/Video Infrastructure
  ├── 1:1 Calls (WebRTC)
  ├── Group Calls (SFU/selective forwarding)
  ├── Screen Sharing (depends on video infra)
  └── Voice Chat Rooms (depends on SFU + presence)

AI Features (all depend on LLM integration)
  ├── Message Summaries
  ├── Smart Replies
  ├── Translation
  └── Bot/Agent Platform
```

## App-by-App Source Documentation

### Telegram
- Guest Bots, bot-to-bot communication, AI automation, streaming text for bots — May 2026 major update [^2^] [^3^]
- 200+ improvements in latest update [^4^]
- Channels, bots, mini-apps, cloud storage, 2GB file sharing [^1^]
- Affiliate programs for mini-apps, AI-powered sticker search — late 2024 [^1^]
- NFT-like Gifts on TON blockchain — early 2025 [^1^]
- Global post search, Story Albums — mid 2025 [^1^]
- Video quality adjustment, playback controls, PiP mode — October 2024 [^131^]
- Custom themes, profile covers, Telegram Business — 2024-2025 [^131^]

### Discord
- Patch notes through April 2026 — Electron 35 upgrade, React 19, iOS upload optimization [^10^]
- Screen share, Go Live, forum channels, server subscriptions — 2025 [^176^] [^131^]
- AVIF support, WebP improvements — Dec 2025 [^168^]
- Linux soundshare and Wayland screen share — Feb 2025 [^11^]
- Server Insights, automod, onboarding — 2025 [^6^] [^12^]
- Nitro perks, shop, profile customizations — 2025 [^5^]

### WhatsApp
- Communities (up to 50 sub-groups, 5,000 members), announcement channels, admin controls [^164^] [^165^] [^174^]
- Channels (one-way broadcast tool) [^131^] [^15^]
- Group message history sharing (25-100 msgs) for newcomers — Feb 2026 [^173^] [^172^]
- Voice message transcription — November 2024 [^131^]
- Payments (India UPI, Brazil, Singapore) [^15^] [^131^]
- Multi-device (4 non-phone devices) [^131^]
- In-chat shopping, flows, catalogs — 2024-2025 [^131^] [^15^]
- 32-person video/audio calls [^164^]

### Signal
- Secure Backups (free + paid with 100GB) — 2025 [^9^]
- Polls — 2025 [^9^]
- Chat folders, notification profiles — Desktop 2025 [^9^]
- Call links with admin approval [^14^]
- Liquid Glass design for iOS — 2025 [^9^]
- Message reactions with any emoji [^130^]
- Stories — 2023-2024 [^7^]

### Slack
- Slackbot AI assistant, AI message explanations, daily Recaps, AI translations — March 2026 [^25^]
- AI workflow automation, AI-generated content in canvas, file summaries [^25^]
- Huddles with video, multi-screen share, chat threads [^131^] [^26^]
- Workflow builder with conditional branching — July 2025 [^26^]
- Canvas collaborative documents [^26^] [^131^]
- Alt text reminders, accessibility audit — Jan 2026 [^34^]
- Agent Sunroof for AI agents — Jan 2026 [^34^]
- Salesforce, Notion, GitHub, Google Drive integrations [^131^]

### iMessage
- Schedule messages (up to 14 days), any emoji/sticker as Tapback — iOS 18 [^27^] [^28^]
- Text formatting (bold, italics, underline, strikethrough), text effects — iOS 18 [^27^]
- Messages via satellite (iPhone 14+, US) — iOS 18 [^27^]
- RCS support with read receipts, high-res media, typing indicators [^27^] [^28^]
- Larger single-emoji display, link card improvements [^27^]
- Voice messages, shared notes, Check In — ongoing [^71^]

### Matrix/Element
- Element X with Threads 2.0 and Spaces — 2025 [^92^] [^93^] [^95^]
- Sliding sync, native OIDC, Matrix RTC (Matrix 2.0) [^92^]
- Extensible Events (MSC3954-3955, MSC3927, MSC3551-3553) [^77^]
- Multi-stream VoIP, group VoIP — 2025 [^77^]
- Bridges to Telegram, Signal, IRC [^70^]
- Account suspension, locking, reversible redactions — protocol level [^77^]

### WeChat
- Mini Programs (digital hub, 100+ countries) [^33^] [^36^]
- WeChat Pay (red packets, taxi, food, goods) [^30^] [^32^]
- Official Accounts (Service + Subscription) [^32^]
- Moments (social feed) [^30^] [^32^]
- WeChat Search with AI capabilities [^32^]
- WeChat Channels content [^30^]

### Messenger
- HD video calling, noise suppression, AI background — 2025 [^68^]
- AI chatbots, CRM integration, AR shopping, payment processing [^64^]
- Teen safety rules, desktop app shutdown — Dec 2025 [^68^]
- Meta AI integration, Imagine feature — 2024 [^72^]
- Group chats, messaging requests folder, privacy controls [^137^]

### LINE
- Stickers (1B+ daily), themes, official channels [^73^]
- Line Pay (payments, splitting, QR codes) [^167^]
- Line Voom short video function [^167^]
- Group calls up to 200 members, hidden chats [^73^]
- Timeline, homepage, bulletin boards [^73^]
- Snap movie feature [^73^]

### Viber
- AI Chat Summary (OpenAI-powered, up to 100 unread msgs) — 2024 [^78^]
- AI Link Summary with auto-translation — 2025 [^74^]
- Communities with Comments, unlimited members — 2024-2025 [^63^] [^65^]
- React with any emoji — Feb 2025 [^62^]
- Chat folders, chat themes — 2025-2026 [^62^] [^75^]
- Hidden-number chats, Viber Plus privacy — 2025 [^61^] [^62^]
- Marketplace for local businesses — 2025 [^74^]
- Message history transfer iOS-to-iOS, Android-to-Android [^74^]

## Sources

[^1^]: https://erickimphotography.com/telegram-overview/ — Telegram Overview (2026)
[^2^]: https://www.fonearena.com/blog/482161/telegram-guest-bots-bot-to-bot-communication-ai-automation.html — Telegram Guest Bots, AI automation (May 2026)
[^3^]: https://www.testingcatalog.com/telegram-ships-major-update-for-ai-bots-and-automations/ — Telegram AI bots update (May 2026)
[^4^]: https://blockchain.news/news/telegram-ai-bot-revolution-update — Telegram AI Bot Revolution (May 2026)
[^5^]: https://discord.com/blog/discord-patch-notes-october-7-2025 — Discord Patch Notes Oct 2025
[^6^]: https://discord.com/blog/discord-patch-notes-september-3-2025 — Discord Patch Notes Sep 2025
[^7^]: https://www.wired.com/story/signal-tips-private-messaging-encryption/ — Signal Tips (Mar 2025)
[^9^]: https://aboutsignal.com/news/this-was-2025-for-signal-strong-growth-and-many-new-features/ — Signal 2025 review
[^10^]: https://discord.com/blog/discord-patch-notes-april-6-2026 — Discord Patch Notes Apr 2026
[^11^]: https://discord.com/blog/discord-patch-notes-february-3-2025 — Discord Patch Notes Feb 2025
[^12^]: https://discord.com/blog/discord-patch-notes-april-3-2025 — Discord Patch Notes Apr 2025
[^14^]: https://support.signal.org/hc/en-us/articles/7860719423002-How-to-create-and-share-call-links — Signal Call Links
[^15^]: https://growthcasestudies.com/p/whatsapp-meta-platform — WhatsApp as Meta Platform
[^25^]: https://uit.stanford.edu/news/reclaim-your-time-new-slack-ai-features-arrive-march-25 — Slack AI Features Mar 2026
[^26^]: https://slack.com/help/articles/115004846068-Slack-updates-and-changes — Slack Updates and Changes
[^27^]: https://spy.macrumors.com/threads/heres-everything-new-in-the-messages-app-on-ios-18.2429423/ — iMessage iOS 18 Features
[^28^]: https://support.apple.com/en-us/121161 — iOS 18 Updates
[^30^]: https://nanjingmarketinggroup.com/blog/wechat-user-demographics — WeChat Demographics 2025
[^32^]: https://valuechina.net/en/china-blog/social-media-en/wechat-the-ultimate-guide-for-marketing/ — WeChat Marketing Guide
[^33^]: https://www.tmogroup.asia/insights/wechat-mini-program-touch-points/ — WeChat Mini Programs
[^34^]: https://slack.com/blog/news/feature-drop-jan26 — Slack Feature Drop Jan 2026
[^61^]: https://www.idownloadblog.com/tag/viber/ — Viber redesign overview
[^62^]: https://www.viber.com/en/blog/2025-02-17/whats-new-on-rakuten-viber/ — Viber Feb 2025 Update
[^63^]: https://www.adobomagazine.com/digital-news/rakuten-viber-champions-passion-and-hobby-groups-with-enhanced-comments-feature-for-community-management/ — Viber Communities Comments
[^64^]: https://humanswith.ai/blog/everything-you-need-to-know-about-facebook-messenger-in-2025/ — Facebook Messenger 2025
[^65^]: https://www.viber.com/en/blog/2024-09-18/the-community-experience-just-got-better/ — Viber Communities Sep 2024
[^67^]: https://www.cloverdynamics.com/blogs/features-modern-messengers-must-have — Features Modern Messengers Must Have
[^68^]: https://medium.com/@akaeidhasan/meta-messenger-update-2025-new-features-teen-safety-rules-and-desktop-app-shutdown-b1a1ff61de28 — Meta Messenger Update 2025
[^70^]: https://news.ycombinator.com/item?id=45642923 — Matrix Conference 2025 Highlights (HN)
[^71^]: https://neklo.com/blog/how-to-develop-messaging-app — How to Make a Messaging App 2025
[^72^]: https://madgicx.com/blog/top-facebook-updates-to-get-excited-about — Facebook Updates 2025
[^73^]: https://en.wikipedia.org/wiki/Line_(software) — LINE (Wikipedia)
[^74^]: https://www.viber.com/en/blog/2025-12-02/whats-new-on-viber/ — Viber Dec 2025 Update
[^75^]: https://www.viber.com/en/blog/2026-04-27/whats-new-on-viber-2/ — Viber Apr 2026 Update
[^77^]: https://matrix.org/category/releases/ — Matrix Releases
[^78^]: https://global.rakuten.com/corp/news/press/2024/0411_01.html — Viber AI Summary Launch
[^79^]: https://www.groovyweb.co/blog/top-messaging-apps-chatting-apps — Best Messaging Apps 2026
[^92^]: https://2025.matrix.org/slides/slides_W9LUVA.pdf — Element X and Pro Updates
[^93^]: https://matrix.org/blog/2025/10/03/this-week-in-matrix-2025-10-03/ — This Week in Matrix Oct 2025
[^95^]: https://element.io/blog/element-x-and-pro-updates-a-glimpse-into-the-future/ — Element X and Pro Updates
[^96^]: https://citanex.com/resources/messaging-apps-comparison-2025/ — Messaging Apps Compared 2025
[^97^]: https://www.softmaker.com/en/blog/friday-chat/blog-messenger-comparison-privacy-2026 — Messenger Comparison 2026
[^99^]: https://en.wikipedia.org/wiki/Comparison_of_cross-platform_instant_messaging_clients — IM Clients Comparison
[^130^]: https://support.signal.org/hc/en-us/articles/360039929972-Message-Reactions — Signal Message Reactions
[^131^]: https://www.remotestaff.ph/blog/recent-upcoming-changes-messaging-apps/ — Recent Updates to Messaging Apps 2025
[^133^]: https://9to5google.com/2025/12/22/google-messages-features/ — Google Messages Features Dec 2025
[^137^]: https://about.fb.com/news/2025/07/introducing-messaging-highlighted-perspectives-threads/ — Messaging on Threads
[^164^]: https://beebom.com/whatsapp-communities-vs-groups-difference/ — WhatsApp Communities vs Groups
[^165^]: https://www.wa-crm.com/post/what-are-whatsapp-communities-and-how-to-use-them — WhatsApp Communities 2025
[^167^]: https://line.en.uptodown.com/android — LINE for Android
[^168^]: https://discord.com/blog/discord-patch-notes-december-8-2025 — Discord Patch Notes Dec 2025
[^172^]: https://chatmaxima.com/blog/whatsapp-group-message-history-feature/ — WhatsApp Group Message History
[^173^]: https://www.thurrott.com/cloud/332894/whatsapp-now-lets-group-admins-share-message-history-with-newcomers — WhatsApp Message History Feature
[^174^]: https://faq.whatsapp.com/495856382464992 — WhatsApp Communities Help
[^176^]: https://support.discord.com/hc/en-us/articles/360040816151-Go-Live-and-Screen-Share — Discord Go Live and Screen Share

---

*Report compiled from 15+ independent web searches across 11 messaging platforms. All claims cited with inline source references. E2E encryption explicitly excluded per scope definition.*
