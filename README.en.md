# Katsodi

> English · [[README|Russian original]]

A browser space for evenings together. Version 0.4 provides branded interfaces for all known screens and a prepared backend foundation; the full multiplayer MVP has not yet passed acceptance testing.

## Getting started

Node.js >=20.9 (use Node 22 for a new environment). pnpm 12.16.1.

```sh
npm exec --yes --package=pnpm@12.16.1 -- pnpm install
npm run dev
```

Open http://127.0.0.1:3000. If pnpm is installed, you can use pnpm install / pnpm dev.

Five themes, an editorial slideshow, local fonts and real fandom covers have been added. Implemented: RU/EN, the catalogue, local rooms, saved items, 150 fandoms and safe link validation. Supabase is connected and the user received a standard email; full acceptance of accounts and server rooms is still pending — [[docs/en/Backend Setup]]. The updated room design is documented in [[docs/en/Features/Room Experience]]. A separate migration is prepared for stickers and compressed images — [[docs/en/Features/Chat Media]]; it has not been executed in the cloud. Realtime, voice and synchronization are not connected. A local prototype is available without environment configuration.

Open the repository root as an Obsidian vault.

The complete screen map and actual capabilities are in [[docs/en/Page Catalogue]]. Friends and global moderation designs are prepared, but those services are not connected yet.

- [[docs/en/Home]]
- [[docs/en/Development Setup]]
- [[docs/en/Architecture]]
- [[docs/en/Roadmap]]
