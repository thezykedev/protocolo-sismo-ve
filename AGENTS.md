## Mandatory Instructions

Any coding agent must read and follow this file before making changes in this repository.

This project is a public emergency-information platform for Venezuela. Treat accuracy, accessibility,
privacy and operational clarity as product requirements, not polish.

Do not implement broad architectural changes unless the user explicitly asks for implementation.
When the user asks to update the SPEC, edit documentation only.

## Working Context (per session)

At the start of a session the user states which app they are working on: **ayuda** (the SvelteKit
online platform) or **pwa** (the Astro offline app). Remember that choice for the whole session and
apply this file's rules to that app. When delegating to subagents, pass the active app in their
prompt so they share the same context. If the user has not said which app and the change is
app-specific, ask before proceeding.

## Current Stack

This is a pnpm monorepo (`pnpm@11.1.1`, Node `>=22.12.0`):

- `apps/pwa` (`@sismo-ve/pwa`): Astro 7 offline-first essential app at `sismo-ve.xyz`. Preact where
  interactive, Leaflet maps, Tailwind 4 + custom global CSS.
- `apps/ayuda` (`@sismo-ve/ayuda`): SvelteKit online-first crowdsourced platform at
  `ayuda.sismo-ve.xyz`. PocketBase data layer with a SQLite-snapshot fallback, MapLibre GL maps.
- `packages/schemas` (`@sismo-ve/schemas`): shared types, validation, and the public-patient
  redactor. Exported as raw TS from `src/index.ts` (no build step).
- `packages/ui` (`@sismo-ve/ui`): shared CSS design system (tokens + components), crossed by both apps.

The PocketBase backend deploys separately on Coolify; its local-dev runtime, infra and credentials
are never committed (see Secrets And PocketBase). Design SPEC: `docs/crowdsourced-platform-pocketbase.md`.

## Git Workflow

- Work on a feature branch for every non-trivial change.
- Branch names should be short and scoped:
  - `feature/mobile-more-menu`
  - `feature/crowdsourced-spec`
  - `fix/public-copy`
  - `docs/pocketbase-architecture`
- Before starting a branch, check current state:

```sh
git status --short
git branch --show-current
```

- Do not overwrite or revert user changes.
- Do not use destructive git commands such as `git reset --hard` or `git checkout -- .`.
- Do not amend commits unless the user explicitly asks.
- If unrelated files are modified, leave them alone.
- If a change conflicts with user edits, stop and ask.

Branch and commit policy:

- The monorepo lives on its own feature branch. Do NOT commit to `main` directly; `main` changes
  only through a PR, merged when the user explicitly says it is OK.
- Commit each logical change on its own (one concern per commit), not in a big batch.
- Use Conventional Commits scoped by area: `feat(ayuda): ...`, `refactor(pwa): ...`,
  `feat(schemas): ...`, `chore(workspace): ...`, `docs: ...`.
- Stage with explicit pathspecs; never `git add -A`. Verify the staged set before committing so
  secrets, env files, or unrelated user-staged files never ride along.
- End commit messages with a `Co-Authored-By:` trailer identifying the agent.

## Git Worktrees

Use worktrees to run several feature branches at once (e.g. one per agent) without re-cloning. The
cost is one `node_modules` per worktree — but with pnpm those are mostly hardlinks into a shared
store, not real copies, so disk stays small. Do not let the repo balloon to gigabytes.

Keep the pnpm store global so every worktree reuses it:

```sh
pnpm store path                                  # should be ONE global path, e.g. ~/.local/share/pnpm/store/v3
pnpm config set store-dir ~/.pnpm-store          # only if a worktree resolves a separate store
pnpm config set package-import-method hardlink   # link packages in, don't copy them
```

Create worktrees with scoped branch names (see Git Workflow) and install per worktree:

```sh
git worktree add ../sismo-nav  -b feature/mobile-more-menu
git worktree add ../sismo-copy -b fix/public-copy
cd ../sismo-nav && pnpm install --frozen-lockfile --prefer-offline
```

The first install populates the store; later worktrees reuse it and are fast.

Rules:

- Each worktree gets its OWN `node_modules`. Do NOT symlink one worktree's `node_modules` to another
  (`ln -s ../main/node_modules node_modules`): it breaks when a branch changes deps or the lockfile,
  when a script writes into it, or when two agents install at once.
- Install only where you build/dev/test. Docs- or copy-only branches need no `pnpm install`.
- Measure size honestly: `du -sh node_modules` counts hardlinked files repeatedly and looks huge.
  Compare against the real footprint instead:

```sh
du -sh "$(pnpm store path)"          # the actual shared bytes on disk
du -sh --apparent-size node_modules  # logical size, not deduplicated reality
```

- Clean up finished worktrees: `git worktree remove ../sismo-nav` (then `git worktree prune`).

## Secrets And PocketBase

Tight control over secrets is a hard requirement.

- Never commit or expose credentials, `.env*` files (including `.env*.example`), or the PocketBase
  local-dev runtime/infra (`infra/pocketbase/**`, `pb_data`, the downloaded binary, secret scripts).
- The PocketBase backend deploys separately on Coolify; secrets are provisioned there, never in the
  repo. App code reads configuration from env vars only (no hardcoded URLs or credentials).
- `.gitignore` already excludes `.env*`, the PocketBase runtime, the SQLite fallback snapshot, and
  sensitive `data/` ingest. Do not add anything under those paths to git.
- Before committing, scan the staged set for `.env`, credentials, and PocketBase local files.

## Build And Validation

Run validation on the app you changed before handing work back.

- `pnpm build` builds all workspaces.
- `apps/ayuda` (SvelteKit): `pnpm --dir apps/ayuda check` (svelte-check, must be 0 errors) and
  `pnpm --dir apps/ayuda test` (unit tests — see Testing).
- `apps/pwa` (Astro): `pnpm --dir apps/pwa build`; run `pnpm test:offline` when the service worker,
  routing, install flow or cache behavior changes.

Use targeted browser checks for UI work. Mobile navigation must be checked at narrow widths such as
`390x844`.

Do not claim validation passed unless the command actually ran successfully. If validation cannot be
run, state the reason clearly.

## Testing

- Tests use Node's built-in runner (`node:test`) with native TS type-stripping — no Vitest/Jest.
- Name test files `*.test.ts` next to the code; run with `pnpm --dir apps/ayuda test`.
- Prefer an injectable seam: pass dependencies (clock, store, data sources) so logic is exercised
  through its interface with an in-memory adapter, not by mocking a live client.
- Do not add a test-runner dependency without a concrete need; `node:test` covers unit tests.

## Dev Server

Use background mode; do not start a foreground server that blocks the terminal.

- `apps/pwa` (Astro): `pnpm --dir apps/pwa astro dev --background` (manage with `astro dev
  status|logs|stop`).
- `apps/ayuda` (SvelteKit): `pnpm dev:ayuda` (Vite). Needs `apps/ayuda/.env` with
  `PUBLIC_POCKETBASE_URL` (and admin creds for user management) — never committed.

## Public Copy

Public pages must not sound like an AI assistant or like the site is speaking directly to the
project owner.

Do not write:

- "cuando me pases la data"
- "yo lo apruebo"
- "te dejo el esquema"
- "mi plataforma"
- "puedo agregar esto después"
- "directorio restringido" as public-facing copy

Use neutral institutional wording:

- "datos enviados por la comunidad"

Public copy should be:

- Spanish-first.
- Short and concrete.
- Calm, operational and useful.
- Free of filler, hype, disclaimers that sound autogenerated, or internal implementation language.

## Privacy And Crisis Data

The platform may show public crisis data, but it must minimize sensitive fields.

Patient data rules:

- Never show full cedula in public UI.
- Show only the last 3 digits: `cedula_last3`.
- Do not store full cedula unless the SPEC explicitly requires a private deduplication path.
- `public_notes` may include a brief clinical/diagnosis summary. The crowdsourced hospital lists
  are operationally useful for locating people, so a concise condition/diagnosis in `public_notes`
  is allowed. Keep it short and factual.
- Still do not publish private phone numbers, residential addresses or sensitive photos. Contact
  details and evidence stay in `patient_private_notes` (moderators only).
- All data is crowdsourced and published as-is, subject to community correction or removal requests.
- Always provide a correction/removal path for patient records.

Do not cache live patient, hospital capacity, collection center needs, donation or moderation data
in the offline PWA.

## Architecture Direction

The monorepo is the current architecture (not a future target):

- `apps/pwa`: Astro offline-first essential app at `sismo-ve.xyz`. Keep emergency protocols,
  contacts, backpack checklist and install guidance offline-friendly.
- `apps/ayuda`: SvelteKit online-first crowdsourced platform at `ayuda.sismo-ve.xyz`.
- `packages/ui`: shared design system (tokens + components), crossed by both apps.
- `packages/schemas`: shared types, validation, and the public-patient redactor.
- PocketBase API/admin deploys separately on Coolify.

Still do not introduce broad architectural changes (new packages, new shared seams, cross-app
coupling) unless the user explicitly asks.

## Design Vocabulary

When designing or refactoring, aim for deep modules and use this vocabulary precisely (do not
substitute "component"/"service"/"API"/"boundary"):

- **Module**: anything with an interface + implementation (function, file, package).
- **Interface**: everything a caller must know — types, invariants, error modes, ordering, config.
- **Depth**: leverage at the interface. Deep = much behaviour behind a small interface; shallow =
  interface nearly as complex as the implementation (a pass-through to avoid).
- **Seam**: a place to alter behaviour without editing there (where an interface lives).
- **Adapter**: a concrete thing satisfying an interface at a seam. One adapter = a hypothetical seam;
  two = a real one (e.g. a PocketBase adapter + an in-memory one for tests).
- **Leverage** (callers) and **Locality** (maintainers) are what depth buys.

Principles: the deletion test (if deleting a module concentrates complexity across its callers it
earns its keep; if complexity merely vanishes it was a pass-through); the interface is the test
surface (if you must test past the interface, the module is the wrong shape); accept dependencies,
don't create them. Examples in this repo: the public-patient redactor + `parsePatientSubmission` in
`@sismo-ve/schemas`, the `moderate()` transition behind `ModerationStore`, and the seismic
aggregator's injectable `sources`.

## Dynamic Data Strategy

Crowdsourced and frequently changing data belongs in the SvelteKit app (`apps/ayuda`), not in the
offline PWA cache.

Dynamic modules include:

- Patients.
- Hospitals.
- Collection centers.
- Allied sites.
- Seismic activity.
- Donations and transparency.
- Moderation queues.

For `pacientesterremotovzla.lovable.app`, the SPEC currently requires public rendered-page import or
manual HTML snapshot as the default path. Do not depend on private API access unless credentials are
officially granted.

For seismic monitoring, the SPEC requires all-Venezuela coverage and low-magnitude aftershock
monitoring. Do not filter out small events by default.

## UI And UX Standards

Follow WCAG 2.1 AA.

Minimum expectations:

- Interactive targets should be at least `44px` high.
- Focus state must be visible.
- Text contrast must be sufficient; avoid low-opacity essential text.
- Navigation backgrounds should be solid for readability.
- Icons and labels must be aligned consistently.
- Mobile menus must not appear squashed or overflow the viewport.
- Respect `prefers-reduced-motion` for animations.

Preserve the Sismo VE visual identity:

- Dark solid backgrounds.
- Yellow emergency accent.
- Orange secondary accent.
- Operational/brutalist borders.
- JetBrains Mono for operational labels.
- No generic purple SaaS styling.
- No translucent critical navigation.

## Mobile Navigation Rules

The mobile bottom nav should keep primary actions visible and put secondary sections under `Mas`.

Rules:

- Opening `Mas` must only reveal the `Mas` panel, not expand the whole menu.
- The `Mas` icon should animate consistently with desktop/icon motion.
- Links in the panel must be grouped and easy to scan.
- Icon and text alignment must be consistent across rows.
- The panel should fit common mobile viewports.
- Use solid backgrounds.
- Do not duplicate every desktop nav item if it harms mobile usability.

## Documentation

Full Astro documentation (apps/pwa): https://docs.astro.build
Full SvelteKit documentation (apps/ayuda): https://svelte.dev/docs/kit

Consult these guides before working on related tasks:

- Adding pages, dynamic routes, or middleware: https://docs.astro.build/en/guides/routing/
- Working with Astro components: https://docs.astro.build/en/basics/astro-components/
- Using React, Vue, Svelte, or other framework components: https://docs.astro.build/en/guides/framework-components/
- Adding or managing content: https://docs.astro.build/en/guides/content-collections/
- Adding styles or using Tailwind: https://docs.astro.build/en/guides/styling/
- Supporting multiple languages: https://docs.astro.build/en/guides/internationalization/

Project docs:

- Architecture SPEC: `docs/crowdsourced-platform-pocketbase.md`
- Research/snapshots: `docs/research/` is local-only and must not be committed.
- Agent handoff: `docs/handoff-agents.md` is optional context for future coding agents. Do not load
  it by default; read it only when continuing prior implementation work or when the user asks for
  handoff context. After substantial implementation work, update it before final response. Keep it
  under 120 lines.

## Editing Rules

- Prefer `rg` for search.
- Use the editing tools for manual edits; keep edits minimal and scoped.
- Do not introduce new dependencies without a concrete need.
- Do not add generated files, private data, screenshots or local research snapshots to git.
- Keep files ASCII unless the file already uses Spanish punctuation/accents and readability benefits
  from them.
- Do not add comments that restate obvious code.

## Handoff Checklist

Before final response:

- Confirm what files changed.
- Confirm whether validation ran.
- Mention any command failures.
- Mention if work was documentation-only.
- Do not say "done" unless the requested scope is actually complete.
- Include concise next steps only if they are useful.
