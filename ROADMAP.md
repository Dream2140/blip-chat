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
