---
title: "Подключение голосового сервера"
type: setup
status: awaiting-infrastructure
created: 2026-11-03
updated: 2026-11-03
tags: [katsodi/backend, katsodi/voice]
---
# Подключение голосового сервера

> Русский · [[docs/en/Voice Setup|English]]

Реализация — [[docs/Features/Voice Chat]], основа БД — [[docs/Backend Setup]]. Облачные настройки в этом этапе не выполнялись.

## Подготовка
Без LiveKit уже можно открыть голосовую гостиную и выполнить [[docs/Features/Microphone Check]]: тест локальный и не требует серверных ключей.

1. Владелец создаёт проект [LiveKit Cloud](https://cloud.livekit.io/), проверяет актуальные лимиты/стоимость. Не включать автоматическую запись/egress.
2. Применить supabase/migrations/20261103000600_voice.sql поверх foundation-схемы, сначала на staging. Media/player/fandom-миграции независимы.
3. В серверном .env.local/секретах хостинга заполнить LIVEKIT_URL=wss://PROJECT.livekit.cloud, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, SUPABASE_SERVICE_ROLE_KEY и случайный длинный VOICE_WORKER_SECRET. Не присылать их в чат, не хранить в Git и не объявлять NEXT_PUBLIC. Публичные Supabase URL/publishable key остаются прежними.
4. После настройки поставить VOICE_ENABLED=true и перезапустить сервер. Без полного конфига, миграции и heartbeat UI остаётся недоступным.

## Планировщик
Каждые 30 секунд выполнять POST https://YOUR-KATSODI/api/internal/voice-worker с Authorization: Bearer VOICE_WORKER_SECRET. Секрет подставляет менеджер секретов scheduler, он не попадает в URL/логи. Запуски последовательные, concurrency=1; после 503 повторять. Тот же планировщик вызывает `POST /api/internal/rooms-lifecycle` (неактивность и удаление комнат, [[docs/Features/Room Lifecycle]]) с `ROOMS_LIFECYCLE_SECRET`, а если его нет — с `VOICE_WORKER_SECRET`. Локально запусти `npm run voice:worker` во втором терминале рядом с `npm run dev` (`scripts/voice-worker.mjs`: берёт секрет из `.env.local`, обращается только к `127.0.0.1`/`localhost`, печатает коды ответа, но не секрет; `-- --once` — один запуск). На production нужен постоянно действующий доверенный scheduler. UI-кнопка для этого отсутствует.

Worker публикует heartbeat после drain очереди и успешного SFU listRooms. Первая успешная обработка включает readiness; клиент проверяет её раз в 10 секунд. Ошибка сохраняет задания; scheduler должен мониторить 503 и очередь. Частичная обработка продолжается в следующем запуске. Не запускать workers параллельно и не продлевать heartbeat вручную вместо исправления ошибки.

## Живая приёмка
- Два разных подтверждённых аккаунта вступают в одну общую комнату. Подключаются без запроса микрофона, затем явно разрешают микрофон и слышат друг друга.
- Проверить mute/deafen с восстановлением микрофона, отказ разрешения, занятое/отключённое устройство, autoplay, мобильный браузер. При выходе индикатор микрофона ОС гаснет.
- Проверить speaking ring по настоящему аудио, reconnect, уход со страницы и отсутствие записей в проекте LiveKit.
- Kick/leave/close/email revocation запрещают новый JWT после DB commit; worker удаляет участника/комнату из SFU. Проверить повторный вход старым Cloud token и обработку очереди после сбоя. Ожидаемая задержка около 30 секунд плюс время API, не мгновенно.
- Остановить scheduler: через 90 секунд без heartbeat новые подключения недоступны; обычные клиенты выйдут при следующей проверке. Возобновить, убедиться, что durable jobs обработаны.

## Источники
- [LiveKit client SDK](https://docs.livekit.io/reference/client-sdk-js/).
- [Tokens and grants](https://docs.livekit.io/frontends/reference/tokens-grants/).
- [Participant management и Cloud token revocation](https://docs.livekit.io/intro/basics/rooms-participants-tracks/participants/).

## Связанные заметки
- [[docs/Home]]
- [[docs/Features/Voice Chat]]
- [[docs/Backend Setup]]
- [[docs/Verification]]
