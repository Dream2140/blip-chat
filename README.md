<div align="center">

# blip

**Real-time chat. Zero friction.**

A production-grade web messenger built with Next.js, Socket.IO, and PostgreSQL. 1:1 chats, groups, voice calls, rich text, and more.

[![Live Demo](https://img.shields.io/badge/demo-blip--chat--web.fly.dev-6D28D9?style=for-the-badge&logo=fly.io&logoColor=white)](https://blip-chat-web.fly.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js_16-000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/E2E_Tests-32_passing-22c55e?style=for-the-badge&logo=playwright&logoColor=white)](./e2e/smoke.spec.ts)
[![Security](https://img.shields.io/badge/Security-8.7%2F10-22c55e?style=for-the-badge&logo=shieldsdotio&logoColor=white)](#security)

</div>

---

<div align="center">

### Light Mode
<img src="docs/screenshots/chat-light.png" alt="blip chat - light mode" width="800" />

### Dark Mode
<img src="docs/screenshots/chat-dark.png" alt="blip chat - dark mode" width="800" />

### Mobile
<img src="docs/screenshots/mobile.png" alt="blip chat - mobile" width="300" />

</div>

---

## Features

### Messaging
- **1:1 and Group Chats** with real-time delivery via WebSocket
- **Rich Text** &mdash; `*bold*`, `_italic_`, `` `code` ``, ` ```code blocks``` `, clickable links
- **Reactions** &mdash; quick emoji reactions on any message
- **Reply & Forward** &mdash; quote replies + forward messages to any chat
- **Edit & Delete** &mdash; inline editing, soft delete with confirmation
- **Pin Messages** &mdash; pin important messages with banner + list
- **Star Messages** &mdash; bookmark messages for later
- **Message Search** &mdash; global search + search within conversation with navigation
- **Draft Persistence** &mdash; drafts survive conversation switches

### Voice Calls
- **P2P Audio Calls** via WebRTC (STUN only, zero infrastructure cost)
- **Call History** in chat &mdash; shows duration, missed calls, cancelled calls
- **Mute Toggle** during active calls

### Conversation Management
- **Mute / Archive / Pin / Delete** conversations
- **Unread Badges** with live real-time updates
- **Typing Indicators** with debounce + auto-clear

### Groups
- **Admin Panel** &mdash; add/remove members, role badges
- **Leave Group** &mdash; one-click exit
- **Who Read** &mdash; click read ticks to see who read your message

### Privacy & Safety
- **Block Users** &mdash; blocks messaging + conversation creation
- **Hide Read Receipts** &mdash; privacy toggle in settings
- **Hide Online Status** &mdash; appear offline to others

### Notifications
- **Desktop Notifications** via Notification API (click to open chat)
- **Do Not Disturb** &mdash; global toggle, silences all sounds + notifications
- **Muted Conversations** skip notifications entirely

### UX
- **Dark / Light Theme** with 5 accent colors (violet, pink, emerald, tangerine, sky)
- **3 Bubble Styles** &mdash; asymmetric, rounded, squared
- **Skeleton Loaders** &mdash; shimmer animations instead of spinners
- **Connection Banner** &mdash; red "connecting..." / green "connected"
- **Keyboard Shortcuts** &mdash; `Ctrl+K` search, `Esc` close modals
- **Mobile Swipe-to-Reply**
- **Last Seen / Online Status** in chat header
- **Smart Pagination** &mdash; 20 messages/conversations initially, load more on scroll

---

## Architecture

```
Browser
  |
  |--- HTTPS ---------> Next.js (akane-web)     --- Prisma ---> PostgreSQL
  |                      REST API + SSR                          (Fly Postgres)
  |
  |--- WSS -----------> Socket.IO (akane-ws)     --- Redis Adapter
                         Real-time events              |
                                                  Upstash Redis
                                                  (pub/sub + presence)
```

| Component | Tech | Purpose |
|-----------|------|---------|
| **Web** | Next.js 16 + React 19 | REST API, SSR, auth, all CRUD |
| **WS** | Node.js + Socket.IO | WebSocket server, typing, presence, call signaling |
| **DB** | PostgreSQL + Prisma 6 | Data persistence, 7 migrations |
| **Cache** | Upstash Redis | Pub/sub between services, socket adapter |
| **State** | Zustand v5 | 3 stores: auth, conversations, live |
| **Calls** | WebRTC + STUN | P2P audio, no media server needed |
| **CI** | GitHub Actions | TypeScript check + lint -> deploy on green |

### Monorepo Structure

```
chat-app/
  packages/
    shared/     # TypeScript types + socket events
    web/        # Next.js app (REST API + frontend)
    ws/         # Socket.IO server
  e2e/          # 32 Playwright E2E tests
  .github/      # CI/CD workflows
```

---

## Security

**Rated 8.7/10** after comprehensive audit.

| Area | Rating | Details |
|------|--------|---------|
| Authentication | 8/10 | bcrypt-12, JWT + httpOnly cookies, refresh rotation |
| SQL Injection | 9/10 | Prisma ORM, parameterized raw queries |
| XSS | 8/10 | React auto-escape, CSP headers |
| Rate Limiting | 9/10 | All 10 state-changing endpoints protected |
| Dependencies | 10/10 | 0 known vulnerabilities |
| Headers | 9/10 | CSP, HSTS, X-Frame-Options, nosniff |

See the [full audit](#) in the roadmap for details.

---

## Performance

Optimized for **Fly.io scale-to-zero** (min_machines=0):

- **20 messages** loaded initially (not 50), more on scroll
- **Cursor-based pagination** everywhere (conversations, users, pinned, starred)
- **Batch DB queries** &mdash; single raw SQL for unread counts + readers
- **Smart polling** &mdash; WebSocket primary, HTTP fallback with exponential backoff (30s -> 120s)
- **Sync on reconnect** &mdash; `GET /api/sync?since=` catches missed events in one call
- **Typing debounce** &mdash; 3s dedup, 6s auto-clear
- **Precomputed headers** &mdash; security headers built once at module load

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL + Redis)

### Local Development

```bash
# Clone
git clone https://github.com/Dream2140/blip-chat.git
cd blip-chat

# Install dependencies
npm install

# Start PostgreSQL + Redis
docker compose up -d

# Run migrations
cd packages/web && npx prisma migrate dev && cd ../..

# Start dev servers (web + ws)
npm run dev
```

### Environment Variables

**Web** (`packages/web/.env`):
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blip_chat
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

**WS** (`packages/ws/.env`):
```env
JWT_SECRET=your-secret-here  # same as web
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000
```

---

## Deployment

Deployed on **Fly.io** with scale-to-zero:

```bash
# Deploy web
flyctl deploy --config packages/web/fly.toml --dockerfile packages/web/Dockerfile

# Deploy ws
flyctl deploy --config packages/ws/fly.toml --dockerfile packages/ws/Dockerfile
```

| Service | URL | Machines |
|---------|-----|----------|
| Web | `blip-chat-web.fly.dev` | 2x shared-1x 512MB |
| WS | `blip-chat-ws.fly.dev` | 2x shared-1x 256MB |
| DB | Fly Postgres | 1x shared-1x 256MB |
| Redis | Upstash | Managed (pay-per-request) |

---

## Testing

```bash
# Run 32 E2E tests against production
npm run test:e2e:prod

# Run against local
npm run test:e2e
```

Tests cover: auth (10), sidebar (3), 1:1 chat (8), group chat (2), API validation (5), bug regressions (4).

---

## Tech Stack

<div align="center">

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Next.js 16, Zustand v5, CSS Variables |
| Backend | Next.js API Routes, Prisma 6, PostgreSQL |
| Real-time | Socket.IO 4, Redis pub/sub, WebRTC |
| Auth | JWT (httpOnly cookies), bcrypt, Zod validation |
| Infra | Fly.io, Upstash Redis, GitHub Actions |
| Testing | Playwright, 32 E2E tests |
| Design | Bricolage Grotesque, JetBrains Mono, custom design system |

</div>

---

## Roadmap

- [x] **v0.1** &mdash; MVP: auth, 1:1 chats, groups, real-time
- [x] **v0.2** &mdash; Reactions, emoji, profile, search, pinned messages, notifications
- [x] **v0.3** &mdash; Security hardening, stability, performance audit, group improvements
- [x] **v0.5** &mdash; Conversation management, rich text, privacy, drafts, stars, call history
- [ ] **v0.6** &mdash; Media messages (S3/R2): images, files, voice messages

See the full [ROADMAP.md](./ROADMAP.md) for details.

---

## License

MIT

---

<div align="center">

**Built with** Next.js + Socket.IO + PostgreSQL + WebRTC

</div>
