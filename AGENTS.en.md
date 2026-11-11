# Katsodi development rules

> English · [[AGENTS|Russian original]]

## Project scope

Refer to [[docs/en/Specification]] and [[docs/en/Roadmap]]. The UI supports Russian and English; add new strings to both locales in src/lib/i18n.ts. Do not describe local data as multiplayer data.

## Git

Work in the existing root Git repository. Make small, logical commits. Do not rewrite history. Add remotes or push only at the user's separate request. Do not commit .env, credentials, node_modules or build output.

## Documentation

Every new standalone feature needs a docs/Features note with frontmatter and the sections from [[docs/en/Features/Feature Template]]. Update [[docs/en/Home]]. Every Markdown file must contain an internal wikilink; docs must contain at least two linked notes. Run npm run docs:check.

## Checks

Run npm run lint, typecheck, unit, docs:check and build. For UI changes, run npm run e2e. Do not report checks you did not run as successful. Do not weaken authorization for tests. Integrations must expose their actual capabilities.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
