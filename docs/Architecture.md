# Архитектура

> Русский · [[docs/en/Architecture|English]]

Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4, Radix Tabs, Lucide, Zod, React Hook Form. Версии закреплены pnpm-lock.yaml. Страницы маршрутизируются сервером; интерактивное пространство — клиентские компоненты. CSS design tokens задаются в globals.css. Шрифт Manrope и подготовленные WebP хранятся локально; runtime-запросов к внешним источникам изображений, шрифтов и аналитики нет. ThemeProvider и статический bootstrap управляют пятью палитрами. Манифесты изображений сохраняют происхождение и права файлов.

src/lib — независимые доменные модели, provider registry, каталог фандомов, словари. WorkspaceProvider хранит проверенное Zod локальное состояние; SSR начинает с RU, после hydration восстанавливает локаль. src/components — shell и экраны. Подготовлены Supabase SSR client, proxy, Server Actions, миграции/RLS, профили и общие комнаты. Без env нет внешних auth/data-запросов; формы честно недоступны.

Серверные данные: Supabase Auth/PostgreSQL с пользовательской cookie-сессией и publishable/anon key. Никакого service-role bypass. Proxy обновляет claims, Server Actions проверяют getUser, SQL — подтверждение email и актуальную роль. Чат опрашивается каждые 3 секунды с дельтами сообщений и локально проверенным JWT (подробности — [[docs/Features/Room Chat]]); Realtime ещё не подключён. Публичные API подключены, полный сценарий нескольких аккаунтов ещё не принят — [[docs/Backend Setup]]. Подготовленный приватный Storage для чата описан в [[docs/Features/Chat Media]]: Sharp сжимает и очищает растры, серверный endpoint проверяет доступ при каждом чтении. Media-миграция в облаке не выполнялась. LiveKit остаётся будущим этапом; его токены должны выдаваться только сервером после проверки membership. LocalStorage нельзя использовать как авторизацию. Публичный флаг локального черновика — параметр прототипа, не серверная публикация.

## Слой оформления 0.4

brand.css и PageIntro/StatePanel/BrandArt объединяют маршруты в общий стиль. community-pages.tsx содержит read-only/community UI; welcome-page.tsx — посадочную страницу. Новый /onboarding повторно использует действующую ProfileForm, а /profile/[username] читает только разрешённые текущим RLS поля через пользовательскую сессию. /friends и /moderation не обращаются к будущим закрытым таблицам. Полная карта — [[docs/Page Catalogue]].

## Связанные заметки
- [[docs/Data Model]]
- [[docs/Security and Privacy]]
- [[docs/Features/Localization]]
