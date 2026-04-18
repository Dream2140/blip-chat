# blip v0.2 Roadmap

## Контекст

v0.1 — MVP задеплоен. Работает: auth, 1:1 чаты, группы, сообщения, базовый real-time, blip UI, dark/light theme. Но до реального продукта далеко — много UX дыр, нет обработки ошибок, нет половины состояний из дизайна.

**Цель v0.2**: превратить демо в приложение, которым реально можно пользоваться каждый день.

---

## Patch 0.1.1 — Critical Fixes (день 1)

> Без этого приложение ломается при базовом использовании.

- [ ] **P0: Подключить Redis** — real-time не работает без него. Создать Upstash, прокинуть REDIS_URL в оба сервиса
- [ ] **P0: Fix Next.js 16 middleware → proxy** — `middleware.ts` deprecated в Next 16, нужно мигрировать на `proxy.ts`
- [ ] **P0: Token refresh на клиенте** — сейчас после 15 мин access token истекает и всё ломается. Добавить interceptor: если 401 с `TOKEN_EXPIRED` → вызвать `/api/auth/refresh` → повторить запрос
- [ ] **P0: Обновление списка чатов при новом сообщении** — сейчас sidebar не обновляется real-time (lastMessage, updatedAt, сортировка)
- [ ] **P1: Prisma connection pooling** — добавить `?connection_limit=5` в DATABASE_URL для Fly.io (ограниченные connections)

## Patch 0.1.2 — UX Holes (дни 2-3)

> Пользователь натыкается на тупики и сломанные состояния.

- [ ] **Error toasts** — глобальный toast для ошибок API (сейчас ошибки молча глотаются)
- [ ] **Loading states** — skeleton loader при загрузке чатов и сообщений (дизайн есть в states.html — Scene_Loading)
- [ ] **Optimistic UI fix** — при отправке сообщения temp-message заменять на реальный (сейчас дублируется — temp остаётся + приходит через socket)
- [ ] **Infinite scroll вверх** — загрузка старых сообщений при прокрутке (cursor pagination уже есть в API, нет на фронте)
- [ ] **Scroll-to-bottom кнопка** — когда пришло новое сообщение, а пользователь прокрутил вверх
- [ ] **Connection status indicator** — показывать "reconnecting..." / "offline" (дизайн есть — Scene_Offline)

---

## v0.2.0 — Feature Patches

### Patch 0.2.0 — Reactions & Message Actions (неделя 1)

Из дизайна: hover actions на bubble, reaction chips, context menu.

- [ ] **Reaction API** — `POST /api/messages/:id/reactions` (toggle emoji reaction)
- [ ] **Reaction model** — новая таблица или JSON-поле на Message
- [ ] **Hover actions UI** — уже есть в CSS, подключить: ❤️ 😂 🔥 + reply
- [ ] **Reaction chips под bubble** — отображение и toggle (дизайн есть)
- [ ] **Reply-to UI** — reply preview в composer, reply quote в bubble (CSS готов, нужна логика)
- [ ] **Edit message** — inline editing из context menu + PATCH API (уже есть)
- [ ] **Delete message** — confirmation modal + DELETE API (уже есть). Дизайн: Scene_DeleteConfirm
- [ ] **Context menu** — long press / right click: reply, forward, pin, copy, delete (дизайн: Scene_ContextMenu)

### Patch 0.2.1 — Emoji Picker & Rich Composer (неделя 1-2)

- [ ] **Emoji picker popup** — дизайн есть (Scene_EmojiPicker), категории: recent, smileys, animals, food, objects
- [ ] **Composer attachment buttons** — wire up 📎 и 🖼 кнопки (UI-заглушки сейчас)
- [ ] **Multi-line textarea** — auto-resize textarea по контенту
- [ ] **Typing debounce improvement** — не отправлять typing:stop если пользователь продолжает печатать

### Patch 0.2.2 — Profile & Settings (неделя 2)

Из дизайна: Scene_Profile, Scene_Settings.

- [ ] **Profile page** — `/profile/:userId` — аватар, bio, nickname, "friends since"
- [ ] **Edit own profile** — change nickname, bio, avatar URL
- [ ] **Settings page** — `/settings`:
  - Account: profile, privacy
  - Appearance: dark mode toggle, accent color (5 вариантов из дизайна), bubble style (asymmetric/rounded/squared), density (compact/cozy/comfortable)
  - Notifications: sounds, preview
- [ ] **Per-chat settings** — mute notifications, chat theme, clear history
- [ ] **Avatar upload** — интеграция с S3/Cloudflare R2 для хранения аватаров (сейчас только URL)

### Patch 0.2.3 — Search (неделя 2-3)

Из дизайна: Scene_Search, Scene_SearchEmpty.

- [ ] **Global search** — поиск по сообщениям + людям одновременно
- [ ] **Search API** — `GET /api/search?q=` — full-text search по messages + users
- [ ] **Search results UI** — "in messages · N" + "people · N" секции, highlighted matches
- [ ] **Jump to message** — клик по результату → открыть чат и прокрутить до сообщения
- [ ] **No results state** — дизайн есть (Scene_SearchEmpty)

### Patch 0.2.4 — Notifications (неделя 3)

Из дизайна: Scene_Notifs.

- [ ] **Browser Push Notifications** — Web Push API, запрос разрешения
- [ ] **In-app notification panel** — slide-out panel с историей (новое сообщение, реакция, typing, звонок, pin)
- [ ] **Unread badge в title** — `(3) blip` в title вкладки
- [ ] **Sound on new message** — короткий звук при получении сообщения (настройка в settings)
- [ ] **Notification grouping** — "Maya sent 3 messages" вместо 3 отдельных

### Patch 0.2.5 — Pinned Messages (неделя 3)

Из дизайна: pinned banner, Scene_PinnedList.

- [ ] **Pin message API** — `POST /api/messages/:id/pin`
- [ ] **PinnedMessage model** — или boolean на Message
- [ ] **Pinned banner в chat header** — жёлтый баннер как в дизайне
- [ ] **Pinned messages list** — отдельный view `/c/:id/pinned`
- [ ] **Unpin** — только admin в группе или оба в direct

### Patch 0.2.6 — Media Messages (неделя 4)

Из дизайна: msg-image, Scene_Upload, Scene_Lightbox, Scene_Gallery.

- [ ] **File upload** — drag & drop + кнопка, upload в S3/R2
- [ ] **Image messages** — отображение inline с preview
- [ ] **Upload preview** — before sending: thumbnails + caption input (Scene_Upload)
- [ ] **Image lightbox** — fullscreen view с save/forward/react (Scene_Lightbox)
- [ ] **Shared media gallery** — `/c/:id/media` — grid всех фото/файлов (Scene_Gallery)
- [ ] **File messages** — PDF, documents с иконкой и именем
- [ ] **Message type field** — `type: "text" | "image" | "file" | "voice"` на Message model

### Patch 0.2.7 — Voice Messages (неделя 4-5)

Из дизайна: Scene_VoiceRec.

- [ ] **Voice recording** — MediaRecorder API, waveform визуализация
- [ ] **Voice message player** — inline player с waveform + duration
- [ ] **Slide to cancel** — UI gesture как в дизайне
- [ ] **Upload voice to S3/R2** — сохранение как audio file

---

## Non-functional для v0.2

### Performance
- [ ] **Virtualized message list** — `@tanstack/virtual` для чатов с 1000+ сообщениями
- [ ] **Conversation list virtualization** — для 100+ чатов
- [ ] **Image lazy loading** — intersection observer для media
- [ ] **Service Worker** — кеширование статики, offline shell

### Testing
- [ ] **API route tests** — Jest/Vitest для всех endpoints
- [ ] **Component tests** — React Testing Library для ключевых компонентов
- [ ] **E2E tests** — Playwright: register → create chat → send message → receive
- [ ] **CI pipeline** — GitHub Actions: lint + typecheck + test на каждый PR

### Security
- [ ] **Rate limiting** — на auth endpoints (brute force protection)
- [ ] **Input sanitization** — XSS protection на message text (сейчас рендерим raw text, но стоит добавить)
- [ ] **CSRF double-submit** — дополнительная защита помимо SameSite
- [ ] **Expired refresh token cleanup** — cron job для удаления старых токенов

### Infrastructure
- [ ] **Custom domain** — `blip.chat` или подобный
- [ ] **CDN для статики** — Cloudflare перед Fly.io
- [ ] **Database backups** — automated daily backups в Fly Postgres
- [ ] **Monitoring** — Sentry для error tracking, Fly metrics для uptime
- [ ] **Logging** — structured JSON logs, aggregation

---

## Порядок работы (рекомендация)

```
Week 1:  0.1.1 (critical) → 0.1.2 (UX) → 0.2.0 (reactions)
Week 2:  0.2.1 (emoji) → 0.2.2 (profile/settings) → 0.2.3 (search)
Week 3:  0.2.4 (notifications) → 0.2.5 (pins) → testing
Week 4:  0.2.6 (media) → 0.2.7 (voice) → polish → v0.2.0 release
```

Каждый патч — отдельная ветка + PR + деплой на preview → merge в main → production.
