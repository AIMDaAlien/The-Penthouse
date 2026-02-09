# The Penthouse 🏠

A private, self-hosted social media app for close friends.

## ✨ Features

- **Real-time messaging** — WebSocket-powered instant chat
- **Group chats & DMs** — Create groups or message friends directly
- **Friend system** — Send requests, accept/decline, block users
- **Servers & channels** — Discord-style community spaces
- **Voice messages** — Record and send audio
- **GIF & emoji pickers** — GIPHY and Klipy integration
- **File sharing** — Images, videos, and documents
- **Push notifications** — Stay updated on new messages
- **Password recovery** — Email-based account recovery
- **Privacy-first** — Self-hosted, you own your data

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Server Setup

```bash
cd server
cp .env.example .env
# Edit .env with your settings
npm install
npm run dev
```

Server runs at `http://localhost:3000`

### Mobile App Setup

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) or press `w` for web.

---

## ⚙️ Environment Variables

### Server (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | development / production | No |
| `JWT_SECRET` | Secret for signing tokens | **Yes** |
| `GIPHY_API_KEY` | For GIF picker | No |
| `KLIPY_API_KEY` | For Klipy stickers | No |
| `DOMAIN` | Your domain for production | No |

> ⚠️ **Generate a secure JWT_SECRET:** `openssl rand -base64 32`

---

## 🐳 Docker Deployment

```bash
docker-compose up -d
```

View logs: `docker-compose logs -f`

---

## 📱 API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Login |
| `POST /api/auth/forgot-password` | Password recovery |
| `GET /api/friends` | List friends |
| `POST /api/friends/request` | Send friend request |
| `GET /api/chats` | List chats |
| `POST /api/messages/:chatId` | Send message |
| `GET /api/servers` | List servers |

Full API documentation available in `/server/src/routes/`.

---

## 🧪 Testing

```bash
cd server
npm test
```

All 13 integration tests covering auth, friends, and messages.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, Socket.io |
| Database | SQLite (sql.js) |
| Auth | JWT + bcrypt (12 rounds) |
| Mobile | React Native, Expo |
| Styling | NativeWind (Tailwind) |

---

## 📄 License

MIT
