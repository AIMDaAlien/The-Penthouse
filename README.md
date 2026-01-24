# The Penthouse

A private, self-hosted social media app for close friends.

## Features

- **Real-time messaging** — WebSocket-powered instant chat
- **Group chats & DMs** — Create groups or message friends directly
- **Custom emotes** — Upload images as reusable stickers
- **GIF integration** — GIPHY and Klipy support
- **Privacy-first** — Self-hosted, no tracking, you own your data

## Quick Start

### Development

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start development server
npm run dev
```

Server runs at `http://localhost:3000`

### Production (Docker)

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get profile
- `PATCH /api/auth/me` — Update profile

### Chats
- `GET /api/chats` — List your chats
- `POST /api/chats/group` — Create group
- `POST /api/chats/dm` — Start DM
- `GET /api/chats/:id` — Get chat details

### Messages
- `GET /api/messages/:chatId` — Get messages
- `POST /api/messages/:chatId` — Send message
- `DELETE /api/messages/:id` — Delete message

### Media
- `POST /api/media/avatar` — Upload avatar
- `GET /api/media/emotes` — List emotes
- `POST /api/media/emotes` — Upload emote

## Tech Stack

- **Backend**: Node.js, Express, Socket.io
- **Database**: SQLite (via better-sqlite3)
- **Auth**: JWT + bcrypt
- **Deployment**: Docker

## License

MIT
