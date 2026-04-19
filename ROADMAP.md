# blip v0.2 Roadmap

## Контекст

v0.1 — MVP задеплоен. v0.2 — превращаем в реальный продукт.

---

## Patch 0.1.1 — Critical Fixes ✅

- [x] **Подключить Redis** — Upstash Redis создан, REDIS_URL в обоих сервисах
- [x] **Token refresh на клиенте** — apiFetch wrapper с auto-refresh
- [x] **Обновление sidebar** — polling + WebSocket real-time
- [x] **Prisma connection pooling** — connection_limit=5
- [ ] **Fix Next.js 16 middleware → proxy** — deprecated warning, не ломает

## Patch 0.1.2 — UX Holes ✅

- [x] **Error toasts** — глобальный toast для ошибок API
- [x] **Optimistic UI fix** — temp-message заменяется реальным
- [x] **Infinite scroll вверх** — загрузка старых сообщений
- [x] **Scroll-to-bottom кнопка** — центрирована, alignSelf:center
- [x] **Loading states** — shimmer skeleton loaders (messages + sidebar)
- [x] **Connection status indicator** — red "connecting..." / green "connected" banner

---

## v0.2.0 — Feature Patches

### Patch 0.2.0 — Reactions & Message Actions ✅

- [x] **Reaction API** — POST /api/messages/:id/reactions (toggle)
- [x] **Reaction model** — Prisma Reaction с unique [messageId, userId, emoji]
- [x] **Hover actions UI** — ❤️ 😂 🔥 📌 + reply
- [x] **Reaction chips** — под bubble, toggle on click
- [x] **Reply-to UI** — preview в composer, quote в bubble
- [x] **Reply-to API** — POST возвращает replyTo object (was bug, fixed)
- [x] **Edit message UI** — inline editing with save/cancel, "(edited)" label
- [x] **Delete message UI** — inline confirmation + toast feedback
- [x] **Context menu** — right-click menu (edit/delete/reply/pin)

### Patch 0.2.1 — Emoji Picker & Rich Composer ✅

- [x] **Emoji picker popup** — 5 категорий, 8-column grid
- [x] **Multi-line textarea** — auto-resize до 120px
- [x] **Emoji toggle** — 😊 кнопка в composer
- [x] **Typing debounce** — 3s dedup, 5s auto-stop, cleanup on unmount

### Patch 0.2.2 — Profile & Settings ✅

- [x] **Settings page** — /settings с dark mode, accent colors, bubble style
- [x] **Edit own profile** — nickname, bio через PATCH /api/users/me
- [x] **Theme persistence** — localStorage + apply on load
- [x] **Accent colors** — 5 вариантов (violet, pink, emerald, tangerine, sky)
- [x] **Bubble style** — asymmetric/rounded/squared
- [x] **Notification toggles** — sounds, preview
- [ ] **Avatar upload** — S3/R2 integration (TODO)

### Patch 0.2.3 — Search ✅

- [x] **Global search** — GET /api/search?q= (users + messages)
- [x] **Search UI** — debounced, highlighted matches, in messages + people sections
- [x] **Jump to conversation** — click result → navigate
- [x] **No results state**
- [ ] **Jump to message** — scroll to specific message in chat

### Patch 0.2.4 — Notifications ✅

- [x] **Unread badge в title** — (N) blip
- [x] **Sound on new message** — Web Audio API sine wave
- [x] **Sound respect settings** — localStorage "blip-sounds"
- [ ] **Browser Push Notifications** — Web Push API (TODO)
- [ ] **In-app notification panel** — (TODO)

### Patch 0.2.5 — Pinned Messages ✅

- [x] **Pin message API** — POST /api/messages/:id/pin (toggle)
- [x] **pinnedAt/pinnedById fields** — migration applied
- [x] **Pinned banner** — yellow banner with count, clickable
- [x] **Pinned messages list** — inline dropdown on banner click
- [x] **Pin button** — 📌 in hover actions with toast feedback
- [x] **Pinned list API** — GET /api/conversations/:id/pinned

### Patch 0.2.6 — Media Messages (pending)

- [ ] File upload (needs S3/R2)
- [ ] Image messages
- [ ] Image lightbox
- [ ] Shared media gallery

### Patch 0.2.7 — Voice Messages (pending)

- [ ] Voice recording
- [ ] Voice player
- [ ] Upload to S3/R2

---

## Performance Audit ✅

- [x] **N+1 → batch** — conversations unread count uses single groupBy
- [x] **DB indexes** — composite index [conversationId, senderId, deletedAt]
- [x] **Smart polling** — zero polling when WebSocket connected, 30s fallback
- [x] **Socket reconnect** — backoff 2s→15s, max 5 attempts
- [x] **Message dedup** — skip own messages from socket, dedup by ID
- [x] **Redis error logging** — console.error instead of swallow
- [x] **Pinned limit** — take:50
- [x] **Pinned count cache** — 60s TTL
- [x] **People tab cache** — fetch once per session
- [x] **Visibility API** — stop polling when tab hidden
- [x] **Slim payload** — conversations API returns minimal participant data
- [x] **socketConnected in store** — single source of truth for polling control

## Bug Fixes ✅

- [x] **React #185** — stable empty ref for Zustand selector (was `|| []`)
- [x] **Reply-to null** — POST /messages now includes replyTo object
- [x] **Pinned banner not clickable** — added onClick + inline pinned list
- [x] **New messages button float** — alignSelf:center
- [x] **Mobile viewport** — added meta viewport tag
- [x] **Double messages** — skip own messages from WebSocket
- [x] **Profile update bio:null** — Zod schema accepts nullable

## Architecture Improvements ✅

- [x] **Conversation aggregates** — lastMessageId/At/Preview/SenderId on Conversation, maintained on message send
- [x] **Read cursor** — lastReadMessageId/lastReadAt on ConversationParticipant, replaces per-message receipt counting
- [x] **Sync after reconnect** — GET /api/sync?since=timestamp, called on WS reconnect to catch missed events
- [x] **Store split** — chat-store split into auth-store, conversation-store, live-store
- [x] **CI gates** — GitHub Actions: typecheck + lint before deploy, deploy triggers only after CI passes
- [x] **Error visibility** — all silent .catch(() => {}) replaced with console.error or toast

## E2E Tests — 27 passing

Auth (10), Sidebar (3), 1:1 Chat (6), Group Chat (2), API Validation (4), Bug Fixes (2)

---

# blip v0.3 Roadmap — Stability & Security

## Контекст

v0.2 — фичи есть, но проект не hardened. v0.3 — стабильность, безопасность, расширение текущего функционала. Медиа (S3/R2) откладываем до v0.4.

---

## Patch 0.3.0 — Security Hardening ✅

- [x] **JWT secrets validation** — throw в production если не заданы
- [x] **Authorization на pin/reactions** — проверка participant перед pin/react
- [x] **Rate limiting** — in-memory limiter: auth 5-10/min, messages 30/min, search 15/min
- [x] **Account enumeration fix** — generic error на register
- [x] **Input sanitization** — NaN guard, max 4000 chars, max 50 participants
- [x] **CSP + security headers** — CSP, X-Frame-Options, nosniff, Referrer-Policy
- [x] **Secure cookie flags** — verified: httpOnly, secure, sameSite=strict

## Patch 0.3.1 — Stability Fixes ✅

- [x] **Fix ws without Redis** — registerSocketHandlers() вызывается всегда, redis parameter nullable
- [x] **Read cursor race condition** — single-query JOIN вместо fetch-then-update
- [x] **Clean `as never` casts** — sender теперь имеет id/nickname/avatarUrl
- [x] **Global socket cleanup** — beforeunload disconnect, одноразовый listener
- [x] **WebRTC SDP validation** — проверка type/sdp перед RTCSessionDescription
- [x] **Unhandled promise rejections** — все 12 socket handlers обёрнуты в try/catch

## Patch 0.3.2 — Feature Completions ✅

- [x] **Jump to message from search** — ?msg= URL param, ?around= API, scroll + highlight animation
- [ ] **Browser Push Notifications** — Web Push API (deferred — needs service worker + VAPID)
- [x] **Message forwarding** — context menu → ForwardModal → send to any conversation
- [x] **Unread count на sidebar** — incrementUnread/clearUnread, instant badge update + title
- [x] **Delivered status** — MESSAGE_DELIVERED ACK flow, double-tick display

## Patch 0.3.3 — UX Polish ✅

- [x] **Message timestamp on hover** — native tooltip с полной датой/временем
- [ ] **Link preview** — OG meta для URL (deferred — нужен серверный fetch + кэш)
- [x] **Keyboard shortcuts** — Esc закрыть модалки/emoji/reply, Ctrl+K поиск
- [x] **Mobile swipe-to-reply** — свайп вправо с visual feedback
- [x] **Last seen** — "last seen Xm ago" в DM header
- [x] **Online status в header** — зелёная точка + "online" для DM
- [ ] **Empty search state** — (minor, skipped)

## Patch 0.3.4 — Testing & CI ✅

- [x] **E2E: edit/delete message** — API edit + verify updated text, API delete + verify "message deleted"
- [x] **E2E: rate limiting** — 12 rapid logins → verify 429
- [x] **E2E: security headers** — X-Frame-Options, nosniff, CSP present
- [x] **E2E: forwarded message** — forward message appears in target conversation
- [x] **Fix existing tests** — registration error message updated
- [ ] **E2E: typing indicator** — deferred (needs 2 concurrent browser contexts)
- [ ] **E2E: reconnect sync** — deferred (needs WS manipulation)
- [ ] **Unit tests** — deferred (needs test framework setup)
- [ ] **Load test** — deferred (needs k6/artillery setup)
- Total: **32 E2E tests**

## Patch 0.3.5 — Group Chat Improvements ✅

- [x] **Admin panel** — GroupAdminPanel: member list, add/remove members (admin only)
- [x] **Leave group** — "Leave group" button, removes from store, navigates to /
- [x] **Group avatar** — 2 initials from group name (isGroup prop on UserAvatar)
- [x] **Member roles indicator** — admin badge CSS next to admin users
- [x] **Who read message** — GET /api/messages/[id]/readers + clickable ticks popup

---

---

# blip v0.5 Roadmap — Chat Experience

## Контекст

v0.3 — стабильный, безопасный, оптимизированный фундамент. v0.5 — превращаем в настоящий мессенджер с фичами, которых ожидает юзер. Медиа (S3/R2) откладываем до v0.6.

---

## Patch 0.5.0 — Conversation Management ✅

- [x] **Mute/unmute** — PATCH /api/conversations/[id]/manage, 3-dot menu on sidebar items
- [x] **Archive/unarchive** — archived toggle в sidebar, filtered by default
- [x] **Pin/unpin** — pinned sort first, pin icon in sidebar
- [x] **Delete conversation** — soft delete, filtered from API
- [x] **Sidebar UI** — context dropdown, muted/pin icons, archived section

## Patch 0.5.1 — Rich Text & Links ✅

- [x] **Link detection** — clickable URLs with target="_blank" rel="noopener"
- [x] **Code blocks** — ```multiline``` with JetBrains Mono, dark bg
- [x] **Inline code** — `code` with mono font
- [x] **Bold/Italic** — *bold* and _italic_ markdown parsing
- [ ] **Message text selection** — deferred (touch handlers may interfere)

## Patch 0.5.2 — Privacy & Safety ✅

- [x] **Block user** — POST/DELETE /api/users/[id]/block, enforcement on DM creation + messaging
- [x] **Block UI** — block/unblock button in DetailsPanel
- [x] **Read receipts toggle** — hideReadReceipts in settings, cursor skip when enabled
- [x] **Online status toggle** — hideOnlineStatus in settings + validator
- [ ] **WS online hide** — deferred (needs socket token flag passthrough)

## Patch 0.5.3 — Smart Notifications ✅

- [x] **Desktop notifications** — Notification API, click → open conversation
- [x] **Do Not Disturb** — DND toggle in sidebar, respects sound + notifications
- [x] **Mute respect** — muted conversations skip sound + notification
- [x] **Permission request** — auto-request on first app load
- [ ] **Per-conversation notification settings** — deferred
- [ ] **Notification sound variants** — deferred

## Patch 0.5.4 — Draft & Compose ✅

- [x] **Draft persistence** — debounced save to store, restored on switch, cleared on send
- [x] **Draft preview** — "Draft: ..." in pink in ConversationItem
- [ ] **Mention users** — @nickname autocomplete (deferred)
- [ ] **Paste image preview** — deferred (needs S3/R2)

## Patch 0.5.5 — Starred Messages ✅

- [x] **Star toggle** — POST /api/messages/[id]/star, context menu button
- [x] **Starred list API** — GET /api/starred with cursor pagination
- [ ] **Starred messages page** — /starred UI (deferred)

## Patch 0.5.6 — Search Improvements ✅

- [x] **Search within conversation** — ?search= API param, inline search bar, ▲▼ navigation + highlight
- [ ] **Search filters** — from:, before:, after: (deferred)
- [ ] **Recent searches** — deferred

## Call History ✅

- [x] **Call events as system messages** — __CALL:{} format saved to conversation
- [x] **Completed calls** — "Voice call · M:SS" with duration
- [x] **Missed calls** — "Missed call" display
- [x] **Cancelled calls** — "Call cancelled" display
- [x] **Dedup** — only initiator saves message (callIsInitiator flag)
- [x] **Styled bubbles** — centered pill design with icons

---

## Отложено до v0.6 (требует S3/R2)

- [ ] Avatar upload
- [ ] Image messages + lightbox
- [ ] File sharing + drag-and-drop
- [ ] Voice messages (record + playback)
- [ ] Shared media gallery
- [ ] Video messages

---

## Порядок работы v0.5

| Приоритет | Патч | Описание | Effort |
|-----------|------|----------|--------|
| P0 | 0.5.0 | Conversation management (mute/archive/pin) | 1 день |
| P0 | 0.5.1 | Rich text & links | 0.5 дня |
| P1 | 0.5.2 | Privacy & safety (block/read toggle) | 1 день |
| P1 | 0.5.4 | Draft & compose (drafts, mentions) | 1 день |
| P2 | 0.5.3 | Smart notifications (desktop, DND) | 0.5 дня |
| P2 | 0.5.5 | Starred messages | 0.5 дня |
| P2 | 0.5.6 | Search improvements | 0.5 дня |

Conversation management и rich text — первые (базовый UX). Privacy и compose — следующие. Notifications, stars, search — polish.
