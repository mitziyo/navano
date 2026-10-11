# Backend Migration: Nestar → Navano

> Status as of 2026-10-09: **Phase 1 (safe rename layer) is done (`7856ad9`). Phase 2 (Property → Product) is implemented on branch `modification`. `MemberType` stays `USER` / `AGENT` / `ADMIN` (DECISIONS D8).**

## 1. Original project: Nestar

Nestar is a real estate listing platform built as a NestJS 10 monorepo.

| Area | Details |
|---|---|
| Apps | `nestar-api` (GraphQL API, HTTP + WebSocket) and `nestar-batch` (cron jobs) |
| API | Apollo GraphQL (`autoSchemaFile: true`, code-first), `graphql-upload` for images, static `/uploads` |
| Realtime | `@nestjs/platform-ws` gateway (`socket/socket.gateway.ts`) for a global chat, with JWT read from `?token=` |
| Database | MongoDB through `@nestjs/mongoose`. URI comes from `MONGO_DEV` / `MONGO_PROD` |
| Auth | JWT (`SECRET_TOKEN`), bcryptjs. Guards: `AuthGuard`, `RolesGuard`, `WithoutGuard`. Decorators: `@AuthMember`, `@Roles` |
| Domain modules | `member`, `auth`, `property`, `board-article`, `comment`, `like`, `view`, `follow` |
| Roles | `MemberType`: `USER`, `AGENT` (lists properties), `ADMIN` |
| Batch | `batchRollback`, `batchTopProperties`, `batchTopAgents`: daily rank recalculation at 01:00 |

## 2. New project: Navano

Navano is a multi-store marketplace for **flowers, chocolates and cakes**. It keeps the same technical stack and feature set: listings, likes, views, comments, follows, community board, chat and ranking batch.

| Concept | Nestar | Navano |
|---|---|---|
| Listing entity | Property (apartment / villa / house) | Product (flower / chocolate / cake) |
| Seller role | `AGENT` | `AGENT` (kept, see DECISIONS D8) |
| Location | Property location (city) | Delivery area (same city enum, kept for now) |
| Orders | n/a | Deferred to Phase 3 (Order/Cart) |

## 3. Backend migration goal

1. **Phase 1, safe rename layer (DONE):** rename project and app identifiers. No change to business logic, APIs or DB.
2. **Phase 2, domain migration (DONE):** Property → Product across schema, DTOs, resolvers, services, enums, config and batch. `AGENT` is kept.
3. **Phase 3, commerce (FUTURE):** Order/Cart modules, stock handling and delivery scheduling.

## 4. Naming changes

### 4.1 Done in Phase 1

| Old | New | Location |
|---|---|---|
| `apps/nestar-api` | `apps/navano-api` | folder (`git mv`) |
| `apps/nestar-batch` | `apps/navano-batch` | folder (`git mv`) |
| project keys `nestar-api`, `nestar-batch` | `navano-api`, `navano-batch` | `nest-cli.json` |
| `"name": "nestar"` | `"name": "navano"` | `package.json`, `package-lock.json` |
| `dist/apps/nestar-*` | `dist/apps/navano-*` | `tsconfig.app.json` (`outDir`), `package.json` scripts |
| `../../nestar-api/src/...` | `../../navano-api/src/...` | `apps/navano-batch/src/batch.module.ts`, `batch.service.ts` |
| `Welcome to Nestar API  Server!` | `Welcome to Navano API Server!` | `apps/navano-api/src/app.service.ts` |
| `Welcome to BATCH Server!` | `Welcome to Navano BATCH Server!` | `apps/navano-batch/src/batch.service.ts` |
| `BATCH SERVER READY!` | `NAVANO BATCH SERVER READY!` | `apps/navano-batch/src/batch.controller.ts` |
| `NestarBatchController (e2e)` | `NavanoBatchController (e2e)` | `apps/navano-batch/test/app.e2e-spec.ts` |

### 4.2 Done in Phase 2

| Old | New |
|---|---|
| `Property`, `Properties`, `PropertyInput`, `PropertyUpdate` | `Product`, `Products`, `ProductInput`, `ProductUpdate` |
| `PropertiesInquiry`, `AgentPropertiesInquiry`, `AllPropertiesInquiry` | `ProductsInquiry`, `AgentProductsInquiry`, `AllProductsInquiry` |
| `PropertyType` (`APARTMENT`, `VILLA`, `HOUSE`) | `ProductType` (`FLOWER`, `CHOCOLATE`, `CAKE`) |
| `PropertyStatus` (`ACTIVE`, `SOLD`, `DELETE`) | `ProductStatus` (`HOLD`, `ACTIVE`, `SOLD`, `DELETE`) |
| `PropertyLocation` | `ProductLocation` (same Korean city values) |
| `MemberType.AGENT` | unchanged |
| `AgentsInquiry`, `availableAgentSorts` | unchanged |
| `availablePropertySorts` | `availableProductSorts` |
| `availableOptions = ['propertyBarter','propertyRent']` | removed (the data model has no boolean options) |
| `PropertyService.propertyStatsEditor` | `ProductService.productStatsEditor` |
| `BATCH_TOP_PROPERTIES`, `BATCH_TOP_AGENTS` | `BATCH_TOP_PRODUCTS`, `BATCH_TOP_AGENTS` (unchanged) |

## 5. Module changes (Phase 2)

| Module / file | Change |
|---|---|
| `components/property/*` | Move to `components/product/*` (`ProductModule`, `ProductResolver`, `ProductService`). Mongoose model name becomes `'Product'` |
| `components/components.module.ts` | Import `ProductModule` instead of `PropertyModule` |
| `components/member/*` | Unchanged except the `memberProducts` counter (`getAgents`, `@Roles(USER, AGENT)` stay) |
| `components/comment/*` | Inject `ProductService`. `CommentGroup.PRODUCT` updates `productComments` |
| `components/like/like.service.ts` | `$lookup from: 'products'`, `favoriteProduct` |
| `components/view/view.service.ts` | `$lookup from: 'products'`, `visitedProduct` |
| `libs/config.ts` | Sort/option arrays, `lookupFavorite` → `favoriteProduct.memberId`, `lookupVisit` → `visitedProduct.memberId` |
| `libs/dto/property/*` | Move to `libs/dto/product/*` |
| `libs/enums/property.enum.ts` | Move to `product.enum.ts` |
| `libs/enums/{like,view,comment,notification}.enum.ts` | `PROPERTY` → `PRODUCT` |
| `navano-batch` | `Product` model, `batchTopProducts`, `batchTopAgents` (uses `memberProducts`) |
| Unchanged | `auth`, `follow`, `board-article`, `socket`, `database`, `Logging.interceptor` |

## 6. GraphQL changes (Phase 2)

Phase 1 kept every GraphQL operation, type and enum unchanged.

| Kind | Old | New | Guard |
|---|---|---|---|
| Mutation | `createProperty` | `createProduct` | `@Roles(AGENT)` |
| Query | `getProperty` | `getProduct` | `WithoutGuard` |
| Mutation | `updateProperty` | `updateProduct` | `@Roles(AGENT)` |
| Query | `getProperties` | `getProducts` | `WithoutGuard` |
| Query | `getFavorites` | `getFavorites` (returns `Products`) | `AuthGuard` |
| Query | `getVisited` | `getVisited` (returns `Products`) | `AuthGuard` |
| Query | `getAgentProperties` | `getAgentProducts` | `@Roles(AGENT)` |
| Mutation | `likeTargetProperty` | `likeTargetProduct` | `AuthGuard` |
| Query | `getAllPropertiesByAdmin` | `getAllProductsByAdmin` | `@Roles(ADMIN)` |
| Mutation | `updatePropertyByAdmin` | `updateProductByAdmin` | `@Roles(ADMIN)` |
| Mutation | `removePropertyByAdmin` | `removeProductByAdmin` | `@Roles(ADMIN)` |
| Query | `getAgents` | `getAgents` (unchanged) | `WithoutGuard` |
| Enum | `PropertyType`, `PropertyStatus`, `PropertyLocation` | `ProductType`, `ProductStatus`, `ProductLocation` | — |
| Enum value | `LikeGroup` / `ViewGroup` / `CommentGroup` / `NotificationGroup.PROPERTY` | `PRODUCT` (`MemberType.AGENT` unchanged) | — |
| Input search | `typeList`, `roomsList`, `bedsList`, `squaresRange`, `options` | `typeList` kept; `roomsList`, `bedsList`, `squaresRange`, `options` removed | — |
| Input | `PropertyInput` | `ProductInput` gets `productItemCount: Int`; no square/beds/rooms/barter/rent/constructedAt | — |
| Member type | `Member` | adds `memberAddress: String` (nullable); `memberProperties` → `memberProducts` | — |

## 7. MongoDB collection and schema changes (Phase 2)

| Collection | Change |
|---|---|
| `properties` | Replaced by `products` |
| `member` | `memberProperties` → `memberProducts`, new optional `memberAddress` (string). `memberType` values unchanged |
| `likes`, `views`, `comments` | `likeGroup` / `viewGroup` / `commentGroup` value `PROPERTY` → `PRODUCT` |
| `notifications` | `propertyId` (ref `Property`) → `productId` (ref `Product`), group `PRODUCT` |
| `boardArticles`, `follows`, `notices` | Unchanged |

### `Property` → `Product` field mapping

Source of truth: the Datensen data model export `D:\MiT\MOD2\navanoo.pdf`. The diagram shows field names and types but not enum values. The enum values below were confirmed by the user on 2026-10-09.

| Property field | Product field | Type | Note |
|---|---|---|---|
| `propertyType` | `productType` | enum, NN | `FLOWER` / `CHOCOLATE` / `CAKE` |
| `propertyStatus` | `productStatus` | enum, NN | `HOLD` / `ACTIVE` / `SOLD` / `DELETE` (adds `HOLD`, default `ACTIVE`) |
| `propertyLocation` | `productLocation` | enum, NN | same Korean city values |
| `propertyAddress` | `productAddress` | string, NN | |
| (new) | `productOccasion` | enum, NN | `BIRTHDAY` / `WEDDING` / `ANNIVERSARY` / `HOLIDAY` (added 2026-10-11, `navano.pdf`); search filter `occasionList` |
| `propertyTitle` | `productTitle` | string, NN | |
| `propertyPrice` | `productPrice` | double, NN | |
| (new) | `productItemCount` | int, NN | number of items available |
| `propertyViews/Likes/Comments/Rank` | `productViews/Likes/Comments/Rank` | int, NN | |
| `propertyImages` | `productImages` | array, NN | |
| `propertyDesc` | `productDesc` | string | |
| `memberId`, `soldAt`, `deletedAt` | same | objectId NN, date, date | |
| `propertySquare`, `propertyBeds`, `propertyRooms` | removed | | |
| `propertyBarter`, `propertyRent` | removed | | |
| `constructedAt` | removed | | still in the diagram, removal confirmed by the user |
| unique index `{type, location, title, price}` | `{productType, productLocation, productTitle, productPrice}` | | |

## 8. Compatibility notes

- **Database name:** `.env` still points to `/Nestar`. This was kept on purpose. Changing it connects to an empty DB. Switch DB name only together with a data migration or a fresh seed.
- **Phase 1 is fully backward compatible:** API, schema, collections and env keys are unchanged. Only folder/script names changed. Anyone running `nest start nestar-batch` or `dist/apps/nestar-api/main` must switch to the `navano-*` names.
- **Phase 2 is breaking:**
  - The GraphQL schema changes, so `navano-client` must migrate in the same release (see `FRONTEND_MIGRATION.md`).
  - Existing `properties` documents and `AGENT` members do not match the new schema. Use a fresh dev DB (recommended) or a one-off migration script.
- **Uploads:** image paths are stored as `uploads/property/<uuid>.<ext>`. New uploads should go to `uploads/product/`. Old files stay readable through the static `/uploads` route.
- **Known pre-existing bugs** (fixed in Phase 2):
  - `batch.service.ts` `batchRollback` filters with `MemberType:` instead of `memberType:`.
  - `batchTopProperties` calls `findOneAndUpdate(_id, …)` instead of `findByIdAndUpdate`.
  - `property.input.ts` types `propertyAddress` / `propertyTitle` as `PropertyType` instead of `string`.
  - `board-article.resolver.ts:40` logs `getProperty`.
  - `updateProperty` / `updatePropertyByAdmin` computed `soldAt` / `deletedAt` but never wrote them to the update, so they were never stored.
  - `memberAddress` existed in the member DTOs but not in `Member.model.ts`, so Mongoose dropped it.
- **Lint baseline:** `npx eslint "apps/**/*.ts"` reports 397 problems (371 errors, 26 warnings) before and after Phase 1. They come from the existing code, not the rename.
