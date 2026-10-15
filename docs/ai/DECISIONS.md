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
| D7 | One `Product` entity with `productType` | Applied (Phase 2) |
| D8 | Keep `MemberType.AGENT` (the `STORE` rename is dropped) | Applied (Phase 2) |
| D9 | Defer Order/Cart to Phase 3 | Agreed |
| D10 | Use a fresh dev DB for Phase 2 instead of migrating data | Recommended |
| D11 | `navanoo.pdf` data model is the schema source of truth | Agreed |
| D12 | Navano AI uses the Claude API from `navano-api` only | Applied |
| D13 | CS content in `notices` by category, 1:1 inquiries in their own collection | Applied |
| D14 | Notifications are written by the services and read by polling | Applied |
| D15 | One responsive layout instead of separate mobile pages | Applied |
| D16 | 15-minute access token + rotating httpOnly refresh cookie | Applied |

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

### D7. One `Product` entity with `productType` (FLOWER / CHOCOLATE / CAKE)
- **Why:** All three categories share the same lifecycle: listing, price, images, likes, views, comments and rank. One schema reuses all existing aggregation, like/view and batch logic.
- **Risks:** Category-specific attributes (cake weight, flower stem count) do not fit into common fields. A later `productAttributes` sub-document or a discriminator may be needed.
- **Alternatives:** Three separate modules/collections. Rejected because they triplicate code, favorites/visited lookups and batch jobs. Mongoose discriminators are deferred until category-specific fields are real.

### D8. Keep `MemberType.AGENT` (the `STORE` rename is dropped)
- **Why:** The user decided on 2026-10-09 to keep member types as they are (`USER`, `AGENT`, `ADMIN`). Agents act as the sellers: they own products through `memberId`, and `@Roles(MemberType.AGENT)` guards product creation. Names tied to the member type stay too: `getAgents`, `AgentsInquiry`, `availableAgentSorts`, `batchTopAgents`, `BATCH_TOP_AGENTS`. The agent product listing is `getAgentProducts` / `AgentProductsInquiry`.
- **Risks:** The label "agent" is a leftover from real estate. A later rename means another breaking change for the API, the DB and the frontend.
- **Alternatives:** `AGENT` → `STORE` (the earlier plan). Rejected by the user to keep this migration focused on products.

### D9. Defer Order/Cart to Phase 3
- **Why:** Keeps Phase 2 a pure domain rename and remodel with a clear verification target. Commerce adds payment, stock reservation and delivery scheduling, which are new concerns.
- **Risks:** The platform cannot take orders until Phase 3.
- **Alternatives:** Build Order in Phase 2. Rejected to limit scope.

### D10. Use a fresh dev DB for Phase 2 instead of migrating data
- **Why:** The current data is real estate demo data with no value for Navano. A migration script would cost more than seeding.
- **Risks:** Dev accounts need to be re-created.
- **Alternatives:** A Mongo migration script to rename the collection and fields and map `AGENT` → `STORE`. Use it only if the data must be kept.

### D11. The data model diagram (`navanoo.pdf`) is the schema source of truth
- **Why:** The user designed the Navano schema in Datensen (`D:\MiT\MOD2\navanoo.pdf`). The earlier draft fields (`productCollection`, `productSize`, `productStock`, `productSale`, `productCustomizable`) are replaced by the diagram's fields: `productType`, `productItemCount`, and `memberAddress` on members. Enum values the diagram does not show were confirmed by the user: status `HOLD/ACTIVE/SOLD/DELETE`, Korean city locations, `constructedAt` removed.
- **Risks:** `navano.dmm` (saved in 2024) is the old Nestar model. `navanoo.dmm` (generated on 2026-10-09 from `navano.dmm`) is the Datensen source that matches the Phase 2 code; `navanoo.pdf` must be re-exported from it. If the diagram changes again, the docs must be re-synced by hand.
- **Alternatives:** Keep the earlier draft. Rejected because the user's model takes priority.

### D12. Navano AI uses the Claude API from `navano-api` only
- **Why:** The API key must never reach the browser. The backend already owns the data the assistant needs (`getProducts`, `getAgents`, `getProductFacets`), so the tools reuse those services and the client only calls one GraphQL mutation (`askAssistant`). Model `claude-opus-5-5` (chosen by the user on 2026-10-14), effort `low`, no streaming in the first version.
- **Risks:** API cost per message. Mitigated by logged-in members only, 20 requests per member per hour (in memory, per process), at most 12 history turns of 1000 characters, and at most 4 tool rounds per reply.
- **Alternatives:** Calling the API from Next.js (exposes the key or needs a separate proxy); streaming over SSE (better feel, more moving parts; can come later).

### D13. CS content in `notices` by category, 1:1 inquiries in their own collection
- **Why:** Notices, FAQ and terms share one shape (title, content, status, topic), so one `notices` collection with `NoticeCategory` = `NOTICE / FAQ / TERMS` serves all three tabs; events are a `NoticeTopic`. Inquiries have an owner, an answer and a WAIT / ANSWERED life cycle, so they get `inquiries` (decided with the user on 2026-10-14: full CS API).
- **Risks:** FAQ reuses `noticeTitle` / `noticeContent` as question / answer. FAQ-only fields (ordering, groups) would need new fields.
- **Alternatives:** Keep the static client arrays (no admin editing); one collection for inquiries too (mixes public content with private messages).

### D14. Notifications are written by the services and read by polling
- **Why:** The like, comment and follow services already know the receiver, so they call `NotificationService` directly; self-actions are skipped and an undone like removes its notification. The client polls `getUnreadNotifications` every 30 s while the tab is visible (user's choice on 2026-10-14).
- **Risks:** Up to 30 s delay; one small request per open tab every 30 s.
- **Alternatives:** Push over the existing WebSocket gateway (instant, more code on both sides; can come later).

### D15. One responsive layout instead of separate mobile pages
- **Why:** The `device === 'mobile'` branches were Nestar stubs with no real mobile design. One `#pc-wrap` layout reflowed by `scss/pc/responsive.scss` (≤1023 / ≤767 / ≤480 px) keeps one code path (user's choice on 2026-10-14).
- **Risks:** New page styles must add their rules to `responsive.scss`; wide admin tables scroll inside their cards on phones.
- **Alternatives:** Finish the separate mobile pages (double the UI work).

### D16. 15-minute access token + rotating httpOnly refresh cookie
- **Why:** A stolen 30-day token could not be revoked (the first version of D16, 2026-10-14). Since 2026-10-15 the access token lives 15 minutes. `login` / `signup` also set the `nv_rt` cookie (httpOnly, `sameSite: lax`, `secure` in production, `path: /graphql`, 30 days). `refreshToken` uses the cookie once: the session is deleted and a new cookie is set (rotation). `logout` deletes the session. Sessions live in `sessions` (sha256 hash of the token, TTL index), one per device. The guards are unchanged: they still read the `Authorization` header.
- **Risks:** An access token that leaks stays valid for up to 15 minutes. The WebSocket token is checked only on connect. The client and API must stay same-site (`localhost` ↔ `localhost`, or one domain in production), or the `lax` cookie is not sent.
- **Alternatives:** Refresh token in `localStorage` (readable by any XSS); one session field on the member (logs out the other devices).
