# Katsodi: правила разработки

> Русский · [[AGENTS.en|English]]

## Область проекта

Сверяйтесь с [[docs/Specification]] и [[docs/Roadmap]]. UI поддерживает русский и английский; новые строки добавляются в обе локали src/lib/i18n.ts. Не называйте локальные данные многопользовательскими.

## Git

Работайте в существующем корневом Git. Небольшие логические коммиты. Не переписывайте историю. Remote и push — только по отдельному запросу пользователя. Не коммитьте .env, credentials, node_modules и build output.

## Документация

Новая самостоятельная функция получает заметку docs/Features с frontmatter и разделами из [[docs/Features/Feature Template]]. Обновляйте [[docs/Home]]. Каждый Markdown содержит внутреннюю wikilink; docs содержит минимум две связанные заметки. Выполняйте npm run docs:check.

## Проверки

npm run lint, typecheck, unit, docs:check, build. Для UI — npm run e2e. Не объявляйте неисполненные проверки успешными. Не ослабляйте авторизацию ради теста. Интеграции должны показывать фактические capabilities.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
