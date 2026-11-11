# Развёртывание

> Русский · [[docs/en/Deployment|English]]

Сейчас только локальный проект. Remote не добавлен, код наружу не отправлялся. Публичное размещение не выполнено. Для просмотра интерфейса достаточно npm run dev.

Перед серверным staging: создать Supabase dev/staging/prod, подготовить migrations/RLS tests, email-confirmation/reset redirect allowlist, SMTP; secrets только серверу. Настроить HTTPS, CSP, rate limits, backups, deletion policy и мониторинг. LiveKit опционален, VOICE_ENABLED=false до реализации и проверки токенов. Hosting для Next.js выбирается перед первым deployment.

## За обратным прокси

- `NEXT_PUBLIC_APP_URL` — публичный HTTPS-адрес сайта, например `https://katsodi.example`. По нему строятся переходы после подтверждения почты, сброса пароля и приглашений, и проверка Origin у API принимает его. Без него Next подставляет собственный адрес сервера (`localhost:<port>`).
- `npm start` запускает `next start` без `--hostname`. С `--hostname 127.0.0.1` Next считает внутренние rewrite в `src/proxy.ts` внешними, и за HTTPS-прокси `/admin` и неизвестные песни отвечают 500. Доступ к порту ограничивайте firewall или сетью контейнера.
- Прокси должен либо передавать исходный `Host`, либо открывать сайт по адресу из `NEXT_PUBLIC_APP_URL`. Заголовку `X-Forwarded-Host` приложение намеренно не доверяет.
- `Strict-Transport-Security` отправляется всегда, но браузеры учитывают его только по HTTPS. Статический `Content-Security-Policy` (без nonce) задан в `next.config.ts`: скрипты только со своего origin и SDK плееров (YouTube, Spotify, SoundCloud, Vimeo), `object-src 'none'`, `base-uri`/`form-action 'self'`, `frame-ancestors 'none'`; `connect-src` — свой origin, Supabase из `NEXT_PUBLIC_SUPABASE_URL` (https и wss), `*.livekit.cloud` и клиентские адреса Hyperbeam. Плееры и сайт комнаты встраивают произвольные https-страницы, поэтому `frame-src`, `img-src` и `media-src` открыты для https. `NEXT_PUBLIC_SUPABASE_URL` должен быть задан при сборке, иначе используется `*.supabase.co`. Тест `tests/e2e/content-security-policy.spec.ts` падает при любом нарушении CSP.
- Проверка после выкладки: `/admin` и `/music/unknown` отвечают 404, а `/auth/callback` перенаправляет на публичный домен.

## Связанные заметки
- [[docs/Development Setup]]
- [[docs/Security and Privacy]]
- [[docs/Backend Setup]]
