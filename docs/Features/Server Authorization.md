---
title: "Серверные права доступа"
type: feature
status: code-ready-awaiting-infrastructure
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature, katsodi/backend]
---
# Серверные права доступа

> Русский · [[docs/en/Features/Server Authorization|English]]

## Зачем нужна
Не допустить раскрытия приватных комнат и подмены участников.

## Пользователи и роли
anon, authenticated; подтверждённый user; owner/moderator/member комнаты.

## Пользовательские сценарии
Гость получает только публичный каталог. Вход/приглашение создают membership. Мутации отклоняются при отсутствии подтверждения или нужной роли.

## Правила поведения
RLS включён на всех пользовательских таблицах. Ограниченные GRANT; SECURITY DEFINER-функции используют search_path='' и auth.uid(). Права на выполнение явно отозваны у PUBLIC/anon.

## Интерфейс и состояния
Нельзя полагаться на скрытые кнопки. UI показывает generic errors, не SQL details и не секреты.

## Техническая реализация
supabase/migrations; private helpers разрывают рекурсию RLS. Public RPC — узкие операции без произвольного owner/sender_id.

## Данные и доступы
Приложение не использует service role. Supabase config отклоняет sb_secret_ и JWT service_role в публичном поле.

## Безопасность и приватность
GetUser проверяется сервером; SQL дополнительно проверяет auth.users.email_confirmed_at, в том числе при SELECT через RLS. Бан/выход отражаются на последующем чтении/записи.

## Критерии приёмки
tests/unit/database-access.test.ts исполняет настоящую миграцию на PGlite с anon/authenticated ролями. auth.uid() подменён только в изолированном тестовом harness, не в продукте.

## Ограничения и следующие шаги
Нет предоставленного Supabase проекта; доступные Docker/Supabase CLI не обнаружены. Настоящие JWT, PostgREST, Auth expiry/revocation, сетевые races и production penetration test не выполнены.

## Связанные заметки
- [[docs/Home]]
- [[docs/Backend Setup]]
- [[docs/Architecture]]
- [[docs/Verification]]
