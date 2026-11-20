---
title: "Native API Server"
type: feature
status: in-progress
created: 2026-11-13
updated: 2026-11-13
tags: [katsodi/feature, katsodi/desktop, katsodi/native, katsodi/api]
---
# Отдельный сервер API для приложения

> Русский · [[docs/en/Features/Native API Server|English]]

## Зачем нужна
Чтобы [[docs/Features/Native Desktop Client]] работал без запуска веб-проекта. Раньше приложению был нужен `npm run dev` (весь Next.js с сайтом); теперь те же маршруты `/api/native/v1` поднимаются отдельным небольшим процессом Node.

## Пользователи и роли
Разработчик запускает его локально для приложения. Права пользователей не меняются: те же bearer-токены Supabase, RLS и роли, что и у маршрутов на сайте.

## Пользовательские сценарии
- `npm run native:api` — собрать и запустить сервер на `http://127.0.0.1:8787`, затем `npm run native:run` — приложение подключается к нему по умолчанию.
- `GET /healthz` — проверить, что сервер жив.

## Правила поведения
- Обработчики не копируются: `native-api/build.mjs` находит каждый `src/app/api/native/v1/**/route.ts` и собирает их esbuild вместе с `native-api/server.ts`. Сайт и отдельный сервер всегда отдают одни и те же маршруты.
- Модули, нужные только Next.js, заменены заглушками: `next/headers` (пустые cookie — гость), `next/cache` (кэша страниц нет), `next/navigation` (перенаправление — ошибка, нативные маршруты его не вызывают), `server-only`.
- URL запроса строится от настроенного origin, а не от заголовка Host. Повторяющиеся заголовки склеиваются, поэтому два `Authorization` дают один неправильный заголовок и отказ 401.
- Тело запроса не больше 1 МиБ (обработчики ограничивают сильнее); неизвестный путь — 404, неподдерживаемый метод — 405, всё в формате ошибок нативного API.
- В журнал пишутся только метод, путь, статус и время — без заголовков и тел.

## Интерфейс и состояния
Интерфейса нет. При запуске печатается адрес и число маршрутов; без настроек Supabase — предупреждение.

## Техническая реализация
- `native-api/server.ts`: `node:http`, сопоставление путей (статический сегмент важнее параметра), преобразование в Web `Request`/`Response`, тайм-ауты заголовков 15 с и запроса 30 с, остановка по SIGINT/SIGTERM.
- Переменные: `KATSODI_API_HOST` (по умолчанию `127.0.0.1`), `KATSODI_API_PORT` (`8787`), `KATSODI_API_PUBLIC_ORIGIN`, `KATSODI_API_QUIET=1`. Ключи Supabase и LiveKit берутся из `.env.local` (`node --env-file-if-exists`).
- Сборка: `npm run native:api:build` → `native-api/dist/server.mjs` (не коммитится, игнорируется линтером); пакеты остаются в `node_modules`.
- Показ ссылки: `rooms/{id}/demo` (POST, DELETE), `demo/decision`, `demo/pause`, `demo/beat`, `demo/token`, `demo/annotations` — через общие действия сайта и `demoAccess`/`demoGrant`.
- `GET player` — страница плеера провайдера для помощника приложения (см. [[docs/Features/Native Desktop Client]]).
- Новые маршруты 2026-11-13, общие для сайта и сервера: `POST rooms/{id}/playback` (`updatePlayback`), `DELETE rooms/{id}/queue/{item}` (`removeFromQueue`), `POST rooms/{id}/queue/{item}/play` (`playFromQueue`).

- Друзья и профили: `GET friends`, `POST friends/requests`, `POST|DELETE friends/requests/{id}`, `POST people/{user}`, `GET profiles/{username}`.
- Музыка: `GET music` (гостям тоже), `POST music/listen` (`{ url, title?, room? }` → `{ roomId }`, общая операция `openMusicRoom`).
- Приглашения и модерация: `POST rooms/{id}/invites` (владелец; `{ invite: { id, token, link } }`, `link` — только при заданном `NEXT_PUBLIC_APP_URL`), `DELETE rooms/{id}/invites/{invite}`, `POST invites/redeem` (`{ token }` → `{ roomId }`, общая операция `redeemInviteToken`), `POST rooms/{id}/members/{user}` (`{ operation }`: kick, promote, demote, leave, close; действие сайта `moderateRoom`).

## Данные и доступы
Сервер ничего не хранит. Читает `.env.local` при запуске; ключ service-role не нужен и не используется нативными маршрутами.

## Безопасность и приватность
По умолчанию слушает только loopback. CORS-заголовков нет. Токены не логируются. Публикация наружу (другой хост, TLS, обратный прокси) — отдельное решение владельца, не сделано.

## Критерии приёмки
Проверено 2026-11-13 на Windows 11, Node 26, без запущенного Next.js:
- `curl` к `127.0.0.1:8787`: `/healthz` и `/meta` отвечают, `/rooms` отдаёт настоящие комнаты из Supabase; `/me` без токена, неправильный токен и два токена — 401; неизвестный путь — 404; `DELETE /meta` — 405; `Cache-Control: private, no-store`, CORS-заголовков нет.
- `tests/unit/native-api-server.test.ts`: 3 теста (сопоставление путей и декодирование параметров, origin вместо Host, склейка повторных заголовков, 404/405/413).
- `tests/unit/native-api.test.ts`: 16 тестов, включая новые маршруты воспроизведения и очереди.
- `tests/unit/native-friends-api.test.ts`, `native-music-api.test.ts`, `native-invites-api.test.ts` (7 тестов: ссылка-приглашение с адресом сайта и без него, вход обязателен, отзыв, только известные операции модерации, принятие кода).

Не проверено: новые маршруты с настоящим аккаунтом (нужен вход владельца), работа за обратным прокси.

## Ограничения и следующие шаги
Этот отдельный сервер — для локальной разработки. В production те же маршруты отдаёт сам сайт: `https://katsodi.watch/api/native/v1` работает с 2026-11-20 (Vercel, из katsodi-web); `/meta`, `/rooms`, `/music` и `/player` отвечают, `/me` без входа — 401.

## Связанные заметки
- [[docs/Home]]
- [[docs/Features/Native Desktop Client]]
- [[docs/Features/Server Authorization]]
