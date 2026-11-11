# Development Setup

> English · [[docs/Development Setup|Russian original]]

Verified environment: Windows PowerShell, Node 20.11.0, pnpm 12.16.1. Next requires Node >=20.9. Node 22 is recommended for a new environment. pnpm can run without a global installation:

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

Local URL: http://127.0.0.1:3000. npm run start runs the production build. Installation requires network access. pnpm permits build scripts for esbuild, sharp and unrs-resolver. Vitest 3 was chosen for compatibility with the existing Node 20.11. In pnpm-workspace.yaml, Rollup is replaced with the official @rollup/wasm-node 4.67.2: on 2026-11-02 Windows Application Control refused to load the native Rollup DLL, including outside the sandbox. Windows protection was not changed. The portable build has the same public interface — [official Rollup migration guide](https://rollupjs.org/migration).

.env.local contains local connection configuration and is ignored by Git. APP_URL, the Supabase URL and a public publishable/anon key are required. The application does not need service-role access. Migrations/seed are stored in supabase/migrations; the agent has not applied the media migration in the cloud. Instructions: [[docs/en/Backend Setup]]. Do not put real secrets in Git.

## Related notes

- [[README.en]]
- [[docs/en/Deployment]]
- [[docs/en/Verification]]
