---
title: "Сворачиваемая навигация"
type: feature
status: implemented-local
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---
# Сворачиваемая навигация

> Русский · [[docs/en/Features/Collapsible Navigation|English]]

## Зачем нужна
Освободить место для контента на desktop.

## Пользователи и роли
Все посетители desktop-версии.

## Пользовательские сценарии
Кнопка слева в topbar скрывает и возвращает sidebar; выбор переживает reload.

## Правила поведения
Скрытое меню получает inert и не участвует в Tab-навигации. Mobile использует нижнее меню.

## Интерфейс и состояния
Плавное смещение контента, aria-expanded и подписи RU/EN; prefers-reduced-motion отключает переход.

## Техническая реализация
Shell, CSS transitions; localStorage katsodi.sidebar.

## Данные и доступы
В браузере сохраняется только hidden/visible.

## Безопасность и приватность
При ошибке localStorage работает состояние в памяти.

## Критерии приёмки
Скрытие, reload и восстановление навигации проверены e2e.

## Ограничения и следующие шаги
Предпочтение не синхронизируется между устройствами.

## Связанные заметки
- [[docs/Home]]
- [[docs/Architecture]]
- [[docs/Verification]]
