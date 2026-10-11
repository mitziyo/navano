# Completed Tasks (session 2026-10-09)

## 1. Codebase analysis
- Mapped the monorepo: `apps/*-api` (GraphQL modules, socket gateway) and `apps/*-batch` (3 cron jobs).
- Found every Property/Agent coupling outside the property module: `like.service.ts`, `view.service.ts`, `comment.service.ts`/`comment.module.ts`, `member.*`, `libs/config.ts`, group enums, `Notification.model.ts`, batch.
- Found pre-existing bugs (not fixed yet, see `NEXT_STEPS.md`).

## 2. Phase 2 domain design (agreed, not implemented)
- Property → Product with `productType` FLOWER / CHOCOLATE / CAKE, `productStatus` HOLD/ACTIVE/SOLD/DELETE, `productItemCount`, `memberAddress` (per `navanoo.pdf`, see DECISIONS D11).
- AGENT → STORE. (Later dropped: `AGENT` is kept, see DECISIONS D8.)
- Order/Cart deferred.
- Full mapping in `BACKEND_MIGRATION.md` §4.2 and §5 to §7.

## 3. Phase 1: safe rename layer (done, committed in `7856ad9 fix: Modify project name into Navano`)

| File | Change |
|---|---|
| `apps/nestar-api/**` → `apps/navano-api/**` | `git mv` (all files, 100% rename) |
| `apps/nestar-batch/**` → `apps/navano-batch/**` | `git mv` |
| `nest-cli.json` | `sourceRoot`, `root`, `tsConfigPath`, project keys `navano-api` / `navano-batch` |
| `package.json` | `name: navano`; scripts `start:dev:batch`, `start:prod`, `start:prod:batch`, `test:e2e` |
| `package-lock.json` | root `name` ×2 |
| `apps/navano-api/tsconfig.app.json` | `outDir: ../../dist/apps/navano-api` |
| `apps/navano-batch/tsconfig.app.json` | `outDir: ../../dist/apps/navano-batch` |
| `apps/navano-batch/src/batch.module.ts` | schema import paths |
| `apps/navano-batch/src/batch.service.ts` | DTO/enum import paths; welcome text |
| `apps/navano-batch/src/batch.controller.ts` | ready log label |
| `apps/navano-batch/test/app.e2e-spec.ts` | `describe` label |
| `apps/navano-api/src/app.service.ts` | welcome text |
| `README.md` | replaced the NestJS starter text with Navano docs |
| `dist/` | deleted and rebuilt (gitignored) |

Not changed on purpose: GraphQL API, enums, `BATCH_*` constant values, Mongo collections, `.env` DB name, `uploads/`.

## 4. Validation

| Check | Before | After |
|---|---|---|
| `npx tsc --noEmit -p apps/<api>/tsconfig.app.json` | 0 errors | 0 errors |
| `npx tsc --noEmit -p apps/<batch>/tsconfig.app.json` | 0 errors | 0 errors |
| `npx eslint "apps/**/*.ts"` (no `--fix`) | 397 (371 errors, 26 warnings) | 397 (identical) |
| `npx nest build navano-api` | — | success (`dist/apps/navano-api/main.js`) |
| `npx nest build navano-batch` | — | success (`dist/apps/navano-batch/main.js`) |
| `grep -rni nestar` (excluding node_modules, .git, .env) | 12 files | 0 |
| Runtime smoke test (`npm run start:dev`) | not run | not run |
| Unit / e2e tests | not run | not run |

## 5. Documentation
- Created `docs/` with: `BACKEND_MIGRATION.md`, `DECISIONS.md`, `FRONTEND_MIGRATION.md`, `COMPLETED_TASKS.md`, `NEXT_STEPS.md`, `PROMPTS.md`. No source code changed.

## 6. Phase 2: Property → Product (done in the working tree on branch `modification`)

Decision: `MemberType` stays `USER` / `AGENT` / `ADMIN` (DECISIONS D8). Schema follows `navanoo.pdf` (D11).

| Area | Change |
|---|---|
| Moves (`git mv`) | `property.enum.ts` → `product.enum.ts`, `Property.model.ts` → `Product.model.ts`, `libs/dto/property/*` → `libs/dto/product/*`, `components/property/*` → `components/product/*` |
| Enums | `ProductType` `FLOWER/CHOCOLATE/CAKE`, `ProductStatus` `HOLD/ACTIVE/SOLD/DELETE`, `ProductLocation`. `Like/View/Comment/NotificationGroup.PROPERTY` → `PRODUCT` |
| Schema | `Product` model, collection `products`, `productItemCount` added. Removed square/beds/rooms/barter/rent/`constructedAt`. Unique index on `productType/Location/Title/Price`. `Member`: `memberProducts`, `memberAddress` added to the schema. `Notification`: `productId` (ref `Product`) |
| DTOs | `Product`, `Products`, `ProductInput`, `ProductUpdate`, `ProductsInquiry`, `AgentProductsInquiry`, `AllProductsInquiry`. Removed `SquaresRange`, `roomsList`, `bedsList`, `options` |
| GraphQL | `createProduct`, `getProduct(productId)`, `updateProduct`, `getProducts`, `getAgentProducts`, `likeTargetProduct(productId)`, `getAllProductsByAdmin`, `updateProductByAdmin`, `removeProductByAdmin`. `getFavorites` / `getVisited` return `Products` |
| Couplings | `components.module.ts`, `comment.*` (`productStatsEditor`, `productComments`), `like.service.ts` (`getFavoriteProducts`), `view.service.ts` (`getVisitedProducts`), `libs/config.ts` (`availableProductSorts`, `favoriteProduct` / `visitedProduct` lookups; `availableOptions` removed) |
| Batch | `Product` model, `batchTopProducts`, `BATCH_TOP_PRODUCTS`; `batchTopAgents` uses `memberProducts` |
| Bug fixes | batch `MemberType:` → `memberType:`; `findOneAndUpdate(_id…)` → `findByIdAndUpdate`; `productAddress/Title` typed `string`; board-article log text; `soldAt` / `deletedAt` now saved on update; `memberAddress` now persisted |
| Tests | `components/product/product.service.spec.ts`: `shapeMatchQuery`, `getAgentProducts` DELETE guard, `updateProduct` SOLD flow |
| Docs | `AGENTS.md`, `skills/backend-migration/SKILL.md`, `DECISIONS.md` (D8 rewritten, duplicate D11 removed), `BACKEND_MIGRATION.md`, `NEXT_STEPS.md` |

### Validation

| Check | Result |
|---|---|
| `npx tsc --noEmit` api / batch | 0 errors / 0 errors |
| `npx nest build navano-api` / `navano-batch` | success / success |
| `npx eslint "apps/**/*.ts"` | 397 (371 errors, 26 warnings), same as the baseline |
| `npx jest apps/navano-api/src/components/product` | 3 passed |
| `grep -rniE "propert" apps --include=*.ts` | 0 |
| Runtime smoke test | not run |

## 7. Fix: member lookups pointed at a missing collection (2026-10-10)

- **Symptom:** `getProducts` returned `list: []` with `metaCounter.total: 2` in Postman.
- **Cause:** `cc3c6ba` renamed the Member collection `member` → `members`, but the five `$lookup` helpers in `libs/config.ts` still used `from: 'member'`. The join found nothing and `$unwind: '$memberData'` dropped every row. This also hit `getAgentProducts`, `getAllProductsByAdmin`, `getFavorites`, `getVisited`, board articles, comments and follows.
- **Fix:** `lookupMember`, `lookupFollowingData`, `lookupFollowerData`, `lookupFavorite`, `lookupVisit` now use `from: 'members'`.
- **Test:** `libs/config.spec.ts` checks that every member lookup uses `MemberSchema`'s collection name.
- **Validation:** tsc api/batch 0 errors, both builds pass, eslint 397 (baseline), jest 4 passed. A read-only DB check showed 2 ACTIVE products survive the join with `members` and 0 with `member`.

## 8. Frontend migration F1–F4 in `navano-client` (2026-10-10)

Done in the working tree on branch `modification` (not committed yet). Plan: `FRONTEND_MIGRATION.md`.

Decision: code, API calls, enums, types, routes and component names keep `AGENT` (D8). Only visible UI text says "Store" / "Stores".

| Phase | Change |
|---|---|
| F0 | Baseline: `yarn tsc --noEmit` 0 errors, `yarn build` success. Lint skipped (no ESLint config) |
| F1 | `package.json` name `navano-client`. "Nestar" text replaced in `_document.tsx` (SEO meta), `Layout{Home,Basic,Full}.tsx`, `Footer.tsx`, `join.tsx`, `community/index.tsx` and mobile placeholders |
| F2 | `product.enum.ts` (`FLOWER/CHOCOLATE/CAKE`, `HOLD/ACTIVE/SOLD/DELETE`); group enums `PRODUCT`; `libs/types/product/*` per `BACKEND_MIGRATION.md` §7; `memberProducts` in types, JWT payload, `userVar` and auth; `config.ts` drops options/years/square and adds `productTypes`; Apollo ops renamed (`removeProductByAdmin(input)`) |
| F3 | `git mv` of `pages/property` → `pages/product`, `_admin/properties` → `_admin/products`, product components and SCSS. Cards and detail page show type, location, item count and status. `AddNewProduct` uses Item Count, upload target `product`. `Filter.tsx` and `HeaderFilter.tsx` drop rooms/beds/square/year/options; HeaderFilter advanced modal keeps a price range; type tiles get a fallback colour until the type images exist |
| F4 | UI text: "Top Stores", "Store", "No Stores found!", join label "Store" (value `AGENT`), footer links. Locales `en/kr/ru`: `Products`, `Product type`, `Product Search`; `Agents` → Stores; `Agent Page` → Store Page; `Rooms` removed. Admin: `HOLD` tab ("On hold"), "Sold out", product list column "STORE", AGENT members shown as "STORE" |

### Validation

| Check | Result |
|---|---|
| `yarn tsc --noEmit` | 0 errors |
| `yarn build` | success (`/product`, `/product/detail`, `/_admin/products`, `/agent`) |
| Apollo ops vs live `navano-api` schema (`graphql.validate`) | 36 / 36 valid |
| `grep -rni propert apollo libs pages scss` | only static image paths and the FAQ category |
| `yarn dev` route smoke test (13 routes) | all 200 |
| Data flow (list, like, add product) | not testable yet: the UI does not call the API (no `useQuery` / `useMutation`) |

## 9. `navano-client`: API wiring ported from the reference project (2026-10-10)

Source: `D:/MiT/Nestar O'quv/nestar-next` (the finished Nestar client built from the same template). Method: a 3-way merge per file, with base = the original template (`navano-client` `bfbf507`) and reference = the finished file, both run through the same property → product rename. This adds the reference's API code without undoing the Navano migration.

| Area | Change |
|---|---|
| Pages wired (`useQuery` / `useMutation`) | home sections (Top/Popular/Trend Products, Top Stores, Community), `/product`, `/product/detail` (data, comments, like), `/agent`, `/agent/detail`, `/mypage` (My Products, Add/Edit Product, Favorites, Recently Visited, Articles, Write Article, Profile), `/member` (products, articles, followers/followings, follow), `/community` list and detail, admin products/users/community |
| Fixed stubs | `AddNewProduct` create/update, `MyProducts` status/delete, community comments, follow/unfollow, `Teditor` submit, missing `likeProductHandler` in product detail |
| WebSocket | Reference approach: `apollo/client.ts` keeps `WebSocketLink` with a custom `LoggingWebSocket` (`webSocketImpl`) that stores the socket in `socketVar`; `Chat.tsx` uses it for the chat gateway. This also stops the "Invalid message type!" error. The error link shows GraphQL errors with `sweetErrorAlert` |
| Styles | chat bubbles (`scss/pc/main.scss`), `RippleBadge`, agent detail spacing |
| Conflicts resolved by hand | `MyProfile.tsx` (kept the placeholder-image guard), `product/Filter.tsx` (removed real-estate filters stay removed), `_admin/products` (`HOLD` tab kept), `product/index.tsx` |
| Extra fix | "New" sort on `/product` uses `DESC` (the reference has `ASC`) |
| Not wired | CS (Notice/FAQ/Inquiry): the backend has no GraphQL API for them |

Validation: `yarn tsc --noEmit` 0 errors; no references to removed real-estate fields; 11 routes return 200 on the dev server. Browser checks of data flows are pending.

## 10. `productOccasion` field (2026-10-11)

Source: the updated diagram `D:/MiT/MOD2/navano.pdf` adds `productOccasion` (enum, NN) to products. Values confirmed by the user: `BIRTHDAY`, `WEDDING`, `ANNIVERSARY`, `HOLIDAY`. No default value and no data migration: the existing products will be deleted.

| Repo | Change |
|---|---|
| `navano` | `ProductOccasion` enum (`product.enum.ts`, registered for GraphQL); `Product.model.ts` `productOccasion` (required); `Product` DTO field; `ProductInput` required; `ProductUpdate` optional; `PISearch.occasionList` and `shapeMatchQuery` `productOccasion: { $in }`; `product.service.spec.ts` covers `occasionList` |
| `navano-client` | `ProductOccasion` enum; `Product`, `ProductInput`, `ProductUpdate`, `PISearch.occasionList` types; `productOccasion` in all product selection sets; `AddNewProduct` "Select Occasion" field (required); `product/Filter.tsx` Occasion checkboxes (same pattern as Product Type) |

### Validation

| Check | Result |
|---|---|
| `npx tsc --noEmit` api / batch | 0 / 0 errors |
| `npx jest apps/navano-api/src/components/product` | 3 passed |
| `npx eslint "apps/**/*.ts"` | 397 (baseline) |
| `npx nest build` | not run: the API was running in watch mode on the same `dist`; the live schema shows `ProductOccasion` and `occasionList` |
| `navano-client` `yarn tsc --noEmit` | 0 errors; 36 / 36 operations valid against the live schema |
| `getProducts` with `occasionList` | works |
| `getProducts` without filter | fails with `Cannot return null for non-nullable field Product.productOccasion` until the old products (no `productOccasion`) are deleted |
