# THE PENTHOUSE — Native Mobile Application Specification
## A Comprehensive Technical Blueprint for iOS & Android Implementation

---

## EXECUTIVE SUMMARY

The Penthouse is a social chat application that reimagines the Discord-like experience through the lens of an exclusive, artsy cafe lounge. The core identity is **glassmorphism + physics-driven motion + muted luxury**. Every interaction should feel like tapping frosted glass panes that slide, bounce, and settle with tangible weight.

**Platform Targets:**
- iOS 17.0+ (SwiftUI primary, UIKit for complex animations)
- Android 14+ (Jetpack Compose with Material 3 Expressive)

**Non-Negotiable Principles:**
2. Glass panels slide OVER the background, never replacing it
3. Material 3 Expressive spring physics for ALL motion
4. No metallic accents—only lavender→periwinkle gradient
5. Ubuntu typography everywhere (SF Pro/Inter as system fallback)

---

## PART 1: VISUAL DESIGN SYSTEM

### 1.1 Color Architecture

#### Base Palette (Catppuccin Mocha Foundation)
```
CRUST:       #11111b  (deepest background)
MANTLE:      #181825  (elevated surfaces)
BASE:        #1e1e2e  (primary surface)
SURFACE0:    #313244  (secondary surface)
SURFACE1:    #45475a  (hover states)
SURFACE2:    #585b70  (borders, dividers)
OVERLAY0:    #6c7086  (disabled states)
OVERLAY1:    #7f849c  (secondary text)
OVERLAY2:    #9399b2  (tertiary text)
SUBTEXT0:    #a6adc8  (muted text)
SUBTEXT1:    #bac2de  (secondary text)
TEXT:        #cdd6f4  (primary text)
```

#### Accent Palette (Lavender → Periwinkle ONLY)
```
LAVENDER:    #b4befe  (primary accent)
PERIWINKLE:  #8b9bf6  (secondary accent)
MAUVE:       #cba6f7  (tertiary accent, sparingly)

GRADIENT_PRIMARY: linear-gradient(135deg, #b4befe, #8b9bf6)
```

#### Semantic Colors
```
SUCCESS:     #a6e3a1  (soft green)
WARNING:     #f9e2af  (soft amber)
ERROR:       #f38ba8  (soft red)
ONLINE:      #a6e3a1  (status dot)
AWAY:        #f9e2af  (status dot)
OFFLINE:     #6c7086  (status dot)
```

### 1.2 Glassmorphism System (Critical)

The glass effect is the SOUL of this app. Every panel, card, and surface must implement this EXACT specification:

#### Glass Panel Formula
```
BACKGROUND: rgba(18, 18, 28, 0.55)
BACKDROP_FILTER: blur(22px) saturate(120%)
BORDER: 1px solid rgba(255, 255, 255, 0.08)
SHADOW: 0 18px 50px rgba(0, 0, 0, 0.45)
```

#### Glass Card Formula (smaller elements)
```
BACKGROUND: rgba(30, 30, 46, 0.65)
BACKDROP_FILTER: blur(18px) saturate(110%)
BORDER: 1px solid rgba(255, 255, 255, 0.06)
BORDER_RADIUS: 22px
```

#### Glass Row Formula (list items)
```
BACKGROUND: rgba(49, 50, 68, 0.4)
BACKDROP_FILTER: blur(12px)
BORDER: 1px solid rgba(255, 255, 255, 0.04)
BORDER_RADIUS: 14px
HOVER_BACKGROUND: rgba(69, 71, 90, 0.5)
```

#### Glass Input Formula
```
BACKGROUND: rgba(17, 17, 27, 0.6)
BACKDROP_FILTER: blur(8px)
BORDER: 1px solid rgba(255, 255, 255, 0.08)
BORDER_RADIUS: 18px
FOCUS_BORDER: #b4befe
FOCUS_SHADOW: 0 0 0 2px rgba(180, 190, 254, 0.15)
```

#### Accent Glow Formula
```
BOX_SHADOW: 
  0 0 30px rgba(180, 190, 254, 0.3),
  0 0 60px rgba(139, 155, 246, 0.15)
```

### 1.3 Typography System

**Primary Font:** Ubuntu (Google Fonts)
- Weights: 300 (Light), 400 (Regular), 500 (Medium), 700 (Bold)
- Load ALL weights at app startup

**Fallback Chain:**
- iOS: Ubuntu → SF Pro → system-ui
- Android: Ubuntu → Inter → Roboto → system-ui

**Settings Font:** JetBrains Mono (400, 500 only)

#### Type Scale
```
DISPLAY:     28-34sp, weight 700, line-height 1.1, letter-spacing -0.02em
H1:          22-26sp, weight 700, line-height 1.2
H2:          18-20sp, weight 500, line-height 1.3
BODY:        15-16sp, weight 400, line-height 1.5
CAPTION:     12-13sp, weight 400, line-height 1.4
MICRO:       10-11sp, weight 500, line-height 1.3, uppercase, letter-spacing 0.08em
```

### 1.4 Shape & Corner Radius System
```
PANELS:      22-28dp
CARDS:       18-22dp
BUTTONS:     14-18dp
PILLS:       999dp (full rounded)
BUBBLES:     18-22dp (with directional tail)
AVATARS:     50% (circle) or 12dp (squircle)
INPUTS:      18dp
```

### 1.5 Spacing System (8dp Grid)
```
XS:  4dp
S:   8dp
M:   16dp
L:   24dp
XL:  32dp
2XL: 48dp
3XL: 64dp
```

### 1.6 Elevation & Shadows

**Static Shadows ONLY** — never animate shadow properties:
```
PANEL_ELEVATION:     0 18dp 50dp rgba(0,0,0,0.45)
CARD_ELEVATION:      0 8dp 24dp rgba(0,0,0,0.35)
BUTTON_ELEVATION:    0 4dp 12dp rgba(0,0,0,0.25)
FAB_ELEVATION:       0 6dp 20dp rgba(0,0,0,0.4)
```

---

## PART 2: MATERIAL 3 EXPRESSIVE MOTION SYSTEM

This is NON-NEGOTIABLE. The motion language defines The Penthouse's identity.

### 2.1 Spring Physics (The Core)

All animations use spring physics, NOT traditional easing curves. Springs have three properties:
- **STIFFNESS**: How fast the spring resolves (higher = faster)
- **DAMPING**: How fast bounce wears out (higher = less bounce)
- **INITIAL_VELOCITY**: Starting speed

#### iOS Implementation (UISpringTimingParameters)
```swift
// Expressive Spring (primary)
let expressiveSpring = UISpringTimingParameters(
    damping: 0.75,
    response: 0.5
)

// Standard Spring (utilitarian)
let standardSpring = UISpringTimingParameters(
    damping: 0.9,
    response: 0.5
)

// Bouncy Spring (playful moments)
let bouncySpring = UISpringTimingParameters(
    damping: 0.6,
    response: 0.6
)
```

#### Android Implementation (SpringAnimation)
```kotlin
// Expressive Spring
SpringAnimation(view, DynamicAnimation.TRANSLATION_X, 0f).apply {
    spring.dampingRatio = SpringForce.DAMPING_RATIO_MEDIUM_BOUNCY
    spring.stiffness = SpringForce.STIFFNESS_LOW
}

// Standard Spring
SpringAnimation(view, DynamicAnimation.TRANSLATION_X, 0f).apply {
    spring.dampingRatio = SpringForce.DAMPING_RATIO_HIGH_BOUNCY
    spring.stiffness = SpringForce.STIFFNESS_MEDIUM
}
```

### 2.2 Motion Tokens (Reference Values)

| Token | Duration | iOS Damping | Android DampingRatio | Stiffness |
|-------|----------|-------------|---------------------|-----------|
| MICRO | 120-180ms | 0.85 | HIGH_BOUNCY | MEDIUM |
| STANDARD | 280-360ms | 0.75 | MEDIUM_BOUNCY | LOW |
| PANEL | 420-520ms | 0.7 | MEDIUM_BOUNCY | LOW |
| AMBIENT | 3000ms+ | 0.9 | HIGH_BOUNCY | LOW |

### 2.3 Animation Patterns

#### Panel Slide (Enter from edge)
```
START:  translateX(100%) or translateY(100%), opacity 0
END:    translateX(0) or translateY(0), opacity 1
EASING: Spring with overshoot (60% point: -4% to -6%)
```

#### Panel Slide (Exit)
```
Reverse of enter, but FASTER (no overshoot)
Duration: 70% of enter duration
```

#### Stagger Pattern
```
Base delay: 20-30ms per item
Max stagger: 200ms total
Formula: delay = index * 25ms
```

#### Tactile Tap Feedback
```
PRESS:   scale(0.97), duration 80ms
RELEASE: scale(1.0), spring recovery 150ms
```

#### Message Slide-In
```
START:  translateY(16dp), opacity 0
END:    translateY(0), opacity 1
EASING: cubic-bezier(0.31, 0.94, 0.34, 1.00)
```

#### Send Button Pop
```
PRESS:   scale(0.97) + rotate(-15deg), 80ms
RELEASE: scale(1.0) + rotate(0), spring 200ms
RING:    scale(1.0 → 1.6), opacity(0.6 → 0), 300ms
```

#### Ambient Glow Pulse (CTA buttons)
```
LOOP:    scale(1.0 → 1.02 → 1.0)
DURATION: 3000ms
EASING:  ease-in-out
```

### 2.4 Scroll-Driven Effects

#### Parallax Header
```
Header moves at 0.5x scroll speed
Implementation: translateY = scrollOffset * 0.5
```

#### Fade on Scroll
```
Header title fades to 0.7 opacity over first 100dp of scroll
Formula: opacity = 1 - (scrollY / 100) * 0.3
```

### 2.5 Gesture Handling

#### Swipe-to-Dismiss (Panels)
```
THRESHOLD: 20% of screen width
VELOCITY:  300dp/s minimum
SPRING:    Return to origin if under threshold
EXIT:      Complete dismiss if over threshold
```

#### Pull-to-Refresh
```
THRESHOLD: 80dp
INDICATOR: Glass circle with rotating gradient
RELEASE:   Spring back if under threshold
```

---

## PART 3: SCREEN ARCHITECTURE

### 3.1 Background Layer (Persistent)

**CRITICAL:** One background image spans the entire app lifetime.

```
IMAGE: /assets/lounge-bg.jpg (16:9, 2K resolution minimum)
TREATMENT: Fixed position, cover fit, no scrolling
OVERLAY: Radial gradient vignette (center transparent, edges dark)
```

#### iOS Implementation
```swift
ZStack {
    // Background (z-index: 0, never changes)
    Image("lounge-bg")
        .resizable()
        .aspectRatio(contentMode: .fill)
        .ignoresSafeArea()
        .overlay(
            RadialGradient(
                colors: [.clear, Color(hex: "11111b").opacity(0.6)],
                center: .center,
                startRadius: 0,
                endRadius: UIScreen.main.bounds.width
            )
        )
    
    // Panels slide over this
    // ...
}
```

#### Android Implementation
```kotlin
Box(modifier = Modifier.fillMaxSize()) {
    // Background (z-index: 0, never changes)
    Image(
        painter = painterResource(R.drawable.lounge_bg),
        contentDescription = null,
        modifier = Modifier.fillMaxSize(),
        contentScale = ContentScale.Crop
    )
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    colors = listOf(
                        Color.Transparent,
                        Color(0xFF11111B).copy(alpha = 0.6f)
                    )
                )
            )
    )
    
    // Panels slide over this
    // ...
}
```

### 3.2 Navigation Architecture

**Single Activity/Single Window Pattern**
- No traditional navigation stack
- Panels slide in/out over persistent background
- State machine manages visible panel

#### Panel States
```
WELCOME → LOBBY → CHAT
            ↓
        SETTINGS (sheet)
        PROFILE (drawer)
        MEMBERS (sidebar)
```

#### iOS Navigation
```swift
enum Panel: Equatable {
    case welcome
    case lobby
    case chat(channel: Channel)
}

@State private var currentPanel: Panel = .welcome
@State private var isSettingsOpen = false
@State private var isProfileOpen = false
@State private var isMembersOpen = false
```

#### Android Navigation
```kotlin
sealed class Panel {
    object Welcome : Panel()
    object Lobby : Panel()
    data class Chat(val channel: Channel) : Panel()
}

var currentPanel by remember { mutableStateOf<Panel>(Panel.Welcome) }
var isSettingsOpen by remember { mutableStateOf(false) }
var isProfileOpen by remember { mutableStateOf(false) }
var isMembersOpen by remember { mutableStateOf(false) }
```

---

## PART 4: SCREEN SPECIFICATIONS

### 4.1 Welcome Screen

**Purpose:** Mood-aware entry point with randomized greetings

#### Layout
```
┌─────────────────────────────────┐
│                                 │
│         [Glass Card]            │
│      ┌─────────────────┐        │
│      │   ✨ Afternoon  │        │
│      │    · mellow     │        │
│      │                 │        │
│      │  Evening hush.  │        │
│      │                 │        │
│      │ Soft light,     │        │
│      │ quiet conv.     │        │
│      │                 │        │
│      │ [Step inside →] │        │
│      │                 │        │
│      │   Change mood   │        │
│      └─────────────────┘        │
│                                 │
│      Tonight: mellow            │
└─────────────────────────────────┘
```

#### Mood System
```kotlin
data class MoodMessage(
    val mood: MoodType,
    val headline: String,
    val subheadline: String
)

enum class MoodType {
    MELLOW, JAZZ, QUIET, CREATIVE, LATE
}

val moodMessages = mapOf(
    MoodType.MELLOW to MoodMessage(
        mood = MELLOW,
        headline = "Evening hush.",
        subheadline = "Soft light, quiet conversation."
    ),
    MoodType.JAZZ to MoodMessage(
        mood = JAZZ,
        headline = "Late-night jazz energy.",
        subheadline = "Improvisation and smooth transitions."
    ),
    MoodType.QUIET to MoodMessage(
        mood = QUIET,
        headline = "A room above the noise.",
        subheadline = "Where thoughts find their voice."
    ),
    MoodType.CREATIVE to MoodMessage(
        mood = CREATIVE,
        headline = "Sketchbook hours.",
        subheadline = "Ideas flowing, pens moving."
    ),
    MoodType.LATE to MoodMessage(
        mood = LATE,
        headline = "3 AM thoughts.",
        subheadline = "The best conversations happen now."
    )
)
```

#### Time Context
```kotlin
fun getTimeContext(): String = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
    in 5..11 -> "Morning"
    in 12..16 -> "Afternoon"
    in 17..21 -> "Evening"
    else -> "Night"
}
```

#### Animations
1. **Background fade-in:** 600ms on app launch
2. **Glass card slide-up:** translateY(40dp → 0), spring, 480ms
3. **CTA pulse loop:** scale(1 → 1.02 → 1), 3000ms, infinite
4. **Mood crossfade:** opacity transition, 180ms
5. **Shimmer effect:** diagonal gradient sweep, 10s loop

### 4.2 Lobby Screen

**Purpose:** Server/channel navigation hub

#### Layout
```
┌─────────────────────────────────┐
│ The Penthouse        [⋯]        │  ← Header (64dp)
│ ┌─────────────────────────────┐ │
│ │ 🔍 Find a room...           │ │  ← Search (glass)
│ └─────────────────────────────┘ │
├──────┬──────────────────────────┤
│  P   │  TONIGHT                 │  ← Section header
│  ─   │ ┌──────────────────────┐ │
│  C   │ │ # general         2  │ │  ← Channel row
│  N   │ ├──────────────────────┤ │
│  J   │ │ # jazz-hour          │ │
│  S   │ ├──────────────────────┤ │
│  +   │ │ # sketchbook         │ │
│      │ └──────────────────────┘ │
│      │  VOICE                   │
│      │ ┌──────────────────────┐ │
│      │ │ 🎙 Lounge        3 → │ │  ← Voice channel
│      │ ├──────────────────────┤ │
│      │ │ 🎙 Quiet room    1 → │ │
│      │ └──────────────────────┘ │
│      │                            │
│      │         [➕]               │  ← FAB (bottom-right)
└──────┴──────────────────────────┘
```

#### Components

**Server Rail (72dp width):**
- Fixed position left
- Server icons: 48dp circles, 12dp gap
- Selected indicator: 4dp lavender bar on left
- Unread badge: 20dp circle, accent gradient

**Channel Row (56dp height):**
- Icon: 20dp, muted color
- Name: Body text, primary color
- Unread count: 24dp pill, lavender/20 background
- Member count: Caption + chevron

**Search Pill:**
- Height: 44dp
- Glass input with search icon
- Placeholder: "Find a room..."

**FAB (56dp):**
- Position: bottom-right, 24dp margin
- Accent gradient fill
- Shadow: 0 6dp 20dp rgba(0,0,0,0.4)
- Spring-in animation on panel enter

#### Animations
1. **Rail slide-in:** from left, spring, 480ms
2. **Server icons stagger:** 40ms each
3. **Channel rows stagger:** 30ms each
4. **FAB spring-in:** from bottom-right, 400ms delay
5. **Selected indicator:** scaleX animation on switch

### 4.3 Chat Screen

**Purpose:** Primary conversation interface

#### Layout
```
┌─────────────────────────────────┐
│ ← #jazz-hour         [👤🔍👥]   │  ← Header
│ Lo-fi and late thoughts.        │
├─────────────────────────────────┤
│                                 │
│  ┌──┐  Maya              2:34p │
│  │M │  That new track...       │
│  └──┘  🎵 3                  │
│                                 │
│              ┌──┐               │
│  Perfect...  │Y │  You    2:38p │
│  ✨ 2        └──┘               │
│                                 │
│  ┌──┐  Sofia             3:15p │
│  │S │  Anyone up for...        │
│  └──┘                          │
│                                 │
│     ● ● ● (typing)              │
│                                 │
├─────────────────────────────────┤
│ [📎]  [Message #jazz-hour  😊] [➤]│ ← Composer
└─────────────────────────────────┘
```

#### Message Bubble Specifications

**Sent Bubble (Me):**
```
BACKGROUND: linear-gradient(135deg, rgba(180,190,254,0.25), rgba(139,155,246,0.2))
BORDER_RADIUS: 18dp 18dp 4dp 18dp (tail on left)
PADDING: 12dp 16dp
MAX_WIDTH: 75% of screen
```

**Received Bubble (Others):**
```
BACKGROUND: rgba(49, 50, 68, 0.6)
BORDER_RADIUS: 18dp 18dp 18dp 4dp (tail on right)
PADDING: 12dp 16dp
MAX_WIDTH: 75% of screen
```

**Avatar:**
- Size: 36dp
- Shape: Circle
- Background: Surface1 (others), Accent gradient (me)
- Text: Subheading, centered initial

**Reactions:**
- Height: 28dp
- Padding: 4dp 10dp
- Background: white/5 (unselected), lavender/20 + lavender/40 border (selected)
- Font: Caption

#### Composer Specifications
```
HEIGHT: 72dp
BACKGROUND: Glass panel
ATTACH_BUTTON: 44dp, paperclip icon
INPUT: Glass input, flex: 1
EMOJI_BUTTON: 36dp, smile icon
SEND_BUTTON: 44dp, accent gradient when active
```

#### Animations
1. **New message:** translateY(16dp → 0) + fade, 320ms
2. **Send button press:** scale(0.97) + rotate(-15deg), 80ms
3. **Send button release:** spring back + ring expand
4. **Reaction appear:** scale(0.8 → 1), spring
5. **Typing indicator:** 3-dot bounce, staggered 150ms

### 4.4 Member Sidebar

**Purpose:** Show online/away/offline members

#### Layout
```
┌────────────────────────┐
│ Members           [✕]  │  ← Header (64dp)
├────────────────────────┤
│ ONLINE — 4             │
│ ┌────────────────────┐ │
│ │ ● Maya        💬 📞│ │  ← Member row
│ │   🎵 Listening...  │ │
│ ├────────────────────┤ │
│ │ ● Jun              │ │
│ ├────────────────────┤ │
│ │ ● Sofia   🎨 Sketch│ │
│ └────────────────────┘ │
│                        │
│ AWAY — 2               │
│ ┌────────────────────┐ │
│ │ ◐ Alex             │ │
│ └────────────────────┘ │
│                        │
│ OFFLINE — 8            │
│ ┌────────────────────┐ │
│ │ ○ Jordan           │ │
│ └────────────────────┘ │
└────────────────────────┘
```

#### Specifications
- Width: 280dp (mobile), 320dp (tablet)
- Slide-in from right
- Role headers: MICRO text, uppercase, muted
- Member row height: 44dp
- Avatar: 32dp with status dot (10dp, positioned -4dp from bottom-right)
- Hover actions: Message + Call icons (only on hover/press)

#### Status Dots
```
ONLINE:  #a6e3a1, glow shadow
AWAY:    #f9e2af, no glow
OFFLINE: #6c7086, no glow
```

#### Animations
1. **Slide-in:** translateX(100% → 0), spring, 480ms
2. **Backdrop fade:** opacity(0 → 1), 300ms
3. **Member stagger:** 20ms each
4. **Action icons:** fade-in on hover, 150ms

### 4.5 Settings Sheet

**Purpose:** App configuration bottom sheet

#### Layout
```
┌────────────────────────┐
│         ───            │  ← Handle (drag indicator)
│ Settings          [✕]  │
├────────────────────────┤
│ [Appearance][Notif...] │  ← Section tabs (scrollable)
│ [Privacy]  [About]     │
├────────────────────────┤
│                        │
│ ┌────────────────────┐ │
│ │ 🎨 Dark mode    [●]│ │  ← Toggle row
│ ├────────────────────┤ │
│ │ 🪟 Glass density > │ │  ← Select row
│ ├────────────────────┤ │
│ │ ✏️ Font size    >  │ │
│ ├────────────────────┤ │
│ │ ⚡ Reduce motion[ ]│ │
│ └────────────────────┘ │
│                        │
│ The Penthouse · v1.0   │
└────────────────────────┘
```

#### Specifications
- Height: 85% of screen (mobile), 500dp (tablet)
- Border radius: 28dp top
- Handle: 40dp wide, 4dp height, white/20
- Section tabs: Pill buttons, accent when selected
- Toggle: 48dp width, 28dp height, spring animation
- Rows: Glass row, 56dp height

#### Toggle Animation
```
THUMB_SIZE: 24dp
TRACK_WIDTH: 48dp
ANIMATION: Spring, 200ms
ON:  thumb translateX(20dp), track lavender
OFF: thumb translateX(0), track surface2
```

### 4.6 Profile Drawer

**Purpose:** User profile display

#### Layout
```
┌────────────────────────┐
│ ┌────────────────────┐ │
│ │   [Banner Image]   │ │  ← 120dp height
│ │         ✕          │ │
│ │    ┌────┐          │ │
│ │    │ M  │          │ │  ← Avatar (80dp)
│ └────┴────┴──────────┘ │
│ Maya Chen              │
│ @maya                  │
│ ● online               │
│                        │
│ ┌────────────────────┐ │
│ │ 🎵 Listening to... │ │  ← Activity card
│ │ Nujabes — Feather  │ │
│ └────────────────────┘ │
│                        │
│ [Message] [Call] [⋯]   │  ← Action buttons
│                        │
│ 📍 San Francisco, CA   │
│ 📅 Member since Jan 24 │
│                        │
│ ROLES                  │
│ [Resident] [Musician]  │  ← Role pills
│ [Night Owl]            │
│                        │
│ MUTUAL ROOMS           │
│ ┌────────────────────┐ │
│ │ P The Penthouse    │ │
│ ├────────────────────┤ │
│ │ J Jazz Lounge      │ │
│ └────────────────────┘ │
└────────────────────────┘
```

#### Specifications
- Width: 360dp (mobile full-screen), 400dp (tablet)
- Slide-in from right
- Banner: Accent gradient overlay (40% opacity)
- Avatar: 80dp, -40dp overlap with banner, 4dp border
- Activity card: Glass row with music icon
- Action buttons: Message (accent), Call (glass), More (glass icon)
- Role pills: Lavender/Mauve/Periwinkle backgrounds at 15% opacity

---

## PART 5: COMPONENT LIBRARY

### 5.1 GlassPanel (Root Component)

#### iOS
```swift
struct GlassPanel<Content: View>: View {
    let content: Content
    
    var body: some View {
        content
            .background(
                Color(hex: "12121C").opacity(0.55)
            )
            .background(.ultraThinMaterial)
            .overlay(
                RoundedRectangle(cornerRadius: 22)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.45), radius: 50, x: 0, y: 18)
    }
}
```

#### Android
```kotlin
@Composable
fun GlassPanel(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Box(
        modifier = modifier
            .background(Color(0xFF12121C).copy(alpha = 0.55f))
            .blur(22.dp)
            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(22.dp))
            .shadow(50.dp, RoundedCornerShape(22.dp), spotColor = Color.Black.copy(alpha = 0.45f))
    ) {
        content()
    }
}
```

### 5.2 GlassButton

#### Variants
1. **Primary:** Accent gradient fill
2. **Secondary:** Glass background
3. **Tertiary:** Transparent with text

#### States
- Default
- Pressed (scale 0.97)
- Disabled (opacity 0.5)
- Loading (spinner replaces text)

### 5.3 MessageBubble

#### Props
```kotlin
data class MessageBubbleProps(
    val content: String,
    val author: User,
    val timestamp: Date,
    val isMe: Boolean,
    val reactions: List<Reaction>,
    val onReactionTap: (Reaction) -> Unit,
    val onLongPress: () -> Unit
)
```

### 5.4 ChannelRow

#### Props
```kotlin
data class ChannelRowProps(
    val channel: Channel,
    val isSelected: Boolean,
    val onTap: () -> Unit
)
```

### 5.5 MemberRow

#### Props
```kotlin
data class MemberRowProps(
    val member: Member,
    val onMessageTap: () -> Unit,
    val onCallTap: () -> Unit
)
```

### 5.6 ToggleSwitch

#### Specifications
- Track: 48dp × 28dp
- Thumb: 24dp circle
- Spring animation: 200ms
- Haptic feedback on toggle

---

## PART 6: DATA MODELS

### 6.1 Core Models

```kotlin
// User.kt
data class User(
    val id: String,
    val name: String,
    val handle: String,
    val avatar: String, // Initial or URL
    val banner: String?, // URL or null
    val status: UserStatus,
    val activity: Activity?,
    val roles: List<Role>
)

enum class UserStatus {
    ONLINE, AWAY, OFFLINE, DO_NOT_DISTURB
}

// Channel.kt
data class Channel(
    val id: String,
    val name: String,
    val type: ChannelType,
    val topic: String?,
    val unreadCount: Int?,
    val memberCount: Int?,
    val lastMessage: Message?
)

enum class ChannelType {
    TEXT, VOICE, ANNOUNCEMENT
}

// Message.kt
data class Message(
    val id: String,
    val channelId: String,
    val author: User,
    val content: String,
    val timestamp: Date,
    val editedAt: Date?,
    val reactions: List<Reaction>,
    val attachments: List<Attachment>,
    val replyTo: Message?
)

// Reaction.kt
data class Reaction(
    val emoji: String,
    val count: Int,
    val users: List<String>, // User IDs
    val me: Boolean
)

// Server.kt
data class Server(
    val id: String,
    val name: String,
    val icon: String, // Initial or URL
    val unreadCount: Int?,
    val channels: List<Channel>,
    val members: List<Member>
)

// Member.kt
data class Member(
    val user: User,
    val nickname: String?,
    val role: Role,
    val joinedAt: Date
)

// Role.kt
data class Role(
    val id: String,
    val name: String,
    val color: Color,
    val permissions: List<Permission>
)
```

### 6.2 State Management

#### iOS (SwiftUI + Combine)
```swift
@MainActor
class AppState: ObservableObject {
    @Published var currentPanel: Panel = .welcome
    @Published var currentUser: User?
    @Published var servers: [Server] = []
    @Published var selectedChannel: Channel?
    
    // Sheets
    @Published var isSettingsOpen = false
    @Published var isProfileOpen = false
    @Published var isMembersOpen = false
}
```

#### Android (ViewModel + StateFlow)
```kotlin
@HiltViewModel
class AppViewModel @Inject constructor() : ViewModel() {
    private val _currentPanel = MutableStateFlow<Panel>(Panel.Welcome)
    val currentPanel: StateFlow<Panel> = _currentPanel.asStateFlow()
    
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()
    
    // Sheets
    private val _isSettingsOpen = MutableStateFlow(false)
    val isSettingsOpen: StateFlow<Boolean> = _isSettingsOpen.asStateFlow()
    
    fun navigateTo(panel: Panel) {
        _currentPanel.value = panel
    }
    
    fun openSettings() {
        _isSettingsOpen.value = true
    }
    
    fun closeSettings() {
        _isSettingsOpen.value = false
    }
}
```

---

## PART 7: ACCESSIBILITY

### 7.1 Requirements

- **VoiceOver/TalkBack:** All interactive elements labeled
- **Dynamic Type:** Support iOS text sizing (UIContentSizeCategory)
- **Reduce Motion:** Respect system preference, disable springs
- **Color Contrast:** Minimum 4.5:1 for text
- **Touch Targets:** Minimum 44dp × 44dp

### 7.2 Implementation

#### iOS
```swift
.accessibilityLabel("Step inside button")
.accessibilityHint("Double tap to enter The Penthouse")
.accessibilityAddTraits(.isButton)
```

#### Android
```kotlin
.semantics {
    contentDescription = "Step inside button"
    role = Role.Button
}
```

### 7.3 Reduce Motion

```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion

// Use instant transitions when reduced motion is enabled
if reduceMotion {
    // No animation
} else {
    // Spring animation
}
```

```kotlin
val reduceMotion = LocalAccessibilityManager.current?.isTouchExplorationEnabled ?: false

if (reduceMotion) {
    // No animation
} else {
    // Spring animation
}
```

---

## PART 8: PERFORMANCE GUIDELINES

### 8.1 Rendering

- Use `CALayer`/`Compose Canvas` for custom drawings
- Cache blurred backgrounds (don't re-blur on every frame)
- Use `shouldRasterize` / `graphicsLayer { renderEffect }` for static glass
- Limit simultaneous animations to 5-7 elements

### 8.2 Memory

- Background image: Max 2K resolution, JPEG compression
- Avatars: 128dp max, WebP format
- Message cache: Keep last 100 messages in memory
- Image cache: LRU with 50MB limit

### 8.3 Battery

- Pause ambient animations when app backgrounded
- Reduce animation frame rate to 30fps on low power mode
- Use `CADisplayLink` / `Choreographer` for smooth 60fps

---

## PART 9: TESTING CHECKLIST

### 9.1 Visual
- [ ] Glass panels match exact blur/tint specs
- [ ] Accent colors are ONLY lavender→periwinkle
- [ ] Typography uses Ubuntu (or proper fallback)
- [ ] Corner radii match spec
- [ ] Shadows are static and correct

### 9.2 Motion
- [ ] All animations use spring physics
- [ ] Panel slides have overshoot
- [ ] Tap feedback is immediate (80ms)
- [ ] Stagger delays are 20-30ms
- [ ] Ambient loops are subtle (3s+)

### 9.3 Interaction
- [ ] Swipe-to-dismiss works on all panels
- [ ] Pull-to-refresh has correct threshold
- [ ] Long-press shows reaction tray
- [ ] Send button has ring expand effect

### 9.4 Accessibility
- [ ] VoiceOver/TalkBack labels all elements
- [ ] Dynamic Type scales correctly
- [ ] Reduce Motion disables springs
- [ ] Color contrast passes WCAG AA

---

## PART 10: FILE STRUCTURE

### iOS
```
ThePenthouse/
├── App/
│   ├── ThePenthouseApp.swift
│   └── AppState.swift
├── Features/
│   ├── Welcome/
│   │   ├── WelcomeView.swift
│   │   └── WelcomeViewModel.swift
│   ├── Lobby/
│   │   ├── LobbyView.swift
│   │   ├── ServerRail.swift
│   │   └── ChannelList.swift
│   ├── Chat/
│   │   ├── ChatView.swift
│   │   ├── MessageList.swift
│   │   ├── MessageBubble.swift
│   │   └── Composer.swift
│   ├── Members/
│   │   └── MemberSidebar.swift
│   ├── Settings/
│   │   └── SettingsSheet.swift
│   └── Profile/
│       └── ProfileDrawer.swift
├── Components/
│   ├── GlassPanel.swift
│   ├── GlassButton.swift
│   ├── GlassInput.swift
│   ├── ToggleSwitch.swift
│   └── Avatar.swift
├── DesignSystem/
│   ├── Colors.swift
│   ├── Typography.swift
│   ├── Spacing.swift
│   └── Animations.swift
├── Models/
│   ├── User.swift
│   ├── Channel.swift
│   ├── Message.swift
│   └── Server.swift
└── Resources/
    ├── Assets.xcassets/
    │   └── lounge-bg.imageset/
    └── Fonts/
        └── Ubuntu/
```

### Android
```
app/src/main/java/com/thepenthouse/
├── app/
│   ├── MainActivity.kt
│   ├── PenthouseApplication.kt
│   └── di/
│       └── AppModule.kt
├── presentation/
│   ├── welcome/
│   │   ├── WelcomeScreen.kt
│   │   └── WelcomeViewModel.kt
│   ├── lobby/
│   │   ├── LobbyScreen.kt
│   │   ├── ServerRail.kt
│   │   └── ChannelList.kt
│   ├── chat/
│   │   ├── ChatScreen.kt
│   │   ├── MessageList.kt
│   │   ├── MessageBubble.kt
│   │   └── Composer.kt
│   ├── members/
│   │   └── MemberSidebar.kt
│   ├── settings/
│   │   └── SettingsSheet.kt
│   └── profile/
│       └── ProfileDrawer.kt
├── components/
│   ├── GlassPanel.kt
│   ├── GlassButton.kt
│   ├── GlassInput.kt
│   ├── ToggleSwitch.kt
│   └── Avatar.kt
├── designsystem/
│   ├── Colors.kt
│   ├── Typography.kt
│   ├── Spacing.kt
│   └── Animations.kt
├── domain/
│   ├── model/
│   │   ├── User.kt
│   │   ├── Channel.kt
│   │   ├── Message.kt
│   │   └── Server.kt
│   └── repository/
└── data/
    └── repository/
res/
├── drawable/
│   └── lounge_bg.jpg
├── font/
│   └── ubuntu/
└── values/
    ├── colors.xml
    └── themes.xml
```

---

## APPENDIX: QUICK REFERENCE

### Color Quick Ref
| Use | Hex | RGBA |
|-----|-----|------|
| Background | #11111b | - |
| Surface | #1e1e2e | - |
| Text | #cdd6f4 | - |
| Lavender | #b4befe | - |
| Periwinkle | #8b9bf6 | - |
| Glass Base | - | rgba(18,18,28,0.55) |
| Glass Border | - | rgba(255,255,255,0.08) |

### Motion Quick Ref
| Animation | Duration | Spring |
|-----------|----------|--------|
| Micro | 120-180ms | Damping 0.85 |
| Standard | 280-360ms | Damping 0.75 |
| Panel | 420-520ms | Damping 0.7 |
| Stagger | +25ms/item | - |

### Spacing Quick Ref
| Token | Value |
|-------|-------|
| XS | 4dp |
| S | 8dp |
| M | 16dp |
| L | 24dp |
| XL | 32dp |

---

## FINAL NOTES FOR ARCHITECTS

1. **The background NEVER changes.** All screens are glass panels sliding over it.

2. **Glassmorphism is the identity.** Every panel must use the exact blur/tint formula. Test on real devices—simulators don't render blur correctly.

3. **Springs are non-negotiable.** Traditional easing curves will feel wrong. Use the exact spring parameters provided.

4. **One accent only.** Lavender → Periwinkle gradient. No other accent colors.

5. **Ubuntu everywhere.** Load all weights at startup. Fallback gracefully.

6. **Motion serves function.** Every animation guides the user. Nothing is decorative.

7. **Test on device.** Glassmorphism and springs behave differently on real hardware.

8. **Accessibility is required.** The app must work with VoiceOver/TalkBack and Reduce Motion.

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-04  
**Author:** The Penthouse Design System