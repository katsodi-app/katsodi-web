# Katsodi backend foundation

> English · [[supabase/README|Russian original]]

The cloud project is connected. As checked on 2026-11-08, installed capabilities include music rooms (migration 22); chart storage (migration 23) is still absent. Apply the outstanding chart migration and verify it using [[docs/en/Features/Music Activation]]. The application uses server-only publisher/worker credentials; public clients use a publishable or anon key.

For a new empty database, migrations in `migrations/` apply in timestamp order. The first two are:

1. `migrations/20261101000100_foundation.sql` — tables, RLS, functions that check verified users, atomic room and invitation operations.
2. `migrations/20261101000200_fandom_seed.sql` — 150 fandoms with the same IDs as the local catalogue.

Migrations are tested on PGlite. For the existing cloud project, inspect actual schema and migration history before applying changes; do not rerun the foundation files. Live acceptance is tracked separately from fixture tests.

Setup order, email templates and manual scenarios: [[docs/en/Backend Setup]]. Architecture: [[docs/en/Architecture]]; permissions: [[docs/en/Features/Server Authorization]]; results: [[docs/en/Verification]].
