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

## Patch 0.3.2 — Feature Completions

Доделать незакрытые фичи из v0.2:

- [ ] **Jump to message from search** — по клику на search result скролить к конкретному сообщению
- [ ] **Browser Push Notifications** — Web Push API (service worker + VAPID keys)
- [ ] **Message forwarding** — переслать сообщение в другой чат
- [ ] **Unread count на sidebar** — live-обновление при новом сообщении (не ждать refetch)
- [ ] **Delivered status** — "доставлено" когда WS push дошёл до клиента (сейчас только sent/read)

## Patch 0.3.3 — UX Polish

- [ ] **Message timestamp on hover** — полная дата/время при наведении
- [ ] **Link preview** — OG meta для URL в сообщениях
- [ ] **Keyboard shortcuts** — Esc закрыть модалки, Ctrl+K поиск
- [ ] **Mobile swipe-to-reply** — свайп вправо для reply
- [ ] **Last seen** — "last seen 5 min ago" под именем в header
- [ ] **Online status в header** — зелёная точка + "online" текст для DM
- [ ] **Empty search state** — illustration + text когда ничего не найдено

## Patch 0.3.4 — Testing & CI

- [ ] **E2E: edit/delete message** — тесты на edit inline + delete confirmation
- [ ] **E2E: context menu** — правый клик → verify options
- [ ] **E2E: typing indicator** — два юзера, один печатает, второй видит
- [ ] **E2E: reconnect sync** — симуляция разрыва WS, verify catch-up
- [ ] **Unit tests для auth** — JWT sign/verify, refresh rotation, cookie handling
- [ ] **Unit tests для API** — conversations CRUD, messages CRUD, edge cases
- [ ] **Load test** — k6 или artillery: 100 concurrent users, measure p95 latency

## Patch 0.3.5 — Group Chat Improvements

- [ ] **Admin panel** — UI для управления группой (добавить/удалить участника, сменить название)
- [ ] **Leave group** — кнопка "покинуть группу" + API
- [ ] **Group avatar** — emoji или инициалы участников
- [ ] **Member roles indicator** — значок admin в списке участников
- [ ] **Who read message** — по клику на галочки показать кто прочитал (для групп)

---

## Отложено до v0.4 (требует S3/R2)

- [ ] Avatar upload
- [ ] Image messages + lightbox
- [ ] File sharing
- [ ] Voice messages (record + playback)
- [ ] Shared media gallery

---

## Порядок работы

| Приоритет | Патч | Описание | Effort |
|-----------|------|----------|--------|
| P0 | 0.3.0 | Security hardening | 1 день |
| P0 | 0.3.1 | Stability fixes | 0.5 дня |
| P1 | 0.3.4 | Testing & CI | 1 день |
| P1 | 0.3.2 | Feature completions | 1-2 дня |
| P2 | 0.3.3 | UX polish | 1 день |
| P2 | 0.3.5 | Group improvements | 1 день |

Security и stability — первые. Тесты — параллельно с фичами. UX polish и группы — последние.
