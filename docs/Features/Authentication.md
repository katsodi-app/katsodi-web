---
title: "Аккаунты и вход"
type: feature
status: connected-awaiting-acceptance
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature, katsodi/backend]
---
# Аккаунты и вход

> Русский · [[docs/en/Features/Authentication|English]]

## Зачем нужна
Подтверждённая личность для серверных комнат.

## Пользователи и роли
Гости регистрируются; подтверждённые пользователи входят, меняют пароль и выходят.

## Пользовательские сценарии
/signup, /login, /verify-email с повторным письмом, /forgot-password, /reset-password. /auth/confirm обрабатывает email/recovery token_hash; /auth/callback — PKCE code.

## Правила поведения
Без конфигурации формы отключены. Пароль 12–128 символов. Вход проверяется через getUser; неподтверждённая почта не допускается к мутациям. Восстановление и повторная регистрация не раскрывают существование адреса.

## Интерфейс и состояния
RU/EN, loading, generic errors, истёкшие ссылки, безопасный внутренний next. Отдельный экран без общей навигации, показ пароля и инструкция после отправки — [[docs/Features/Auth Experience]].

## Техническая реализация
Supabase Auth, @supabase/ssr, HttpOnly/SameSite=Lax cookies (Secure в production) и Next proxy. Server Actions валидируют FormData. Proxy обновляет claims; действия заново проверяют getUser.

## Данные и доступы
Пароли не хранятся в приложении. В запросах используется publishable/anon key и cookie текущего пользователя, service-role отсутствует.

## Безопасность и приватность
Внешние next отклоняются. Redirect-ответы auth — no-store/no-referrer. Auth-токены не пишутся собственным кодом в логи.

## Критерии приёмки
Моки проверяют ошибки входа, generic email response и защиту redirect. Живая доставка и сессии требуют подключения: [[docs/Backend Setup]].

## Ограничения и следующие шаги
Облачный проект подключён, пользователь подтвердил получение стандартного письма. Полный вход по ссылке, recovery и сессии нескольких браузеров ещё не приняты. SMTP и CAPTCHA/anti-abuse остаются следующими шагами.

## Связанные заметки
- [[docs/Home]]
- [[docs/Backend Setup]]
- [[docs/Architecture]]
- [[docs/Verification]]
