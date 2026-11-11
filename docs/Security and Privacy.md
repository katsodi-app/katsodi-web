# Безопасность и приватность

> Русский · [[docs/en/Security and Privacy|English]]

Сейчас нет аккаунтов, сетевого чата или авторизации. LocalStorage виден всем пользователям этого браузерного профиля; не вводите секреты в черновики. Приватная локальная комната исключена из каталога, но не является защищённой серверной комнатой.

React экранирует пользовательский текст. Ссылки разрешены только HTTPS, без credentials, нестандартного порта, IP literals и локальных имён. Host matching точный. URL не запрашивается сервером; DNS-resolving SSRF защита нужна перед будущим fetch. Внешние ссылки содержат noopener noreferrer. Встроенного embed нет.

Заголовки: nosniff, DENY frame, strict-origin-when-cross-origin, HSTS, статический CSP без nonce (см. [[docs/Deployment]]), camera/geolocation отключены, microphone только для своего origin. CSP с nonce, rate limits, RLS и server-side authorization ещё предстоят; не считать прототип production-ready. Аналитика и запись голоса отсутствуют.

## Связанные заметки
- [[docs/Features/Content Providers]]
- [[docs/Data Model]]
