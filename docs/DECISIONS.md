# Architectural Decisions

Format: Decision / Why / Risks / Alternatives considered. Status shows whether the decision is already applied.

| # | Decision | Status |
|---|---|---|
| D1 | Migrate in phases, starting with a safe rename layer | Applied |
| D2 | Keep APIs, collections and DB name unchanged in Phase 1 | Applied |
| D3 | Rename app folders to `navano-api` / `navano-batch` | Applied |
| D4 | Use `git mv` for folder renames | Applied |
| D5 | Keep `.env` DB name `/Nestar` | Applied |
| D6 | Do not auto-fix lint during the rename | Applied |
| D7 | One `Product` entity with `productCollection` | Planned (Phase 2) |
| D8 | `AGENT` → `STORE` (multi-store marketplace) | Planned (Phase 2) |
| D9 | Defer Order/Cart to Phase 3 | Agreed |
| D10 | Use a fresh dev DB for Phase 2 instead of migrating data | Recommended |

---

### D1. Migrate in phases, starting with a safe rename layer
- **Why:** Combining identifier renames with domain changes makes failures hard to attribute. A rename-only commit can be verified mechanically: tsc, lint diff, build and `grep nestar` = 0.
- **Risks:** For a while the code mixes Navano project names with Nestar domain names (Property, Agent).
- **Alternatives:** A single big-bang migration. Rejected because of the larger blast radius and harder review.

### D2. Keep APIs, collections and DB name unchanged in Phase 1
- **Why:** The frontend (`navano-client`) and existing dev data keep working with no coordinated release.
- **Risks:** None functional. Some domain naming debt remains until Phase 2.
- **Alternatives:** Renaming GraphQL ops together with the folders would break the frontend right away.

### D3. Rename app folders to `navano-api` / `navano-batch`
- **Why:** Project identity in folder names, `nest-cli.json` project keys, `dist` output and npm scripts should match the product.
- **Risks:** External scripts, CI or deployment configs (PM2, Docker) that reference `nestar-*` paths break. None exist in this repo.
- **Alternatives:** Neutral names (`api`, `batch`). Rejected to stay consistent with the Nest monorepo convention.

### D4. Use `git mv` for folder renames
- **Why:** Git records the moves as renames (100% similarity), so `git log --follow` and blame keep their history.
- **Risks:** None.
- **Alternatives:** Copy and delete, which loses rename detection when combined with large edits.

### D5. Keep `.env` DB name `/Nestar`
- **Why:** Changing the DB name in the URI points the app to an empty database. That counts as a data change, not a rename.
- **Risks:** The "Nestar" label stays in an env value. `.env` is gitignored, so it is not visible in the repo.
- **Alternatives:** Rename the DB together with `mongodump`/`mongorestore`, or start fresh in Phase 2 (see D10).

### D6. Do not auto-fix lint during the rename
- **Why:** `npm run lint` runs `eslint --fix`, which would rewrite many files (156 auto-fixable errors) and hide the rename diff. The pre-existing 397 problems are unrelated to the rename.
- **Risks:** Lint debt remains.
- **Alternatives:** A separate "chore: lint fix" commit. Recommended as its own task.

### D7. One `Product` entity with `productCollection` (FLOWER / CHOCOLATE / CAKE)
- **Why:** All three categories share the same lifecycle: listing, price, images, likes, views, comments and rank. One schema reuses all existing aggregation, like/view and batch logic.
- **Risks:** Category-specific attributes (cake weight, flower stem count) do not fit into common fields. A later `productAttributes` sub-document or a discriminator may be needed.
- **Alternatives:** Three separate modules/collections. Rejected because they triplicate code, favorites/visited lookups and batch jobs. Mongoose discriminators are deferred until category-specific fields are real.

### D8. `AGENT` → `STORE` (multi-store marketplace)
- **Why:** This matches the existing multi-seller model, where agents list properties. A store is the natural equivalent, so the `@Roles` guards and `memberId` ownership stay as they are.
- **Risks:** Existing `AGENT` members need data migration. Frontend role checks must change in the same release.
- **Alternatives:** A single shop with ADMIN-only listing. Rejected because it would drop the seller dashboards and the top-agent ranking.

### D9. Defer Order/Cart to Phase 3
- **Why:** Keeps Phase 2 a pure domain rename and remodel with a clear verification target. Commerce adds payment, stock reservation and delivery scheduling, which are new concerns.
- **Risks:** The platform cannot take orders until Phase 3.
- **Alternatives:** Build Order in Phase 2. Rejected to limit scope.

### D10. Use a fresh dev DB for Phase 2 instead of migrating data
- **Why:** The current data is real estate demo data with no value for Navano. A migration script would cost more than seeding.
- **Risks:** Dev accounts need to be re-created.
- **Alternatives:** A Mongo migration script to rename the collection and fields and map `AGENT` → `STORE`. Use it only if the data must be kept.
