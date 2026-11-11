# Локальная разработка

> Русский · [[docs/en/Development Setup|English]]

Проверенное окружение: Windows PowerShell, Node 20.11.0, pnpm 12.16.1. Next требует Node >=20.9. Для нового окружения рекомендуется Node 22. pnpm можно вызывать без глобальной установки:

```sh
npm exec --yes --package=pnpm@12.16.1 -- pnpm install
npm run dev
npm run lint
npm run typecheck
npm run unit
npm run docs:check
npm run build
npm exec -- playwright install chromium
npm run e2e
```

Локальный URL http://127.0.0.1:3000. npm run start запускает production build. Установка требует сети. pnpm разрешает build scripts esbuild, sharp и unrs-resolver. Vitest 3 выбран для совместимости с существующим Node 20.11. В pnpm-workspace.yaml Rollup заменён официальным @rollup/wasm-node 4.67.2: 2026-11-02 Windows Application Control отказался загружать нативный Rollup DLL, в том числе вне sandbox. Защита Windows не менялась. Переносимая сборка имеет тот же публичный интерфейс — [официальное руководство Rollup](https://rollupjs.org/migration).

.env.local содержит локальную конфигурацию подключения и игнорируется Git. Требуются APP_URL, Supabase URL и публичный publishable/anon key. Service-role приложению не нужен. Миграции/seed хранятся в supabase/migrations; media-миграция в облаке агентом не выполнялась. Инструкция — [[docs/Backend Setup]]. Не вставляйте реальные секреты в Git.

## Связанные заметки
- [[README]]
- [[docs/Deployment]]
- [[docs/Verification]]
