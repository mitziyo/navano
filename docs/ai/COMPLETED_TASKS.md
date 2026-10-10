# Completed Tasks (session 2026-10-09)

## 1. Codebase analysis
- Mapped the monorepo: `apps/*-api` (GraphQL modules, socket gateway) and `apps/*-batch` (3 cron jobs).
- Found every Property/Agent coupling outside the property module: `like.service.ts`, `view.service.ts`, `comment.service.ts`/`comment.module.ts`, `member.*`, `libs/config.ts`, group enums, `Notification.model.ts`, batch.
- Found pre-existing bugs (not fixed yet, see `NEXT_STEPS.md`).

## 2. Phase 2 domain design (agreed, not implemented)
- Property → Product with `productType` FLOWER / CHOCOLATE / CAKE, `productStatus` HOLD/ACTIVE/SOLD/DELETE, `productItemCount`, `memberAddress` (per `navanoo.pdf`, see DECISIONS D11).
- AGENT → STORE.
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
